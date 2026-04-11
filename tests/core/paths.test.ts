import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { canonicalizePathForBoundary } from "../../src/core/paths.js";

describe("core path boundary helpers", () => {
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

  it("should canonicalize an existing symlinked directory to its real path", async () => {
    const rootDir = await createTempDirectory("agent-worktree-paths-");
    const realRoot = path.join(rootDir, "real");
    const aliasRoot = path.join(rootDir, "alias");

    await mkdir(realRoot, { recursive: true });
    await symlink(realRoot, aliasRoot, "dir");

    await expect(canonicalizePathForBoundary(aliasRoot)).resolves.toBe(realRoot);
  });

  it("should canonicalize a missing descendant beneath a symlinked ancestor using the real ancestor path", async () => {
    const rootDir = await createTempDirectory("agent-worktree-paths-");
    const realRoot = path.join(rootDir, "real");
    const aliasRoot = path.join(rootDir, "alias");
    const targetPath = path.join(aliasRoot, "nested", "attempt-one");

    await mkdir(realRoot, { recursive: true });
    await symlink(realRoot, aliasRoot, "dir");

    await expect(canonicalizePathForBoundary(targetPath)).resolves.toBe(
      path.join(realRoot, "nested", "attempt-one")
    );
  });

  it("should preserve symlink traversal semantics when the path climbs through .. after a symlink", async () => {
    const rootDir = await createTempDirectory("agent-worktree-paths-");
    const realRoot = path.join(rootDir, "real");
    const nestedRoot = path.join(realRoot, "nested");
    const aliasRoot = path.join(rootDir, "alias");
    const targetPath = `${aliasRoot}${path.sep}..${path.sep}attempt-one`;

    await mkdir(nestedRoot, { recursive: true });
    await mkdir(path.join(realRoot, "attempt-one"), { recursive: true });
    await symlink(nestedRoot, aliasRoot, "dir");

    await expect(canonicalizePathForBoundary(targetPath)).resolves.toBe(
      path.join(realRoot, "attempt-one")
    );
  });

  it("should preserve symlink traversal semantics for missing descendants after ..", async () => {
    const rootDir = await createTempDirectory("agent-worktree-paths-");
    const realRoot = path.join(rootDir, "real");
    const nestedRoot = path.join(realRoot, "nested");
    const aliasRoot = path.join(rootDir, "alias");
    const targetPath =
      `${aliasRoot}${path.sep}..${path.sep}attempt-missing${path.sep}child`;

    await mkdir(nestedRoot, { recursive: true });
    await symlink(nestedRoot, aliasRoot, "dir");

    await expect(canonicalizePathForBoundary(targetPath)).resolves.toBe(
      path.join(realRoot, "attempt-missing", "child")
    );
  });
});
