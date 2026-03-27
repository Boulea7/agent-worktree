import { describe, expect, it, vi } from "vitest";

import { GitError } from "../../src/core/errors.js";
import {
  defaultGitCommandTimeoutMs,
  runGit,
  type GitCommandRunnerOptions
} from "../../src/worktree/git.js";

describe("worktree git runner", () => {
  it("should pass a default timeout and disable interactive git prompts", async () => {
    const runCommand = vi.fn(
      async (_file: string, _args: readonly string[], options: GitCommandRunnerOptions) => {
        expect(options.timeout).toBe(defaultGitCommandTimeoutMs);
        expect(options.env.GIT_TERMINAL_PROMPT).toBe("0");
        return {
          stdout: " main \n"
        };
      }
    );

    await expect(
      runGit(["branch", "--show-current"], {
        cwd: "/tmp/demo",
        runCommand
      })
    ).resolves.toBe("main");
    expect(runCommand).toHaveBeenCalledTimes(1);
  });

  it("should preserve explicit env entries while still forcing non-interactive prompts", async () => {
    const runCommand = vi.fn(
      async (_file: string, _args: readonly string[], options: GitCommandRunnerOptions) => {
        expect(options.timeout).toBe(1234);
        expect(options.env.CUSTOM_FLAG).toBe("enabled");
        expect(options.env.GIT_TERMINAL_PROMPT).toBe("0");
        return {
          stdout: "ok\n"
        };
      }
    );

    await expect(
      runGit(["status", "--porcelain"], {
        cwd: "/tmp/demo",
        env: {
          CUSTOM_FLAG: "enabled",
          GIT_TERMINAL_PROMPT: "1"
        },
        runCommand,
        timeoutMs: 1234
      })
    ).resolves.toBe("ok");
  });

  it("should wrap subprocess failures as GitError", async () => {
    const expectedError = {
      stderr: "fatal: not a git repository"
    };

    await expect(
      runGit(["status"], {
        cwd: "/tmp/demo",
        runCommand: async () => {
          throw expectedError;
        }
      })
    ).rejects.toThrow(GitError);
    await expect(
      runGit(["status"], {
        cwd: "/tmp/demo",
        runCommand: async () => {
          throw expectedError;
        }
      })
    ).rejects.toThrow(
      "Git command failed: git status (fatal: not a git repository)"
    );
  });
});
