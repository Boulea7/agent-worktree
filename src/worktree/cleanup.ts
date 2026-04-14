import { access } from "node:fs/promises";
import path from "node:path";

import { GitError, ValidationError } from "../core/errors.js";
import {
  canonicalizePathForBoundary,
  defaultManifestRoot,
  defaultWorktreeRoot,
  isPathInsideRoot,
  normalizePathForComparison
} from "../core/paths.js";
import {
  getManifestDirectory,
  readManifest,
  writeManifest
} from "../manifest/store.js";
import type { AttemptManifest } from "../manifest/types.js";
import { runGit } from "./git.js";

const cleanupEligibleStatuses = new Set(["created", "failed", "merged"]);

export type CleanupOutcome =
  | "removed"
  | "already_cleaned"
  | "missing_worktree_converged";

export interface CleanupAttemptOptions {
  attemptId: string;
  manifestRoot?: string;
  worktreeRoot?: string;
}

export interface CleanupAttemptDependencies {
  now?: () => Date;
}

interface RegisteredWorktree {
  branch: string | undefined;
  path: string;
}

export interface CleanupAttemptResult {
  attempt: AttemptManifest;
  cleanup: {
    outcome: CleanupOutcome;
    worktreeRemoved: boolean;
  };
}

export async function cleanupAttempt(
  options: CleanupAttemptOptions,
  dependencies: CleanupAttemptDependencies = {}
): Promise<CleanupAttemptResult> {
  const manifestRoot = path.resolve(options.manifestRoot ?? defaultManifestRoot);
  const worktreeRoot = path.resolve(options.worktreeRoot ?? defaultWorktreeRoot);
  const manifest = await readManifest(options.attemptId, { rootDir: manifestRoot });
  const now = (dependencies.now ?? (() => new Date()))().toISOString();

  validateCleanupManifest(manifest, options.attemptId);

  const normalizedWorktreePath = await canonicalizePathForBoundary(
    manifest.worktreePath
  );
  const normalizedRepoRoot = await canonicalizePathForBoundary(manifest.repoRoot);
  const normalizedWorktreeRoot = await canonicalizePathForBoundary(worktreeRoot);
  const normalizedManifestRoot = await canonicalizePathForBoundary(manifestRoot);
  const normalizedManifestDirectory = await canonicalizePathForBoundary(
    getManifestDirectory(options.attemptId, { rootDir: manifestRoot })
  );

  ensureControlledWorktreePath(
    normalizedWorktreePath,
    normalizedWorktreeRoot,
    normalizedRepoRoot,
    normalizedManifestRoot,
    normalizedManifestDirectory,
    options.attemptId
  );

  const registeredWorktrees = await listRegisteredWorktrees(normalizedRepoRoot);
  const registeredWorktree = findRegisteredWorktree(
    registeredWorktrees,
    normalizedWorktreePath
  );
  const worktreeExists = await pathExists(normalizedWorktreePath);

  if (manifest.status === "cleaned") {
    return handleAlreadyCleaned(manifest, worktreeExists, registeredWorktree);
  }

  ensureCleanupAllowed(manifest);

  if (!worktreeExists) {
    if (registeredWorktree) {
      throw new ValidationError(
        `Attempt ${options.attemptId} cannot be cleaned because its worktree path is missing but still registered in git.`
      );
    }

    const cleanedAttempt = createCleanedManifest(manifest, now);
    await writeManifest(cleanedAttempt, { rootDir: manifestRoot });
    return buildCleanupResult(
      cleanedAttempt,
      "missing_worktree_converged",
      false
    );
  }

  if (!registeredWorktree) {
    throw new ValidationError(
      `Attempt ${options.attemptId} cannot be cleaned because its worktree is not registered in git.`
    );
  }

  if (registeredWorktree.branch !== manifest.branch) {
    throw new ValidationError(
      `Attempt ${options.attemptId} cannot be cleaned because its registered branch does not match the manifest.`
    );
  }

  await ensureWorktreeIsClean(normalizedWorktreePath, options.attemptId);
  await cleanupWorktreeMaterial({
    repoRoot: normalizedRepoRoot,
    worktreePath: normalizedWorktreePath
  });

  const cleanedAttempt = createCleanedManifest(manifest, now);
  await writeManifest(cleanedAttempt, { rootDir: manifestRoot });
  return buildCleanupResult(cleanedAttempt, "removed", true);
}

export async function cleanupWorktreeMaterial(options: {
  repoRoot: string;
  worktreePath: string;
}): Promise<void> {
  try {
    await runGit(["worktree", "remove", options.worktreePath], {
      cwd: options.repoRoot
    });
  } catch (error) {
    if (error instanceof GitError) {
      throw classifyCleanupGitError(error, options.worktreePath);
    }

    throw error;
  }
}

function classifyCleanupGitError(
  error: GitError,
  worktreePath: string
): ValidationError {
  const stderr = extractGitStderr(error);

  if (requiresForcefulWorktreeRemoval(stderr)) {
    return new ValidationError(
      `Cleanup refused because git would require a forceful worktree removal for ${worktreePath}.`,
      error
    );
  }

  if (indicatesUnregisteredWorktree(stderr)) {
    return new ValidationError(
      `Cleanup refused because git could not confirm ${worktreePath} is still a registered worktree.`,
      error
    );
  }

  return new ValidationError(
    `Cleanup failed because git could not remove the managed worktree for ${worktreePath}.`,
    error
  );
}

