import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
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

  it(
    "should reject cleanup when the worktree is dirty",
    async () => {
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
    },
    10_000
  );

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

  it("should reject cleanup when repoRoot is missing from the manifest", async () => {
    const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
      "att_missing_repo_root",
      "Missing repo root"
    );
    const { repoRoot: _repoRoot, ...manifestWithoutRepoRoot } = manifest;

    await writeManifest(
      manifestWithoutRepoRoot,
      { rootDir: manifestRoot }
    );

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(
      `Attempt ${manifest.attemptId} cannot be cleaned because repoRoot is missing from the manifest.`
    );
  });

  it("should reject cleanup when repoRoot or worktreePath are not absolute", async () => {
    const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
      "att_relative_paths",
      "Relative paths"
    );

    await writeManifest(
      {
        ...manifest,
        repoRoot: "relative/repo",
        worktreePath: "relative/worktree"
      },
      { rootDir: manifestRoot }
    );

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(
      `Attempt ${manifest.attemptId} cannot be cleaned because repoRoot and worktreePath must be absolute paths.`
    );
  });

  it("should reject cleanup when the manifest points at the controlled worktree root itself", async () => {
    const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
      "att_worktree_root",
      "Worktree root"
    );

    await writeManifest(
      {
        ...manifest,
        worktreePath: worktreeRoot
      },
      { rootDir: manifestRoot }
    );

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(
      `Attempt ${manifest.attemptId} cannot be cleaned because its worktree path points at the worktree root itself.`
    );
  });

  it("should reject cleanup when the manifest points inside the manifest store", async () => {
    const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
      "att_manifest_overlap",
      "Manifest overlap"
    );

    await writeManifest(
      {
        ...manifest,
        worktreePath: path.join(manifestRoot, "att_manifest_overlap")
      },
      { rootDir: manifestRoot }
    );

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot: os.tmpdir()
      })
    ).rejects.toThrow(
      `Attempt ${manifest.attemptId} cannot be cleaned because its worktree path overlaps the manifest store.`
    );
  });

  it("should match registered worktrees through a symlinked controlled root using real paths", async () => {
    const { manifest, manifestRoot, repoRoot, worktreeRoot } =
      await createFixtureAttempt("att_symlink_cleanup", "Symlink cleanup");
    const aliasContainer = await createTempDirectory("agent-worktree-alias-");
    const symlinkedWorktreeRoot = path.join(aliasContainer, "worktrees-link");
    const symlinkedWorktreePath = path.join(
      symlinkedWorktreeRoot,
      path.basename(manifest.worktreePath!)
    );

    await symlink(worktreeRoot, symlinkedWorktreeRoot, "dir");
    await writeManifest(
      {
        ...manifest,
        worktreePath: symlinkedWorktreePath
      },
      { rootDir: manifestRoot }
    );

    const result = await cleanupAttempt({
      attemptId: manifest.attemptId,
      manifestRoot,
      worktreeRoot: symlinkedWorktreeRoot
    });

    expect(result.cleanup).toEqual({
      outcome: "removed",
      worktreeRemoved: true
    });

    const worktreeListOutput = await runGit(["worktree", "list", "--porcelain"], {
      cwd: repoRoot
    });
    expect(worktreeListOutput).not.toContain(manifest.worktreePath);
  }, 10_000);

  it("should clean a managed worktree when the stored path traverses symlink plus dot-dot segments", async () => {
    const { manifest, manifestRoot, repoRoot, worktreeRoot } =
      await createFixtureAttempt("att_symlink_parent_cleanup", "Symlink parent cleanup");
    const aliasContainer = await createTempDirectory("agent-worktree-alias-");
    const nestedRoot = path.join(worktreeRoot, "nested-anchor");
    const symlinkedNestedRoot = path.join(aliasContainer, "nested-link");
    const escapedWorktreePath =
      `${symlinkedNestedRoot}${path.sep}..${path.sep}${path.basename(manifest.worktreePath!)}`;

    await mkdir(nestedRoot, { recursive: true });
    await symlink(nestedRoot, symlinkedNestedRoot, "dir");
    await writeManifest(
      {
        ...manifest,
        worktreePath: escapedWorktreePath
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

    const worktreeListOutput = await runGit(["worktree", "list", "--porcelain"], {
      cwd: repoRoot
    });
    expect(worktreeListOutput).not.toContain(manifest.worktreePath);
  }, 10_000);

  it(
    "should reject cleanup when a non-cleaned attempt manifest still records a session",
    async () => {
    const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
      "att_session_blocked",
      "Session-blocked cleanup"
    );

    await writeManifest(
      {
        ...manifest,
        status: "created",
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

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(
      `Attempt ${manifest.attemptId} cannot be cleaned while a session is recorded in the manifest.`
    );
    }
  );

  it("should keep the already-cleaned fast path even when a cleaned manifest still records a session", async () => {
    const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
      "att_cleaned_session_fast_path",
      "Already cleaned session fast path"
    );

    await runGit(["worktree", "remove", manifest.worktreePath!], {
      cwd: manifest.repoRoot!
    });

    const manifestWithSession = {
      ...manifest,
      status: "cleaned" as const,
      session: {
        backend: "tmux",
        sessionId: "session-cleaned"
      }
    };

    await writeManifest(manifestWithSession, { rootDir: manifestRoot });

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      })
    ).resolves.toEqual({
      attempt: manifestWithSession,
      cleanup: {
        outcome: "already_cleaned",
        worktreeRemoved: false
      }
    });

    await expect(
      readManifest(manifest.attemptId, { rootDir: manifestRoot })
    ).resolves.toEqual(manifestWithSession);
  });

  it("should reject already-cleaned manifests when worktree material still exists", async () => {
    const { manifest, manifestRoot, worktreeRoot } = await createFixtureAttempt(
      "att_cleaned_residue",
      "Cleaned residue"
    );

    await writeManifest(
      {
        ...manifest,
        status: "cleaned"
      },
      { rootDir: manifestRoot }
    );

    await expect(
      cleanupAttempt({
        attemptId: manifest.attemptId,
        manifestRoot,
        worktreeRoot
      })
    ).rejects.toThrow(
      `Attempt ${manifest.attemptId} is marked cleaned, but git still reports worktree material for it.`
    );
  });

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
