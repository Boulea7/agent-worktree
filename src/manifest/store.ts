import {
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import {
  AgentWorktreeError,
  NotFoundError,
  RuntimeError,
  ValidationError
} from "../core/errors.js";
import { defaultManifestRoot } from "../core/paths.js";
import { parseManifest } from "./schema.js";
import { type AttemptManifest } from "./types.js";

export interface ManifestStoreOptions {
  rootDir?: string;
}

export function getManifestDirectory(
  attemptId: string,
  options: ManifestStoreOptions = {}
): string {
  return path.join(options.rootDir ?? defaultManifestRoot, attemptId);
}

export function getManifestPath(
  attemptId: string,
  options: ManifestStoreOptions = {}
): string {
  return path.join(getManifestDirectory(attemptId, options), "manifest.json");
}

export function serializeManifest(manifest: AttemptManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function parseManifestContents(fileContents: string): AttemptManifest {
  const parsed = JSON.parse(fileContents) as unknown;
  return parseManifest(parsed);
}

export async function writeManifest(
  manifest: AttemptManifest,
  options: ManifestStoreOptions = {}
): Promise<string> {
  const normalizedManifest = parseManifest(manifest);
  const manifestPath = getManifestPath(normalizedManifest.attemptId, options);
  const manifestDirectory = path.dirname(manifestPath);
  const tempManifestPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;

  try {
    await mkdir(manifestDirectory, { recursive: true });
    await writeFile(
      tempManifestPath,
      serializeManifest(normalizedManifest),
      "utf8"
    );
    await rename(tempManifestPath, manifestPath);
  } catch (error) {
    throw new RuntimeError(
      `Failed to write manifest for attempt ${normalizedManifest.attemptId}.`,
      error
    );
  } finally {
    await removeTempManifestIfPresent(tempManifestPath);
  }

  return manifestPath;
}

export async function readManifest(
  attemptId: string,
  options: ManifestStoreOptions = {}
): Promise<AttemptManifest> {
  const manifestPath = getManifestPath(attemptId, options);

  try {
    const fileContents = await readFile(manifestPath, "utf8");
    return parseManifestForAttempt(fileContents, attemptId);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new NotFoundError(`Manifest not found for attempt ${attemptId}.`);
    }

    if (error instanceof AgentWorktreeError) {
      throw error;
    }

    throw new RuntimeError(`Failed to read manifest for attempt ${attemptId}.`, error);
  }
}

export async function listManifests(
  options: ManifestStoreOptions = {}
): Promise<AttemptManifest[]> {
  const rootDir = options.rootDir ?? defaultManifestRoot;

  try {
    const entries = await readdir(rootDir, { withFileTypes: true });
    const manifests = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readManifestForList(entry.name, rootDir))
    );

    return manifests.sort((left, right) => left.attemptId.localeCompare(right.attemptId));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    if (error instanceof AgentWorktreeError) {
      throw error;
    }

    throw new RuntimeError("Failed to list manifests.", error);
  }
}

async function removeTempManifestIfPresent(tempManifestPath: string): Promise<void> {
  try {
    await unlink(tempManifestPath);
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw new RuntimeError("Failed to clean up temporary manifest file.", error);
    }
  }
}

function parseManifestForAttempt(
  fileContents: string,
  attemptId: string
): AttemptManifest {
  let manifest: AttemptManifest;

  try {
    manifest = parseManifestContents(fileContents);
  } catch (error) {
    throw new ValidationError(`Invalid attempt manifest for ${attemptId}.`, error);
  }

  if (manifest.attemptId !== attemptId) {
    throw new ValidationError(`Manifest attemptId mismatch for ${attemptId}.`);
  }

  return manifest;
}

async function readManifestForList(
  attemptId: string,
  rootDir: string
): Promise<AttemptManifest> {
  try {
    return await readManifest(attemptId, { rootDir });
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new ValidationError(`Invalid attempt manifest for ${attemptId}.`, error);
    }

    throw error;
  }
}
