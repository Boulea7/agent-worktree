import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  InvalidManifestError,
  NotFoundError,
  ValidationError
} from "../../src/core/errors.js";
import {
  listManifests,
  parseManifestContents,
  readManifest,
  serializeManifest,
  writeManifest
} from "../../src/manifest/store.js";
import type { AttemptManifest } from "../../src/manifest/types.js";
import { deriveAttemptVerificationPayload } from "../../src/verification/internal.js";

function createManifest(overrides: Partial<AttemptManifest> = {}): AttemptManifest {
  return {
    schemaVersion: "0.x",
    attemptId: "att_demo",
    taskId: "task_docs",
    runtime: "codex-cli",
    adapter: "subprocess",
    status: "created",
    verification: {
      state: "pending",
      checks: []
    },
    ...overrides
  };
}

describe("manifest store", () => {
  const tempDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirectories.map(async (directoryPath) => {
        const { rm } = await import("node:fs/promises");
        await rm(directoryPath, { recursive: true, force: true });
      })
    );
    tempDirectories.length = 0;
  });

  async function createTempDirectory(): Promise<string> {
    const directoryPath = await mkdtemp(
      path.join(os.tmpdir(), "agent-worktree-manifests-")
    );
    tempDirectories.push(directoryPath);
    return directoryPath;
  }

  it("should reject missing required fields", () => {
    expect(() =>
      parseManifestContents(
        JSON.stringify({
          attemptId: "att_demo"
        })
      )
    ).toThrow(ValidationError);
  });

  it("should reject blank taskId values", () => {
    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            taskId: "   "
          })
        )
      )
    ).toThrow(ValidationError);
  });

  it("should reject runtime values outside the current runtime vocabulary", () => {
    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            runtime: "future-runtime" as never
          })
        )
      )
    ).toThrow(ValidationError);
  });

  it("should reject invalid status values", () => {
    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            status: "invalid" as AttemptManifest["status"]
          })
        )
      )
    ).toThrow(ValidationError);
  });

  it("should reject unknown verification state values", () => {
    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            verification: {
              state: "PASS" as never,
              checks: []
            }
          })
        )
      )
    ).toThrow(ValidationError);
  });

  it("should reject wide-ingest verification state values when persisting a manifest", async () => {
    const rootDir = await createTempDirectory();

    await expect(
      writeManifest(
        createManifest({
          verification: deriveAttemptVerificationPayload({
            state: " legacy_pending ",
            checks: [
              {
                name: "lint",
                status: "passed",
                required: true
              }
            ]
          })
        }),
        { rootDir }
      )
    ).rejects.toThrow(ValidationError);
  });

  it("should reject malformed verification checks", () => {
    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            verification: {
              state: "pending",
              checks: [{ status: "passed" }]
            }
          })
        )
      )
    ).toThrow(ValidationError);

    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            verification: {
              state: "pending",
              checks: [{ name: "lint", status: "done" }]
            }
          })
        )
      )
    ).toThrow(ValidationError);
  });

  it("should wrap malformed JSON as a ValidationError when parsing manifest contents directly", () => {
    expect(() => parseManifestContents("{")).toThrow(ValidationError);
  });

  it("should serialize and parse the minimal example manifest", () => {
    const manifest = createManifest();
    const serialized = serializeManifest(manifest);

    expect(parseManifestContents(serialized)).toEqual(manifest);
  });

  it("should preserve additive unknown fields", () => {
    const manifest = parseManifestContents(
      JSON.stringify({
        ...createManifest(),
        unknownExtensionField: {
          enabled: true
        }
      })
    );

    expect(manifest.unknownExtensionField).toEqual({ enabled: true });
  });

  it("should preserve additive opaque extension blocks through disk round-trips", async () => {
    const rootDir = await createTempDirectory();
    const manifest = createManifest({
      sourceKind: "fork",
      parentAttemptId: "att_parent",
      opaqueExtensionBlock: {
        extensionState: "active",
        parentLookup: {
          att_parent: ["att_demo"]
        }
      }
    });

    await writeManifest(manifest, { rootDir });

    await expect(readManifest("att_demo", { rootDir })).resolves.toEqual(manifest);
    await expect(listManifests({ rootDir })).resolves.toEqual([manifest]);
  });

  it("should reject blank lifecycle and session string fields", () => {
    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            repoRoot: "   "
          })
        )
      )
    ).toThrow(ValidationError);

    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            baseRef: "   "
          })
        )
      )
    ).toThrow(ValidationError);

    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            branch: "   "
          })
        )
      )
    ).toThrow(ValidationError);

    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            worktreePath: "   "
          })
        )
      )
    ).toThrow(ValidationError);

    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            session: {
              backend: "   ",
              sessionId: "session-1"
            }
          })
        )
      )
    ).toThrow(ValidationError);

    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            session: {
              backend: "tmux",
              sessionId: "   "
            }
          })
        )
      )
    ).toThrow(ValidationError);

    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            timestamps: {
              createdAt: "   ",
              updatedAt: "2026-03-20T00:00:00.000Z"
            }
          })
        )
      )
    ).toThrow(ValidationError);

    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            timestamps: {
              createdAt: "2026-03-20T00:00:00.000Z",
              updatedAt: "   "
            }
          })
        )
      )
    ).toThrow(ValidationError);
  });

  it("should reject unexpected keys inside the bounded session block", () => {
    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            session: {
              backend: "tmux",
              sessionId: "session-1",
              extra: true
            }
          })
        )
      )
    ).toThrow(ValidationError);
  });

  it("should serialize and parse a valid bounded session block", () => {
    const manifest = createManifest({
      session: {
        backend: "codex-cli",
        sessionId: "session-1"
      }
    });

    expect(parseManifestContents(serializeManifest(manifest))).toEqual(manifest);
  });

  it("should serialize and parse valid source metadata", () => {
    const manifest = createManifest({
      sourceKind: "fork",
      parentAttemptId: "att_parent"
    });

    expect(parseManifestContents(serializeManifest(manifest))).toEqual(manifest);
  });

  it("should require schemaVersion", () => {
    expect(() =>
      parseManifestContents(
        JSON.stringify({
          ...createManifest(),
          schemaVersion: undefined
        })
      )
    ).toThrow(ValidationError);
  });

  it("should reject invalid lineage/source metadata shape", () => {
    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            parentAttemptId: "att_parent"
          })
        )
      )
    ).toThrow(ValidationError);

    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            sourceKind: "direct",
            parentAttemptId: "att_parent"
          })
        )
      )
    ).toThrow(ValidationError);

    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            sourceKind: "resume"
          })
        )
      )
    ).toThrow(ValidationError);

    expect(() =>
      parseManifestContents(
        JSON.stringify(
          createManifest({
            sourceKind: "delegated",
            parentAttemptId: "att_demo"
          })
        )
      )
    ).toThrow(ValidationError);
  });

  it("should write and read a manifest from disk", async () => {
    const rootDir = await createTempDirectory();
    const manifest = createManifest({
      timestamps: {
        createdAt: "2026-03-20T00:00:00.000Z",
        updatedAt: "2026-03-20T00:00:00.000Z"
      }
    });

    const manifestPath = await writeManifest(manifest, { rootDir });
    const savedContents = await readFile(manifestPath, "utf8");

    expect(savedContents).toContain('"attemptId": "att_demo"');
    await expect(readManifest("att_demo", { rootDir })).resolves.toEqual(manifest);
  });

  it("should reject writing manifests whose attemptId is not a single safe path segment", async () => {
    const rootDir = await createTempDirectory();

    await expect(
      writeManifest(createManifest({ attemptId: "../att_escape" }), { rootDir })
    ).rejects.toThrow(ValidationError);
    await expect(
      writeManifest(createManifest({ attemptId: "nested/att_demo" }), { rootDir })
    ).rejects.toThrow(ValidationError);
    await expect(
      writeManifest(createManifest({ attemptId: "   " }), { rootDir })
    ).rejects.toThrow(ValidationError);
    await expect(
      writeManifest(createManifest({ attemptId: "." }), { rootDir })
    ).rejects.toThrow(ValidationError);
    await expect(
      writeManifest(createManifest({ attemptId: ".." }), { rootDir })
    ).rejects.toThrow(ValidationError);
    await expect(
      writeManifest(createManifest({ attemptId: "" }), { rootDir })
    ).rejects.toThrow(ValidationError);
  });

  it("should reject reading manifests whose selector is not a single safe path segment", async () => {
    const rootDir = await createTempDirectory();

    await expect(readManifest("../att_escape", { rootDir })).rejects.toThrow(
      ValidationError
    );
    await expect(readManifest("nested/att_demo", { rootDir })).rejects.toThrow(
      ValidationError
    );
    await expect(readManifest("   ", { rootDir })).rejects.toThrow(
      ValidationError
    );
    await expect(readManifest(".", { rootDir })).rejects.toThrow(
      ValidationError
    );
    await expect(readManifest("..", { rootDir })).rejects.toThrow(
      ValidationError
    );
    await expect(readManifest("", { rootDir })).rejects.toThrow(
      ValidationError
    );
  });

  it("should canonicalize padded attemptId selectors when reading manifests", async () => {
    const rootDir = await createTempDirectory();
    const manifest = createManifest({
      attemptId: "att_padded"
    });

    await writeManifest(manifest, { rootDir });

    await expect(readManifest("  att_padded  ", { rootDir })).resolves.toEqual(
      manifest
    );
  });

  it("should reject invalid manifests before writing them", async () => {
    const rootDir = await createTempDirectory();

    await expect(
      writeManifest(
        {
          ...createManifest(),
          schemaVersion: undefined as unknown as string
        },
        { rootDir }
      )
    ).rejects.toThrow(ValidationError);
  });

  it("should reject invalid verification payloads before writing them", async () => {
    const rootDir = await createTempDirectory();

    await expect(
      writeManifest(
          createManifest({
            verification: {
              state: "PASS" as never,
              checks: []
            }
          }),
        { rootDir }
      )
    ).rejects.toThrow(ValidationError);
  });

  it("should reject manifests whose supportTier is outside the current vocabulary before writing them", async () => {
    const rootDir = await createTempDirectory();

    await expect(
      writeManifest(
        createManifest({
          supportTier: "gold" as never
        }),
        { rootDir }
      )
    ).rejects.toThrow(ValidationError);
  });

  it("should list manifests from the store", async () => {
    const rootDir = await createTempDirectory();
    await writeManifest(createManifest({ attemptId: "att_b" }), { rootDir });
    await writeManifest(createManifest({ attemptId: "att_a" }), { rootDir });

    await expect(listManifests({ rootDir })).resolves.toEqual([
      expect.objectContaining({ attemptId: "att_a" }),
      expect.objectContaining({ attemptId: "att_b" })
    ]);
  });

  it("should fail listing when an attempt directory contains an invalid manifest", async () => {
    const rootDir = await createTempDirectory();
    const attemptDirectory = path.join(rootDir, "att_invalid");

    await mkdir(attemptDirectory, { recursive: true });
    await writeFile(
      path.join(attemptDirectory, "manifest.json"),
      JSON.stringify({ attemptId: "att_invalid" }),
      "utf8"
    );

    await expect(listManifests({ rootDir })).rejects.toThrow(InvalidManifestError);
  });

  it("should fail listing when an attempt directory is missing manifest.json", async () => {
    const rootDir = await createTempDirectory();
    await mkdir(path.join(rootDir, "att_empty"), { recursive: true });

    await expect(listManifests({ rootDir })).rejects.toThrow(InvalidManifestError);
  });

  it("should reject a manifest whose internal attemptId does not match its directory", async () => {
    const rootDir = await createTempDirectory();
    const attemptDirectory = path.join(rootDir, "att_expected");

    await mkdir(attemptDirectory, { recursive: true });
    await writeFile(
      path.join(attemptDirectory, "manifest.json"),
      serializeManifest(createManifest({ attemptId: "att_other" })),
      "utf8"
    );

    await expect(readManifest("att_expected", { rootDir })).rejects.toThrow(
      InvalidManifestError
    );
  });

  it("should raise InvalidManifestError when reading an invalid manifest from disk", async () => {
    const rootDir = await createTempDirectory();
    const attemptDirectory = path.join(rootDir, "att_invalid_read");

    await mkdir(attemptDirectory, { recursive: true });
    await writeFile(
      path.join(attemptDirectory, "manifest.json"),
      JSON.stringify({ attemptId: "att_invalid_read" }),
      "utf8"
    );

    await expect(readManifest("att_invalid_read", { rootDir })).rejects.toThrow(
      InvalidManifestError
    );
  });

  it("should raise InvalidManifestError when reading a persisted manifest with an invalid supportTier", async () => {
    const rootDir = await createTempDirectory();
    const attemptDirectory = path.join(rootDir, "att_invalid_support_tier");

    await mkdir(attemptDirectory, { recursive: true });
    await writeFile(
      path.join(attemptDirectory, "manifest.json"),
      JSON.stringify({
        ...createManifest({
          attemptId: "att_invalid_support_tier"
        }),
        supportTier: "gold"
      }),
      "utf8"
    );

    await expect(
      readManifest("att_invalid_support_tier", { rootDir })
    ).rejects.toThrow(InvalidManifestError);
  });

  it("should raise InvalidManifestError when reading or listing a persisted manifest with an invalid verification state", async () => {
    const rootDir = await createTempDirectory();
    const attemptDirectory = path.join(rootDir, "att_invalid_verification_state");

    await mkdir(attemptDirectory, { recursive: true });
    await writeFile(
      path.join(attemptDirectory, "manifest.json"),
      JSON.stringify({
        ...createManifest({
          attemptId: "att_invalid_verification_state"
        }),
        verification: {
          state: "legacy_pending",
          checks: []
        }
      }),
      "utf8"
    );

    await expect(
      readManifest("att_invalid_verification_state", { rootDir })
    ).rejects.toThrow(InvalidManifestError);
    await expect(listManifests({ rootDir })).rejects.toThrow(InvalidManifestError);
  });

  it("should return an empty list when the manifest store does not exist", async () => {
    const rootDir = await createTempDirectory();
    const nonexistentRoot = path.join(rootDir, "missing");

    await expect(listManifests({ rootDir: nonexistentRoot })).resolves.toEqual([]);
  });

  it("should raise not found when a manifest does not exist", async () => {
    const rootDir = await createTempDirectory();

    await expect(readManifest("att_missing", { rootDir })).rejects.toThrow(
      NotFoundError
    );
  });
});
