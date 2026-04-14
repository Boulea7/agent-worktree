import { mkdtemp, mkdir, realpath, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { RuntimeError, ValidationError } from "../../src/core/errors.js";
import { readManifest } from "../../src/manifest/store.js";
import { createAttempt } from "../../src/worktree/create.js";
import { runGit } from "../../src/worktree/git.js";
import { listAttempts } from "../../src/worktree/list.js";
import { createTestRepository } from "./helpers.js";

describe("createAttempt", () => {
  const tempDirectories: string[] = [];
  const integrationTestTimeoutMs = 15_000;

  afterEach(async () => {
    await Promise.all(
      tempDirectories.map((directoryPath) =>
        rm(directoryPath, { recursive: true, force: true })
      )
    );
    tempDirectories.length = 0;
    vi.resetModules();
    vi.doUnmock("../../src/worktree/create-residue.js");
  });

  async function createTempDirectory(prefix: string): Promise<string> {
    const directoryPath = await mkdtemp(path.join(os.tmpdir(), prefix));
    tempDirectories.push(directoryPath);
    return directoryPath;
  }

  it(
    "should create a worktree, emit direct source metadata, and persist its manifest",
    async () => {
      const { repoRoot } = await createTestRepository();
      tempDirectories.push(repoRoot);
      const manifestRoot = await createTempDirectory("agent-worktree-manifest-");
      const worktreeRoot = await createTempDirectory("agent-worktree-worktree-");

      const manifest = await createAttempt(
        {
          repoRoot,
          taskId: "Implement Auth Flow",
          baseRef: "main",
          manifestRoot,
          worktreeRoot
        },
        {
          generateAttemptId: () => "att_alpha",
          now: () => new Date("2026-03-20T01:02:03.000Z")
        }
      );

      expect(manifest.branch).toBe("attempt/implement-auth-flow/att_alpha");
      expect(manifest.worktreePath).toBe(
        path.join(worktreeRoot, "implement-auth-flow-att_alpha")
      );
      expect(manifest.repoRoot).toBe(await realpath(repoRoot));
      expect(manifest.status).toBe("created");
      expect(manifest.sourceKind).toBe("direct");
      expect(manifest.parentAttemptId).toBeUndefined();

      await expect(
        readManifest("att_alpha", { rootDir: manifestRoot })
      ).resolves.toEqual(manifest);

      const worktreeListOutput = await runGit(["worktree", "list", "--porcelain"], {
        cwd: repoRoot
      });

      expect(worktreeListOutput).toContain(manifest.worktreePath);
    },
    integrationTestTimeoutMs
  );

  it(
    "should create unique attempts for the same task",
    async () => {
      const { repoRoot } = await createTestRepository();
      tempDirectories.push(repoRoot);
      const manifestRoot = await createTempDirectory("agent-worktree-manifest-");
      const worktreeRoot = await createTempDirectory("agent-worktree-worktree-");

      const first = await createAttempt(
        {
          repoRoot,
          taskId: "Fix flaky tests",
          manifestRoot,
          worktreeRoot
        },
        {
          generateAttemptId: () => "att_first"
        }
      );
      const second = await createAttempt(
        {
          repoRoot,
          taskId: "Fix flaky tests",
          manifestRoot,
          worktreeRoot
        },
        {
          generateAttemptId: () => "att_second"
        }
      );

      expect(first.attemptId).not.toBe(second.attemptId);
      expect(first.branch).not.toBe(second.branch);
      expect(first.worktreePath).not.toBe(second.worktreePath);

      await expect(listAttempts({ manifestRoot })).resolves.toEqual([
        expect.objectContaining({ attemptId: "att_first" }),
        expect.objectContaining({ attemptId: "att_second" })
      ]);
    },
    integrationTestTimeoutMs
  );

  it("should mark openclaw attempts as experimental", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-manifest-");
    const worktreeRoot = await createTempDirectory("agent-worktree-worktree-");

    const manifest = await createAttempt(
      {
        repoRoot,
        runtime: "openclaw",
        taskId: "Explore gateway flow",
        manifestRoot,
        worktreeRoot
      },
      {
        generateAttemptId: () => "att_gateway"
      }
    );

    expect(manifest.supportTier).toBe("experimental");
  }, integrationTestTimeoutMs);

  it("should reject unknown runtimes", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-manifest-");
    const worktreeRoot = await createTempDirectory("agent-worktree-worktree-");

    await expect(
      createAttempt({
        repoRoot,
        runtime: "unsupported-runtime",
        taskId: "Unknown runtime",
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(ValidationError);
  }, integrationTestTimeoutMs);

  it("should reject worktree roots nested inside the primary repository", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-manifest-");

    await expect(
      createAttempt({
        repoRoot,
        taskId: "Nested worktree root",
        manifestRoot,
        worktreeRoot: path.join(repoRoot, ".nested-worktrees")
      })
    ).rejects.toThrow(ValidationError);
  }, integrationTestTimeoutMs);

  it("should reject symlinked worktree roots whose real target overlaps the primary repository", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-manifest-");
    const aliasContainer = await createTempDirectory("agent-worktree-alias-");
    const symlinkedWorktreeRoot = path.join(aliasContainer, "worktrees-link");

    await mkdir(path.join(repoRoot, ".nested-worktrees"), { recursive: true });
    await symlink(
      path.join(repoRoot, ".nested-worktrees"),
      symlinkedWorktreeRoot,
      "dir"
    );

    await expect(
      createAttempt({
        repoRoot,
        taskId: "Symlink overlap",
        manifestRoot,
        worktreeRoot: symlinkedWorktreeRoot
      })
    ).rejects.toThrow(ValidationError);
  }, integrationTestTimeoutMs);

  it("should reject symlinked worktree roots whose real target overlaps the manifest store", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-manifest-");
    const aliasContainer = await createTempDirectory("agent-worktree-alias-");
    const symlinkedWorktreeRoot = path.join(aliasContainer, "manifest-link");

    await symlink(manifestRoot, symlinkedWorktreeRoot, "dir");

    await expect(
      createAttempt({
        repoRoot,
        taskId: "Symlink manifest overlap",
        manifestRoot,
        worktreeRoot: symlinkedWorktreeRoot
      })
    ).rejects.toThrow(ValidationError);
  }, integrationTestTimeoutMs);

  it(
    "should roll back the created worktree when manifest persistence fails",
    async () => {
      const { repoRoot } = await createTestRepository();
      tempDirectories.push(repoRoot);
      const manifestRoot = await createTempDirectory("agent-worktree-manifest-");
      const worktreeRoot = await createTempDirectory("agent-worktree-worktree-");
      const expectedWorktreePath = path.join(
        worktreeRoot,
        "rollback-manifest-write-att_rollback"
      );
      const expectedBranch = "attempt/rollback-manifest-write/att_rollback";

      const error = await createAttempt(
        {
          repoRoot,
          taskId: "Rollback manifest write",
          manifestRoot,
          worktreeRoot
        },
        {
          generateAttemptId: () => "att_rollback",
          writeManifestImpl: async () => {
            throw new Error("manifest write failed");
          }
        }
      ).catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(RuntimeError);
      expect((error as RuntimeError).message).toBe(
        "Failed to persist manifest for attempt att_rollback. The worktree was removed, but the attempt branch was intentionally retained."
      );
      expect((error as RuntimeError).causeValue).toMatchObject({
        manifestWriteError: expect.any(Error),
        residue: {
          attemptId: "att_rollback",
          branch: expectedBranch,
          worktreePath: expectedWorktreePath,
          branchStillPresent: true,
          worktreeStillPresent: false
        },
        residueFollowUp: {
          residueDisposition: "branch_only",
          hasResidualMaterial: true,
          requiresManualBranchCleanup: true,
          requiresWorktreeCleanup: false
        }
      });
      expect(
        ((error as RuntimeError).causeValue as { residueFollowUpError?: unknown })
          .residueFollowUpError
      ).toBeUndefined();

      const worktreeListOutput = await runGit(["worktree", "list", "--porcelain"], {
        cwd: repoRoot
      });
      const branchListOutput = await runGit(["branch", "--list", expectedBranch], {
        cwd: repoRoot
      });

      expect(worktreeListOutput).not.toContain(expectedWorktreePath);
      expect(branchListOutput).toContain(expectedBranch);
    },
    15_000
  );

  it(
    "should preserve the primary manifest-write failure when residue follow-up derivation fails",
    async () => {
      vi.resetModules();
      vi.doMock("../../src/worktree/create-residue.js", async () => ({
        deriveCreateAttemptFailureResidueFollowUp: async () => {
          throw new Error("residue follow-up failed");
        }
      }));

      const { createAttempt: createAttemptWithFailingResidueFollowUp } =
        await import("../../src/worktree/create.js");
      const { repoRoot } = await createTestRepository();
      tempDirectories.push(repoRoot);
      const manifestRoot = await createTempDirectory("agent-worktree-manifest-");
      const worktreeRoot = await createTempDirectory("agent-worktree-worktree-");

      const error = await createAttemptWithFailingResidueFollowUp(
        {
          repoRoot,
          taskId: "Rollback residue failure",
          manifestRoot,
          worktreeRoot
        },
        {
          generateAttemptId: () => "att_rollback_residue_error",
          writeManifestImpl: async () => {
            throw new Error("manifest write failed");
          }
        }
      ).catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe("RuntimeError");
      expect((error as RuntimeError).message).toBe(
        "Failed to persist manifest for attempt att_rollback_residue_error. The worktree was removed, but the attempt branch was intentionally retained."
      );
      expect((error as RuntimeError).causeValue).toMatchObject({
        manifestWriteError: expect.any(Error)
      });
      expect(
        ((error as RuntimeError).causeValue as { residueFollowUpError?: unknown })
          .residueFollowUpError
      ).toEqual(expect.any(Error));
      expect(
        ((error as RuntimeError).causeValue as { residueFollowUp?: unknown })
          .residueFollowUp
      ).toBeUndefined();
    },
    integrationTestTimeoutMs
  );

  it(
    "should attach best-effort rollback residue diagnostics when safe cleanup fails",
    async () => {
      const rollbackError = new ValidationError("rollback cleanup failed");
      const rollbackResidueFollowUp = {
        residue: {
          attemptId: "att_rollback_cleanup_error",
          branch: "attempt/rollback-cleanup-failure/att_rollback_cleanup_error",
          worktreePath: "/tmp/rollback-cleanup-failure",
          branchStillPresent: true,
          worktreeStillPresent: true
        },
        residueDisposition: "branch_and_worktree" as const,
        hasResidualMaterial: true,
        requiresManualBranchCleanup: true,
        requiresWorktreeCleanup: true
      };

      vi.resetModules();
      vi.doMock("../../src/worktree/cleanup.js", async () => ({
        cleanupWorktreeMaterial: async () => {
          throw rollbackError;
        }
      }));
      vi.doMock("../../src/worktree/create-residue.js", async () => ({
        deriveCreateAttemptFailureResidueFollowUp: async () => {
          return rollbackResidueFollowUp;
        }
      }));

      const { createAttempt: createAttemptWithFailingRollback } =
        await import("../../src/worktree/create.js");
      const { repoRoot } = await createTestRepository();
      tempDirectories.push(repoRoot);
      const manifestRoot = await createTempDirectory("agent-worktree-manifest-");
      const worktreeRoot = await createTempDirectory("agent-worktree-worktree-");

      const error = await createAttemptWithFailingRollback(
        {
          repoRoot,
          taskId: "Rollback cleanup failure",
          manifestRoot,
          worktreeRoot
        },
        {
          generateAttemptId: () => "att_rollback_cleanup_error",
          writeManifestImpl: async () => {
            throw new Error("manifest write failed");
          }
        }
      ).catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe("RuntimeError");
      expect((error as RuntimeError).message).toBe(
        "Failed to persist manifest for attempt att_rollback_cleanup_error, and safe worktree rollback also failed."
      );
      expect((error as RuntimeError).causeValue).toMatchObject({
        manifestWriteError: expect.any(Error),
        rollbackError,
        rollbackResidueFollowUp
      });
      expect(
        ((error as RuntimeError).causeValue as { residue?: unknown }).residue
      ).toBeUndefined();
      expect(
        ((error as RuntimeError).causeValue as { residueFollowUp?: unknown })
          .residueFollowUp
      ).toBeUndefined();
      expect(
        (
          (error as RuntimeError).causeValue as {
            rollbackResidueFollowUpError?: unknown;
          }
        ).rollbackResidueFollowUpError
      ).toBeUndefined();
    },
    integrationTestTimeoutMs
  );

  it(
    "should preserve the typed rollback failure when rollback residue follow-up also fails",
    async () => {
      const rollbackError = new ValidationError("rollback cleanup failed");

      vi.resetModules();
      vi.doMock("../../src/worktree/cleanup.js", async () => ({
        cleanupWorktreeMaterial: async () => {
          throw rollbackError;
        }
      }));
      vi.doMock("../../src/worktree/create-residue.js", async () => ({
        deriveCreateAttemptFailureResidueFollowUp: async () => {
          throw new Error("rollback residue follow-up failed");
        }
      }));

      const { createAttempt: createAttemptWithFailingRollback } =
        await import("../../src/worktree/create.js");
      const { repoRoot } = await createTestRepository();
      tempDirectories.push(repoRoot);
      const manifestRoot = await createTempDirectory("agent-worktree-manifest-");
      const worktreeRoot = await createTempDirectory("agent-worktree-worktree-");

      const error = await createAttemptWithFailingRollback(
        {
          repoRoot,
          taskId: "Rollback cleanup failure",
          manifestRoot,
          worktreeRoot
        },
        {
          generateAttemptId: () => "att_rollback_cleanup_error",
          writeManifestImpl: async () => {
            throw new Error("manifest write failed");
          }
        }
      ).catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe("RuntimeError");
      expect((error as RuntimeError).message).toBe(
        "Failed to persist manifest for attempt att_rollback_cleanup_error, and safe worktree rollback also failed."
      );
      expect((error as RuntimeError).causeValue).toMatchObject({
        manifestWriteError: expect.any(Error),
        rollbackError,
        rollbackResidueFollowUpError: expect.any(Error)
      });
      expect(
        (
          (error as RuntimeError).causeValue as {
            rollbackResidueFollowUp?: unknown;
          }
        ).rollbackResidueFollowUp
      ).toBeUndefined();
      expect(
        (
          (error as RuntimeError).causeValue as {
            residue?: unknown;
          }
        ).residue
      ).toBeUndefined();
    },
    integrationTestTimeoutMs
  );
});
