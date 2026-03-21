import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { GitError } from "../core/errors.js";

const execFileAsync = promisify(execFile);

export interface GitCommandOptions {
  cwd: string;
}

export async function runGit(
  args: string[],
  options: GitCommandOptions
): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: options.cwd,
      encoding: "utf8"
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
