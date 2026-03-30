import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  NotFoundError,
  ValidationError
} from "../../src/core/errors.js";
import { readManifest, writeManifest } from "../../src/manifest/store.js";
import type { AttemptManifest } from "../../src/manifest/types.js";
import {
  cleanupAttempt
} from "../../src/worktree/cleanup.js";
import { createAttempt } from "../../src/worktree/create.js";
import { runGit } from "../../src/worktree/git.js";
import { listAttempts } from "../../src/worktree/list.js";
import { createTestRepository } from "./helpers.js";

describe("cleanupAttempt", () => {
  const tempDirectories: string[] = [];

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

  async function createFixtureAttempt(
    attemptId: string,
    taskId: string
  ): Promise<{
    manifest: AttemptManifest;
    manifestRoot: string;
    repoRoot: string;
    worktreeRoot: string;
  }> {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-manifest-");
    const worktreeRoot = await createTempDirectory("agent-worktree-worktree-");
    const manifest = await createAttempt(
      {
        repoRoot,
        taskId,
        manifestRoot,
        worktreeRoot
      },
      {
        generateAttemptId: () => attemptId,
        now: () => new Date("2026-03-20T01:02:03.000Z")
      }
    );

    return { manifest, manifestRoot, repoRoot, worktreeRoot };
  }

  it("should remove a clean managed worktree and retain the manifest", async () => {
    const { manifest, manifestRoot, repoRoot, worktreeRoot } =
      await createFixtureAttempt("att_cleanup", "Cleanup worktree");

    await writeManifest(
      {
        ...manifest,
        sourceKind: "fork",
        parentAttemptId: "att_parent"
      },
      { rootDir: manifestRoot }
    );

    const result = await cleanupAttempt({
      attemptId: manifest.attemptId,
      manifestRoot,
      worktreeRoot
    });

    expect(result.cleanup).toEqual({
      outcome: "removed",
      worktreeRemoved: true
    });
    expect(result.attempt.status).toBe("cleaned");
    expect(result.attempt.sourceKind).toBe("fork");
    expect(result.attempt.parentAttemptId).toBe("att_parent");

    const savedManifest = await readManifest(manifest.attemptId, {
      rootDir: manifestRoot
    });
    expect(savedManifest.status).toBe("cleaned");
    expect(savedManifest.sourceKind).toBe("fork");
    expect(savedManifest.parentAttemptId).toBe("att_parent");

    const listedAttempts = await listAttempts({ manifestRoot });
    expect(listedAttempts).toEqual([
      expect.objectContaining({
        attemptId: manifest.attemptId,
        status: "cleaned",
        sourceKind: "fork",
        parentAttemptId: "att_parent"
      })
    ]);

    const worktreeListOutput = await runGit(["worktree", "list", "--porcelain"], {
      cwd: repoRoot
    });
    expect(worktreeListOutput).not.toContain(manifest.worktreePath);

    const branchOutput = await runGit(["branch", "--list", manifest.branch!], {
      cwd: repoRoot
    });
    expect(branchOutput).toContain(manifest.branch!);
  }, 10_000);

  it(
    "should be idempotent after an attempt is already cleaned",
    async () => {
      const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
        "att_repeat",
        "Repeat cleanup"
      );

      await cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      });

      const secondResult = await cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      });

      expect(secondResult.cleanup).toEqual({
        outcome: "already_cleaned",
        worktreeRemoved: false
      });
      expect(secondResult.attempt.status).toBe("cleaned");
    },
    10_000
  );

  it("should fail when the target manifest does not exist", async () => {
    const manifestRoot = await createTempDirectory("agent-worktree-manifest-");
    const worktreeRoot = await createTempDirectory("agent-worktree-worktree-");

    await expect(
      cleanupAttempt({
        attemptId: "att_missing",
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("should converge to cleaned when the worktree has already been removed safely", async () => {
    const { manifest, manifestRoot, repoRoot, worktreeRoot } =
      await createFixtureAttempt("att_missing_path", "Missing worktree");

    await runGit(["worktree", "remove", manifest.worktreePath!], {
      cwd: repoRoot
    });

    const result = await cleanupAttempt({
      attemptId: manifest.attemptId,
      manifestRoot,
      worktreeRoot
    });

    expect(result.cleanup).toEqual({
      outcome: "missing_worktree_converged",
      worktreeRemoved: false
    });
    expect(result.attempt.status).toBe("cleaned");
  }, 10000);

  it("should reject cleanup when the worktree path is missing but still registered", async () => {
    const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
      "att_stale_registration",
      "Stale registration"
    );

    await rm(manifest.worktreePath!, { recursive: true, force: true });

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(ValidationError);
  });

  it("should reject cleanup when the worktree is dirty", async () => {
    const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
      "att_dirty",
      "Dirty cleanup"
    );

    await writeFile(
      path.join(manifest.worktreePath!, "dirty.txt"),
      "dirty\n",
      "utf8"
    );

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(ValidationError);
  });

  it("should reject cleanup when the manifest points outside the controlled worktree root", async () => {
    const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
      "att_outside_root",
      "Outside root"
    );

    await writeManifest(
      {
        ...manifest,
        worktreePath: path.join(os.tmpdir(), "outside-root")
      },
      { rootDir: manifestRoot }
    );

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(ValidationError);
  });

  it("should reject cleanup when the manifest points at the primary repository", async () => {
    const { manifest, manifestRoot, repoRoot, worktreeRoot } =
      await createFixtureAttempt("att_repo_root", "Repo root");

    await writeManifest(
      {
        ...manifest,
        worktreePath: repoRoot
      },
      { rootDir: manifestRoot }
    );

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(ValidationError);
  });

  it(
    "should reject cleanup when a running attempt manifest still records a session",
    async () => {
    const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
      "att_running",
      "Running cleanup"
    );

    await writeManifest(
      {
        ...manifest,
        status: "running",
        session: {
          backend: "tmux",
          sessionId: "session-1"
        }
      },
      { rootDir: manifestRoot }
    );

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(ValidationError);
    }
  );

  it("should reject cleanup when the stored manifest attemptId does not match the selector", async () => {
    const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
      "att_selector",
      "Selector mismatch"
    );
    const manifestPath = path.join(manifestRoot, manifest.attemptId, "manifest.json");

    await writeFile(
      manifestPath,
      JSON.stringify({ ...manifest, attemptId: "att_other" }, null, 2),
      "utf8"
    );

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(ValidationError);
  });
});
