import { access } from "node:fs/promises";

import { ValidationError } from "../core/errors.js";
import { canonicalizePathForBoundary } from "../core/paths.js";
import { runGit } from "./git.js";

export interface CreateAttemptFailureResidueInput {
  attemptId: string;
  branch: string;
  repoRoot: string;
  worktreePath: string;
}

export interface CreateAttemptFailureResidue {
  attemptId: string;
  branch: string;
  worktreePath: string;
  branchStillPresent: boolean;
  worktreeStillPresent: boolean;
}

export interface CreateAttemptFailureResidueFollowUp {
  residue: CreateAttemptFailureResidue;
  residueDisposition: "none" | "branch_only" | "worktree_only" | "branch_and_worktree";
  hasResidualMaterial: boolean;
  requiresManualBranchCleanup: boolean;
  requiresWorktreeCleanup: boolean;
}

export async function deriveCreateAttemptFailureResidue(
  input: CreateAttemptFailureResidueInput
): Promise<CreateAttemptFailureResidue> {
  const attemptId = normalizeRequiredString(
    input.attemptId,
    "Create-attempt failure residue requires attemptId to be a non-empty string."
  );
  const branch = normalizeRequiredString(
    input.branch,
    "Create-attempt failure residue requires branch to be a non-empty string."
  );
  const repoRoot = normalizeRequiredString(
    input.repoRoot,
    "Create-attempt failure residue requires repoRoot to be a non-empty string."
  );
  const worktreePath = normalizeRequiredString(
    input.worktreePath,
    "Create-attempt failure residue requires worktreePath to be a non-empty string."
  );
  const canonicalRepoRoot = await canonicalizePathForBoundary(repoRoot);
  const canonicalWorktreePath = await canonicalizePathForBoundary(worktreePath);

  const [branchStillPresent, worktreeStillPresent] = await Promise.all([
    branchExists(canonicalRepoRoot, branch),
    pathExists(canonicalWorktreePath)
  ]);

  return {
    attemptId,
    branch,
    worktreePath: canonicalWorktreePath,
    branchStillPresent,
    worktreeStillPresent
  };
}

export async function deriveCreateAttemptFailureResidueFollowUp(
  input: CreateAttemptFailureResidueInput
): Promise<CreateAttemptFailureResidueFollowUp> {
  const residue = await deriveCreateAttemptFailureResidue(input);
  const residueDisposition = deriveResidueDisposition(residue);

  return {
    residue,
    residueDisposition,
    hasResidualMaterial: residueDisposition !== "none",
    requiresManualBranchCleanup:
      residueDisposition === "branch_only" ||
      residueDisposition === "branch_and_worktree",
    requiresWorktreeCleanup:
      residueDisposition === "worktree_only" ||
      residueDisposition === "branch_and_worktree"
  };
}

async function branchExists(repoRoot: string, branch: string): Promise<boolean> {
  const output = await runGit(["branch", "--list", branch], {
    cwd: repoRoot
  });

  return output.trim().length > 0;
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

function normalizeRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(message);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}

function deriveResidueDisposition(
  residue: CreateAttemptFailureResidue
): CreateAttemptFailureResidueFollowUp["residueDisposition"] {
  if (residue.branchStillPresent && residue.worktreeStillPresent) {
    return "branch_and_worktree";
  }

  if (residue.branchStillPresent) {
    return "branch_only";
  }

  if (residue.worktreeStillPresent) {
    return "worktree_only";
  }

  return "none";
}
