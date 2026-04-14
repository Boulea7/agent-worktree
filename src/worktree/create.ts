import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { runtimeKinds } from "../core/capabilities.js";
import type { RuntimeKind } from "../core/capabilities.js";
import { RuntimeError, ValidationError } from "../core/errors.js";
import {
  canonicalizePathForBoundary,
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
import { deriveCreateAttemptFailureResidueFollowUp } from "./create-residue.js";
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
  const canonicalRepoRoot = await canonicalizePathForBoundary(repoRoot);
  const canonicalManifestRoot = await canonicalizePathForBoundary(manifestRoot);
  const canonicalWorktreeRoot = await canonicalizePathForBoundary(worktreeRoot);
  const canonicalWorktreePath = await canonicalizePathForBoundary(worktreePath);

  ensureCreatableWorktreePath(
    canonicalRepoRoot,
    canonicalManifestRoot,
    canonicalWorktreeRoot,
    canonicalWorktreePath,
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
      const rollbackResidueFollowUpResult =
        await deriveCreateAttemptFailureResidueFollowUpBestEffort({
          attemptId,
          branch,
          repoRoot: canonicalRepoRoot,
          worktreePath: canonicalWorktreePath
        });

      throw new RuntimeError(
        `Failed to persist manifest for attempt ${attemptId}, and safe worktree rollback also failed.`,
        {
          manifestWriteError: error,
          rollbackError,
          ...(rollbackResidueFollowUpResult.residueFollowUp === undefined
            ? {}
            : {
                rollbackResidueFollowUp:
                  rollbackResidueFollowUpResult.residueFollowUp
              }),
          ...(rollbackResidueFollowUpResult.residueFollowUpError === undefined
            ? {}
            : {
                rollbackResidueFollowUpError:
                  rollbackResidueFollowUpResult.residueFollowUpError
              })
        }
      );
    }

    const residueFollowUpResult =
      await deriveCreateAttemptFailureResidueFollowUpBestEffort({
        attemptId,
        branch,
        repoRoot: canonicalRepoRoot,
        worktreePath: canonicalWorktreePath
      });

    throw new RuntimeError(
      `Failed to persist manifest for attempt ${attemptId}. The worktree was removed, but the attempt branch was intentionally retained.`,
      {
        manifestWriteError: error,
        ...(residueFollowUpResult.residueFollowUp === undefined
          ? {}
          : {
              residue: residueFollowUpResult.residueFollowUp.residue,
              residueFollowUp: residueFollowUpResult.residueFollowUp
            }),
        ...(residueFollowUpResult.residueFollowUpError === undefined
          ? {}
          : {
              residueFollowUpError: residueFollowUpResult.residueFollowUpError
            })
      }
    );
  }

  return manifest;
}

function createAttemptId(): string {
  return `att_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

async function deriveCreateAttemptFailureResidueFollowUpBestEffort(input: {
  attemptId: string;
  branch: string;
  repoRoot: string;
  worktreePath: string;
}): Promise<{
  residueFollowUp?: Awaited<
    ReturnType<typeof deriveCreateAttemptFailureResidueFollowUp>
  >;
  residueFollowUpError?: unknown;
}> {
  try {
    return {
      residueFollowUp: await deriveCreateAttemptFailureResidueFollowUp(input)
    };
  } catch (error) {
    return {
      residueFollowUpError: error
    };
  }
}

async function resolveRepositoryRoot(inputPath: string): Promise<string> {
  return runGit(["rev-parse", "--show-toplevel"], {
    cwd: path.resolve(inputPath)
  });
}

function validateRuntime(runtime: string): asserts runtime is RuntimeKind {
  if (!runtimeKinds.includes(runtime as (typeof runtimeKinds)[number])) {
    throw new ValidationError(`Unknown runtime: ${runtime}.`);
  }
}

function resolveSupportTier(runtime: RuntimeKind): "tier1" | "experimental" {
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

  if (worktreePath === repoRoot || isPathInsideRoot(worktreePath, repoRoot)) {
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
