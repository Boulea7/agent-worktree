import { mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { normalizePathForComparison } from "../../src/core/paths.js";
import {
  deriveCreateAttemptFailureResidue,
  deriveCreateAttemptFailureResidueFollowUp
} from "../../src/worktree/create-residue.js";
import { runGit } from "../../src/worktree/git.js";
import { createTestRepository } from "./helpers.js";

describe("deriveCreateAttemptFailureResidue", () => {
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

  it("should report a retained branch after rollback removes the worktree path", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const branch = "attempt/residue/att_branch_only";
    const worktreePath = path.join(
      await createTempDirectory("agent-worktree-residue-"),
      "branch-only"
    );

    await runGit(["branch", branch, "HEAD"], { cwd: repoRoot });

    await expect(
      deriveCreateAttemptFailureResidue({
        attemptId: "att_branch_only",
        branch,
        repoRoot,
        worktreePath
      })
    ).resolves.toEqual({
      attemptId: "att_branch_only",
      branch,
      worktreePath,
      branchStillPresent: true,
      worktreeStillPresent: false
    });
  });

  it("should report independent branch and worktree residue facts", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const worktreeRoot = await createTempDirectory("agent-worktree-residue-");
    const worktreePath = path.join(worktreeRoot, "worktree-only");

    await mkdir(worktreePath, { recursive: true });

    await expect(
      deriveCreateAttemptFailureResidue({
        attemptId: "att_worktree_only",
        branch: "attempt/residue/att_worktree_only",
        repoRoot,
        worktreePath
      })
    ).resolves.toEqual({
      attemptId: "att_worktree_only",
      branch: "attempt/residue/att_worktree_only",
      worktreePath,
      branchStillPresent: false,
      worktreeStillPresent: true
    });
  });

  it("should derive a branch-only follow-up summary for retained branch residue", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const branch = "attempt/residue/att_follow_up_branch";
    const worktreePath = path.join(
      await createTempDirectory("agent-worktree-residue-"),
      "follow-up-branch"
    );

    await runGit(["branch", branch, "HEAD"], { cwd: repoRoot });

    await expect(
      deriveCreateAttemptFailureResidueFollowUp({
        attemptId: "att_follow_up_branch",
        branch,
        repoRoot,
        worktreePath
      })
    ).resolves.toEqual({
      residue: {
        attemptId: "att_follow_up_branch",
        branch,
        worktreePath,
        branchStillPresent: true,
        worktreeStillPresent: false
      },
      residueDisposition: "branch_only",
      hasResidualMaterial: true,
      requiresManualBranchCleanup: true,
      requiresWorktreeCleanup: false
    });
  });

  it("should derive a worktree-only follow-up summary when only the worktree path remains", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const worktreeRoot = await createTempDirectory("agent-worktree-residue-");
    const worktreePath = path.join(worktreeRoot, "follow-up-worktree");

    await mkdir(worktreePath, { recursive: true });

    await expect(
      deriveCreateAttemptFailureResidueFollowUp({
        attemptId: "att_follow_up_worktree",
        branch: "attempt/residue/att_follow_up_worktree",
        repoRoot,
        worktreePath
      })
    ).resolves.toEqual({
      residue: {
        attemptId: "att_follow_up_worktree",
        branch: "attempt/residue/att_follow_up_worktree",
        worktreePath,
        branchStillPresent: false,
        worktreeStillPresent: true
      },
      residueDisposition: "worktree_only",
      hasResidualMaterial: true,
      requiresManualBranchCleanup: false,
      requiresWorktreeCleanup: true
    });
  });

  it("should derive a branch-and-worktree follow-up summary when rollback leaves both behind", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const branch = "attempt/residue/att_follow_up_both";
    const worktreeRoot = await createTempDirectory("agent-worktree-residue-");
    const worktreePath = path.join(worktreeRoot, "follow-up-both");

    await runGit(["branch", branch, "HEAD"], { cwd: repoRoot });
    await mkdir(worktreePath, { recursive: true });

    await expect(
      deriveCreateAttemptFailureResidueFollowUp({
        attemptId: "att_follow_up_both",
        branch,
        repoRoot,
        worktreePath
      })
    ).resolves.toEqual({
      residue: {
        attemptId: "att_follow_up_both",
        branch,
        worktreePath,
        branchStillPresent: true,
        worktreeStillPresent: true
      },
      residueDisposition: "branch_and_worktree",
      hasResidualMaterial: true,
      requiresManualBranchCleanup: true,
      requiresWorktreeCleanup: true
    });
  });

  it("should derive a no-residue follow-up summary when rollback left nothing behind", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const worktreePath = path.join(
      await createTempDirectory("agent-worktree-residue-"),
      "follow-up-none"
    );

    await expect(
      deriveCreateAttemptFailureResidueFollowUp({
        attemptId: "att_follow_up_none",
        branch: "attempt/residue/att_follow_up_none",
        repoRoot,
        worktreePath
      })
    ).resolves.toEqual({
      residue: {
        attemptId: "att_follow_up_none",
        branch: "attempt/residue/att_follow_up_none",
        worktreePath,
        branchStillPresent: false,
        worktreeStillPresent: false
      },
      residueDisposition: "none",
      hasResidualMaterial: false,
      requiresManualBranchCleanup: false,
      requiresWorktreeCleanup: false
    });
  });

  it("should canonicalize a symlinked worktree path before checking residue state", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const worktreeRoot = await createTempDirectory("agent-worktree-residue-");
    const canonicalRoot = await realpath(worktreeRoot);
    const aliasRoot = path.join(
      await createTempDirectory("agent-worktree-residue-alias-"),
      "worktree-link"
    );
    const worktreePath = normalizePathForComparison(
      path.join(canonicalRoot, "canonical-worktree")
    );
    const aliasedWorktreePath = path.join(aliasRoot, "canonical-worktree");

    await mkdir(worktreePath, { recursive: true });
    await symlink(canonicalRoot, aliasRoot, "dir");

    await expect(
      deriveCreateAttemptFailureResidue({
        attemptId: "att_symlinked_worktree_residue",
        branch: "attempt/residue/att_symlinked_worktree_residue",
        repoRoot,
        worktreePath: aliasedWorktreePath
      })
    ).resolves.toEqual({
      attemptId: "att_symlinked_worktree_residue",
      branch: "attempt/residue/att_symlinked_worktree_residue",
      worktreePath,
      branchStillPresent: false,
      worktreeStillPresent: true
    });
  });

  it("should canonicalize a repo root before checking branch residue", async () => {
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const canonicalRepoRoot = await realpath(repoRoot);
    const aliasedRepoRoot = path.join(
      await createTempDirectory("agent-worktree-residue-repo-alias-"),
      "repo-link"
    );
    const branch = "attempt/residue/att_symlinked_repo_residue";
    const worktreePath = path.join(
      await createTempDirectory("agent-worktree-residue-"),
      "repo-alias-worktree"
    );

    await runGit(["branch", branch, "HEAD"], { cwd: repoRoot });
    await symlink(canonicalRepoRoot, aliasedRepoRoot, "dir");

    await expect(
      deriveCreateAttemptFailureResidue({
        attemptId: "att_symlinked_repo_residue",
        branch,
        repoRoot: aliasedRepoRoot,
        worktreePath
      })
    ).resolves.toEqual({
      attemptId: "att_symlinked_repo_residue",
      branch,
      worktreePath,
      branchStillPresent: true,
      worktreeStillPresent: false
    });
  });
});
