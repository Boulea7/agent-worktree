import { describe, expect, expectTypeOf, it } from "vitest";

import * as manifest from "../../src/manifest/index.js";
import type {
  AttemptManifest,
  AttemptSourceKind,
  AttemptStatus
} from "../../src/manifest/index.js";

describe("manifest index exports", () => {
  it("should keep the default manifest barrel aligned with the current public contract", () => {
    type ManifestIndexExports = {
      attemptManifest: AttemptManifest;
      attemptSourceKind: AttemptSourceKind;
      attemptStatus: AttemptStatus;
    };

    expectTypeOf<ManifestIndexExports>().not.toBeAny();
    expect(Object.keys(manifest).sort()).toEqual(
      [
        "DEFAULT_MANIFEST_SCHEMA_VERSION",
        "attemptManifestSchema",
        "attemptSourceKinds",
        "getManifestDirectory",
        "getManifestPath",
        "listManifests",
        "parseAttemptManifest",
        "parseManifestContents",
        "readManifest",
        "serializeManifest",
        "writeManifest"
      ].sort()
    );
  });
});

// @ts-expect-error manifest index must not export verification ingest types
type ManifestIndexShouldNotExportAttemptVerification = import("../../src/manifest/index.js").AttemptVerification;

// @ts-expect-error manifest index must not export verification state vocabulary types
type ManifestIndexShouldNotExportAttemptVerificationState = import("../../src/manifest/index.js").AttemptVerificationState;

// @ts-expect-error manifest index must not export verification state value arrays
type ManifestIndexShouldNotExportAttemptVerificationStates = typeof import("../../src/manifest/index.js").attemptVerificationStates;