function validateCleanupManifest(
  manifest: AttemptManifest,
  attemptId: string
): asserts manifest is AttemptManifest & {
  branch: string;
  repoRoot: string;
  worktreePath: string;
} {
  if (!manifest.repoRoot) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be cleaned because repoRoot is missing from the manifest.`
    );
  }

  if (!manifest.branch) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be cleaned because branch is missing from the manifest.`
    );
  }

  if (!manifest.worktreePath) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be cleaned because worktreePath is missing from the manifest.`
    );
  }

  if (!path.isAbsolute(manifest.repoRoot) || !path.isAbsolute(manifest.worktreePath)) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be cleaned because repoRoot and worktreePath must be absolute paths.`
    );
  }
}

function ensureCleanupAllowed(manifest: AttemptManifest): void {
  if (manifest.session) {
    throw new ValidationError(
      `Attempt ${manifest.attemptId} cannot be cleaned while a session is recorded in the manifest.`
    );
  }

  if (!cleanupEligibleStatuses.has(manifest.status)) {
    throw new ValidationError(
      `Attempt ${manifest.attemptId} cannot be cleaned from status ${manifest.status}.`
    );
  }
}

async function ensureWorktreeIsClean(
  worktreePath: string,
  attemptId: string
): Promise<void> {
  const statusOutput = await runGit(
    ["status", "--porcelain", "--untracked-files=all"],
    {
      cwd: worktreePath
    }
  );

  if (statusOutput.length > 0) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be cleaned because its worktree has uncommitted changes.`
    );
  }
}

async function listRegisteredWorktrees(repoRoot: string): Promise<RegisteredWorktree[]> {
  const output = await runGit(["worktree", "list", "--porcelain"], {
    cwd: repoRoot
  });

  return parseRegisteredWorktrees(output);
}

async function parseRegisteredWorktrees(output: string): Promise<RegisteredWorktree[]> {
  if (output.length === 0) {
    return [];
  }

  const blocks = output.trim().split(/\n\s*\n/);
  const registeredWorktrees = await Promise.all(
    blocks.map(async (block) => {
      const lines = block.split("\n");
      const pathLine = lines.find((line) => line.startsWith("worktree "));

      if (!pathLine) {
        return undefined;
      }

      const branchLine = lines.find((line) => line.startsWith("branch "));
      const branch = normalizeBranchRef(branchLine?.slice("branch ".length).trim());

      return {
        path: await canonicalizePathForBoundary(
          pathLine.slice("worktree ".length).trim()
        ),
        branch
      };
    })
  );

  return registeredWorktrees.filter(
    (worktree): worktree is RegisteredWorktree => worktree !== undefined
  );
}

function normalizeBranchRef(branch: string | undefined): string | undefined {
  if (!branch) {
    return undefined;
  }

  return branch.replace(/^refs\/heads\//, "");
}

function findRegisteredWorktree(
  worktrees: RegisteredWorktree[],
  normalizedWorktreePath: string
): RegisteredWorktree | undefined {
  return worktrees.find(
    (worktree) => normalizePathForComparison(worktree.path) === normalizedWorktreePath
  );
}

function ensureControlledWorktreePath(
  normalizedWorktreePath: string,
  normalizedWorktreeRoot: string,
  normalizedRepoRoot: string,
  normalizedManifestRoot: string,
  normalizedManifestDirectory: string,
  attemptId: string
): void {
  if (!isPathInsideRoot(normalizedWorktreePath, normalizedWorktreeRoot)) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be cleaned because its worktree path is outside the controlled worktree root.`
    );
  }

  if (normalizedWorktreePath === normalizedWorktreeRoot) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be cleaned because its worktree path points at the worktree root itself.`
    );
  }

  if (
    normalizedWorktreePath === normalizedRepoRoot ||
    isPathInsideRoot(normalizedWorktreePath, normalizedRepoRoot)
  ) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be cleaned because its worktree path overlaps the primary repository.`
    );
  }

  if (
    normalizedWorktreePath === normalizedManifestRoot ||
    isPathInsideRoot(normalizedWorktreePath, normalizedManifestRoot) ||
    normalizedWorktreePath === normalizedManifestDirectory ||
    isPathInsideRoot(normalizedWorktreePath, normalizedManifestDirectory)
  ) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be cleaned because its worktree path overlaps the manifest store.`
    );
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

function extractGitStderr(error: GitError): string {
  const causeValue = error.causeValue;

  if (
    causeValue &&
    typeof causeValue === "object" &&
    "stderr" in causeValue &&
    typeof causeValue.stderr === "string"
  ) {
    return causeValue.stderr.trim().toLowerCase();
  }

  return "";
}

function requiresForcefulWorktreeRemoval(stderr: string): boolean {
  return (
    stderr.includes("use --force to delete it") ||
    stderr.includes("use -f to delete it")
  );
}

function indicatesUnregisteredWorktree(stderr: string): boolean {
  return (
    stderr.includes("is not a working tree") ||
    stderr.includes("is not a git worktree")
  );
}

function createCleanedManifest(
  manifest: AttemptManifest,
  updatedAt: string
): AttemptManifest {
  return {
    ...manifest,
    status: "cleaned",
    timestamps: {
      ...(manifest.timestamps ?? {}),
      createdAt: manifest.timestamps?.createdAt ?? updatedAt,
      updatedAt
    }
  };
}

function handleAlreadyCleaned(
  manifest: AttemptManifest,
  worktreeExists: boolean,
  registeredWorktree: RegisteredWorktree | undefined
): CleanupAttemptResult {
  if (worktreeExists || registeredWorktree) {
    throw new ValidationError(
      `Attempt ${manifest.attemptId} is marked cleaned, but git still reports worktree material for it.`
    );
  }

  return buildCleanupResult(manifest, "already_cleaned", false);
}

function buildCleanupResult(
  manifest: AttemptManifest,
  outcome: CleanupOutcome,
  worktreeRemoved: boolean
): CleanupAttemptResult {
  return {
    attempt: manifest,
    cleanup: {
      outcome,
      worktreeRemoved
    }
  };
}
