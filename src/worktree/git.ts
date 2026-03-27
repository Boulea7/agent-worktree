import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { GitError } from "../core/errors.js";

const execFileAsync = promisify(execFile);
export const defaultGitCommandTimeoutMs = 15000;

export interface GitCommandRunnerResult {
  stdout: string;
}

export interface GitCommandRunnerOptions {
  cwd: string;
  encoding: "utf8";
  env: NodeJS.ProcessEnv;
  timeout: number;
}

export interface GitCommandRunner {
  (
    file: string,
    args: readonly string[],
    options: GitCommandRunnerOptions
  ): Promise<GitCommandRunnerResult>;
}

export interface GitCommandOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  runCommand?: GitCommandRunner;
  timeoutMs?: number;
}

export async function runGit(
  args: string[],
  options: GitCommandOptions
): Promise<string> {
  const runner = options.runCommand ?? (execFileAsync as GitCommandRunner);
  const env = {
    ...process.env,
    ...(options.env ?? {}),
    GIT_TERMINAL_PROMPT: "0"
  };

  try {
    const { stdout } = await runner("git", args, {
      cwd: options.cwd,
      encoding: "utf8",
      env,
      timeout: options.timeoutMs ?? defaultGitCommandTimeoutMs
    });

    return stdout.trim();
  } catch (error) {
    const stderr = getStderr(error);
    const message = stderr
      ? `Git command failed: git ${args.join(" ")} (${stderr})`
      : `Git command failed: git ${args.join(" ")}`;

    throw new GitError(message, error);
  }
}

function getStderr(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "stderr" in error &&
    typeof error.stderr === "string"
  ) {
    return error.stderr.trim();
  }

  return "";
}
