import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../../src/worktree/git.js");
});

describe("cleanupWorktreeMaterial", () => {
  it("should classify git remove failures that would require force", async () => {
    const cleanupModule = await loadCleanupModule({
      stderr:
        "fatal: '/tmp/demo-worktree' contains modified or untracked files, use --force to delete it"
    });

    await expect(
      cleanupModule.cleanupWorktreeMaterial({
        repoRoot: "/tmp/repo",
        worktreePath: "/tmp/demo-worktree"
      })
    ).rejects.toMatchObject({
      name: "ValidationError",
      message:
        "Cleanup refused because git would require a forceful worktree removal for /tmp/demo-worktree."
    });
  });

  it("should classify git remove failures when the path is no longer a registered worktree", async () => {
    const cleanupModule = await loadCleanupModule({
      stderr: "fatal: '/tmp/demo-worktree' is not a working tree"
    });

    await expect(
      cleanupModule.cleanupWorktreeMaterial({
        repoRoot: "/tmp/repo",
        worktreePath: "/tmp/demo-worktree"
      })
    ).rejects.toThrow(
      "Cleanup refused because git could not confirm /tmp/demo-worktree is still a registered worktree."
    );
  });

  it("should keep unknown git remove failures loud without collapsing them into force-required guidance", async () => {
    const cleanupModule = await loadCleanupModule({
      stderr: "fatal: backend exploded"
    });

    await expect(
      cleanupModule.cleanupWorktreeMaterial({
        repoRoot: "/tmp/repo",
        worktreePath: "/tmp/demo-worktree"
      })
    ).rejects.toThrow(
      "Cleanup failed because git could not remove the managed worktree for /tmp/demo-worktree."
    );
  });

  it("should fall back to the generic cleanup failure when git remove stderr is missing", async () => {
    const cleanupModule = await loadCleanupModule(undefined);

    await expect(
      cleanupModule.cleanupWorktreeMaterial({
        repoRoot: "/tmp/repo",
        worktreePath: "/tmp/demo-worktree"
      })
    ).rejects.toThrow(
      "Cleanup failed because git could not remove the managed worktree for /tmp/demo-worktree."
    );
  });

  it("should fall back to the generic cleanup failure when git remove stderr is not a string", async () => {
    const cleanupModule = await loadCleanupModule({ stderr: 42 });

    await expect(
      cleanupModule.cleanupWorktreeMaterial({
        repoRoot: "/tmp/repo",
        worktreePath: "/tmp/demo-worktree"
      })
    ).rejects.toThrow(
      "Cleanup failed because git could not remove the managed worktree for /tmp/demo-worktree."
    );
  });

  it("should preserve the original GitError cause when generic cleanup fallback is used", async () => {
    const cleanupModule = await loadCleanupModule({
      stderr: "fatal: backend exploded"
    });

    const error = await cleanupModule
      .cleanupWorktreeMaterial({
        repoRoot: "/tmp/repo",
        worktreePath: "/tmp/demo-worktree"
      })
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: "ValidationError",
      message:
        "Cleanup failed because git could not remove the managed worktree for /tmp/demo-worktree."
    });
    expect((error as { causeValue?: unknown }).causeValue).toMatchObject({
      name: "GitError",
      code: "GIT_ERROR",
      message: "git remove failed"
    });
  });
});

async function loadCleanupModule(
  causeValue: unknown
): Promise<typeof import("../../src/worktree/cleanup.js")> {
  vi.resetModules();
  const { GitError } = await import("../../src/core/errors.js");

  vi.doMock("../../src/worktree/git.js", async () => ({
    runGit: async () => {
      throw new GitError("git remove failed", causeValue);
    }
  }));

  return import("../../src/worktree/cleanup.js");
}
