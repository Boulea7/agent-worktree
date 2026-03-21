import { mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

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

      await expect(
        createAttempt(
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
        )
      ).rejects.toThrow(RuntimeError);

      const worktreeListOutput = await runGit(["worktree", "list", "--porcelain"], {
        cwd: repoRoot
      });

      expect(worktreeListOutput).not.toContain(expectedWorktreePath);
    },
    15_000
  );
});
