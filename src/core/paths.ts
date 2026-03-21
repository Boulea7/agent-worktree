import os from "node:os";
import path from "node:path";

export const AGENT_WORKTREE_STATE_ROOT_ENV = "AGENT_WORKTREE_STATE_ROOT";

export function getDefaultStateRoot(): string {
  return (
    process.env[AGENT_WORKTREE_STATE_ROOT_ENV] ??
    path.join(os.homedir(), ".local", "share", "agent-worktree")
  );
}

export function getAttemptsRoot(stateRoot = getDefaultStateRoot()): string {
  return path.join(stateRoot, "attempts");
}

export function getWorktreesRoot(stateRoot = getDefaultStateRoot()): string {
  return path.join(stateRoot, "worktrees");
}

export const defaultManifestRoot = getAttemptsRoot();
export const defaultWorktreeRoot = getWorktreesRoot();

export function normalizePathForComparison(targetPath: string): string {
  const resolvedPath = path.resolve(targetPath);

  if (resolvedPath === "/private/var") {
    return "/var";
  }

  if (resolvedPath.startsWith("/private/var/")) {
    return resolvedPath.slice("/private".length);
  }

  if (resolvedPath === "/private/tmp") {
    return "/tmp";
  }

  if (resolvedPath.startsWith("/private/tmp/")) {
    return resolvedPath.slice("/private".length);
  }

  return resolvedPath;
}

export function isPathInsideRoot(targetPath: string, rootPath: string): boolean {
  const normalizedTargetPath = normalizePathForComparison(targetPath);
  const normalizedRootPath = normalizePathForComparison(rootPath);
  const relativePath = path.relative(normalizedRootPath, normalizedTargetPath);

  return (
    relativePath.length === 0 ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}
