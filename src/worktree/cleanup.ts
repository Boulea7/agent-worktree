import { access } from "node:fs/promises";
import path from "node:path";

import { GitError, ValidationError } from "../core/errors.js";
import {
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

  const normalizedWorktreePath = await normalizePath(manifest.worktreePath);
  const normalizedRepoRoot = await normalizePath(manifest.repoRoot);
  const normalizedWorktreeRoot = await normalizePath(worktreeRoot);
  const normalizedManifestRoot = await normalizePath(manifestRoot);
  const normalizedManifestDirectory = await normalizePath(
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

  const registeredWorktrees = await listRegisteredWorktrees(manifest.repoRoot);
  const registeredWorktree = findRegisteredWorktree(
    registeredWorktrees,
    normalizedWorktreePath
  );
  const worktreeExists = await pathExists(manifest.worktreePath);

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

  await ensureWorktreeIsClean(manifest.worktreePath, options.attemptId);
  await cleanupWorktreeMaterial({
    repoRoot: manifest.repoRoot,
    worktreePath: manifest.worktreePath
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
      throw new ValidationError(
        `Cleanup refused because git would require a forceful worktree removal for ${options.worktreePath}.`,
        error
      );
    }

    throw error;
  }
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

function parseRegisteredWorktrees(output: string): RegisteredWorktree[] {
  if (output.length === 0) {
    return [];
  }

  return output
    .trim()
    .split(/\n\s*\n/)
    .flatMap((block) => {
      const lines = block.split("\n");
      const pathLine = lines.find((line) => line.startsWith("worktree "));

      if (!pathLine) {
        return [];
      }

      const branchLine = lines.find((line) => line.startsWith("branch "));
      const branch = normalizeBranchRef(branchLine?.slice("branch ".length).trim());

      return [
        {
          path: normalizePathForComparison(pathLine.slice("worktree ".length).trim()),
          branch
        }
      ];
    });
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

async function normalizePath(targetPath: string): Promise<string> {
  return normalizePathForComparison(targetPath);
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
