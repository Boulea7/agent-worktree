import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runGit } from "../../src/worktree/git.js";

export interface TestRepositoryContext {
  repoRoot: string;
}

export async function createTestRepository(): Promise<TestRepositoryContext> {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), "agent-worktree-repo-"));

  await runGit(["init", "--initial-branch=main"], { cwd: repoRoot });
  await runGit(["config", "user.name", "Agent Worktree Tests"], { cwd: repoRoot });
  await runGit(["config", "user.email", "agent-worktree@example.test"], {
    cwd: repoRoot
  });

  await writeFile(path.join(repoRoot, "README.md"), "# fixture\n", "utf8");
  await runGit(["add", "README.md"], { cwd: repoRoot });
  await runGit(["commit", "-m", "Initial commit"], { cwd: repoRoot });

  return { repoRoot };
}
