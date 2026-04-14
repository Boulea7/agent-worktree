import { realpath } from "node:fs/promises";
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

export async function canonicalizePathForBoundary(
  targetPath: string
): Promise<string> {
  const { segments, startPath } = await deriveBoundaryStart(targetPath);
  let canonicalPath = startPath;
  const missingSegments: string[] = [];
  let encounteredMissingSegment = false;

  for (const segment of segments) {
    if (segment.length === 0 || segment === ".") {
      continue;
    }

    if (encounteredMissingSegment) {
      applyLexicalSegment(missingSegments, segment);
      continue;
    }

    if (segment === "..") {
      canonicalPath = path.dirname(canonicalPath);
      continue;
    }

    const candidatePath = path.join(canonicalPath, segment);

    try {
      canonicalPath = normalizePathForComparison(await realpath(candidatePath));
    } catch (error) {
      if (!isMissingPathError(error)) {
        throw error;
      }

      encounteredMissingSegment = true;
      missingSegments.push(segment);
    }
  }

  return missingSegments.reduce(
    (rebuiltPath, segment) => path.join(rebuiltPath, segment),
    canonicalPath
  );
}

async function deriveBoundaryStart(targetPath: string): Promise<{
  segments: string[];
  startPath: string;
}> {
  if (path.isAbsolute(targetPath)) {
    const { root } = path.parse(targetPath);

    return {
      startPath: normalizePathForComparison(root),
      segments: splitPathSegments(targetPath.slice(root.length))
    };
  }

  return {
    startPath: normalizePathForComparison(await realpath(process.cwd())),
    segments: splitPathSegments(targetPath)
  };
}

function splitPathSegments(targetPath: string): string[] {
  return targetPath.split(/[\\/]+/u);
}

function applyLexicalSegment(
  missingSegments: string[],
  segment: string
): void {
  if (segment === "..") {
    if (missingSegments.length > 0) {
      missingSegments.pop();
      return;
    }

    missingSegments.push("..");
    return;
  }

  missingSegments.push(segment);
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

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
