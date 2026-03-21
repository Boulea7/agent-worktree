import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { runtimeKinds } from "../core/capabilities.js";
import { RuntimeError, ValidationError } from "../core/errors.js";
import {
  defaultManifestRoot,
  defaultWorktreeRoot,
  isPathInsideRoot,
  normalizePathForComparison
} from "../core/paths.js";
import { writeManifest } from "../manifest/store.js";
import {
  DEFAULT_MANIFEST_SCHEMA_VERSION,
  type AttemptManifest
} from "../manifest/types.js";
import { cleanupWorktreeMaterial } from "./cleanup.js";
import { buildAttemptBranch, buildWorktreeDirectoryName } from "./naming.js";
import { runGit } from "./git.js";

export interface CreateAttemptOptions {
  adapter?: string;
  baseRef?: string;
  manifestRoot?: string;
  repoRoot: string;
  runtime?: string;
  taskId: string;
  worktreeRoot?: string;
}

export interface CreateAttemptDependencies {
  generateAttemptId?: () => string;
  now?: () => Date;
  writeManifestImpl?: typeof writeManifest;
}

export async function createAttempt(
  options: CreateAttemptOptions,
  dependencies: CreateAttemptDependencies = {}
): Promise<AttemptManifest> {
  const repoRoot = await resolveRepositoryRoot(options.repoRoot);
  const attemptId = (dependencies.generateAttemptId ?? createAttemptId)();
  const runtime = options.runtime ?? "codex-cli";
  validateRuntime(runtime);
  const adapter = options.adapter ?? "subprocess";
  const baseRef = options.baseRef ?? "HEAD";
  const branch = buildAttemptBranch({
    attemptId,
    taskId: options.taskId
  });
  const worktreeRoot = normalizePathForComparison(
    options.worktreeRoot ?? defaultWorktreeRoot
  );
  const manifestRoot = normalizePathForComparison(
    options.manifestRoot ?? defaultManifestRoot
  );
  const worktreePath = normalizePathForComparison(path.join(
    worktreeRoot,
    buildWorktreeDirectoryName({
      attemptId,
      taskId: options.taskId
    })
  ));
  const timestamp = (dependencies.now ?? (() => new Date()))().toISOString();
  const writeManifestImpl = dependencies.writeManifestImpl ?? writeManifest;

  ensureCreatableWorktreePath(
    repoRoot,
    manifestRoot,
    worktreeRoot,
    worktreePath,
    attemptId
  );

  await mkdir(worktreeRoot, { recursive: true });
  await mkdir(manifestRoot, { recursive: true });
  await runGit(["worktree", "add", "-b", branch, worktreePath, baseRef], {
    cwd: repoRoot
  });

  const manifest: AttemptManifest = {
    schemaVersion: DEFAULT_MANIFEST_SCHEMA_VERSION,
    attemptId,
    taskId: options.taskId,
    runtime,
    adapter,
    sourceKind: "direct",
    repoRoot,
    supportTier: resolveSupportTier(runtime),
    baseRef,
    branch,
    worktreePath,
    status: "created",
    verification: {
      state: "pending",
      checks: []
    },
    timestamps: {
      createdAt: timestamp,
      updatedAt: timestamp
    }
  };

  try {
    await writeManifestImpl(manifest, { rootDir: manifestRoot });
  } catch (error) {
    try {
      await cleanupWorktreeMaterial({
        repoRoot,
        worktreePath
      });
    } catch (rollbackError) {
      throw new RuntimeError(
        `Failed to persist manifest for attempt ${attemptId}, and safe worktree rollback also failed.`,
        {
          manifestWriteError: error,
          rollbackError
        }
      );
    }

    throw new RuntimeError(
      `Failed to persist manifest for attempt ${attemptId}. The worktree was removed, but the attempt branch was intentionally retained.`,
      error
    );
  }

  return manifest;
}

function createAttemptId(): string {
  return `att_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

async function resolveRepositoryRoot(inputPath: string): Promise<string> {
  return runGit(["rev-parse", "--show-toplevel"], {
    cwd: path.resolve(inputPath)
  });
}

function validateRuntime(runtime: string): void {
  if (!runtimeKinds.includes(runtime as (typeof runtimeKinds)[number])) {
    throw new ValidationError(`Unknown runtime: ${runtime}.`);
  }
}

function resolveSupportTier(runtime: string): "tier1" | "experimental" {
  if (runtime === "openclaw" || runtime === "other-cli") {
    return "experimental";
  }

  return "tier1";
}

function ensureCreatableWorktreePath(
  repoRoot: string,
  manifestRoot: string,
  worktreeRoot: string,
  worktreePath: string,
  attemptId: string
): void {
  const normalizedRepoRoot = normalizePathForComparison(repoRoot);

  if (!isPathInsideRoot(worktreePath, worktreeRoot)) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be created because its worktree path is outside the controlled worktree root.`
    );
  }

  if (worktreePath === worktreeRoot) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be created because its worktree path points at the worktree root itself.`
    );
  }

  if (worktreePath === normalizedRepoRoot || isPathInsideRoot(worktreePath, normalizedRepoRoot)) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be created because its worktree path overlaps the primary repository.`
    );
  }

  if (worktreePath === manifestRoot || isPathInsideRoot(worktreePath, manifestRoot)) {
    throw new ValidationError(
      `Attempt ${attemptId} cannot be created because its worktree path overlaps the manifest store.`
    );
  }
}
