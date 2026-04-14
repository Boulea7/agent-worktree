import { describe, expectTypeOf, it } from "vitest";

import type {
  AttemptManifest,
  AttemptVerification,
  AttemptVerificationState
} from "../../src/manifest/types.js";

describe("manifest exported types", () => {
  it("should keep runtime and support-tier fields aligned with the current vocabularies while leaving AttemptVerification as a wider ingest shape", () => {
    type ManifestExports = {
      attemptManifest: AttemptManifest;
      attemptVerification: AttemptVerification;
      attemptVerificationState: AttemptVerificationState;
    };

    expectTypeOf<ManifestExports>().not.toBeAny();
    expectTypeOf<AttemptManifest["runtime"]>().toEqualTypeOf<
      | "claude-code"
      | "codex-cli"
      | "gemini-cli"
      | "opencode"
      | "openclaw"
      | "other-cli"
    >();
    expectTypeOf<AttemptManifest["supportTier"]>().toEqualTypeOf<
      "tier1" | "experimental" | undefined
    >();
    expectTypeOf<AttemptVerificationState>().toEqualTypeOf<
      "pending" | "passed" | "verified" | "failed" | "error"
    >();
    expectTypeOf<AttemptVerification["state"]>().toEqualTypeOf<string>();
  });
});

const validManifest = {
  schemaVersion: "0.x",
  attemptId: "att_types",
  taskId: "task_types",
  runtime: "codex-cli",
  supportTier: "tier1",
  adapter: "subprocess",
  status: "created",
  verification: {
    state: "pending",
    checks: []
  }
} satisfies AttemptManifest;

const validVerification = {
  state: "verified" as AttemptVerificationState,
  checks: []
} satisfies AttemptVerification;

expectTypeOf(validManifest).toMatchTypeOf<AttemptManifest>();
expectTypeOf(validVerification.state).toEqualTypeOf<AttemptVerificationState>();

const invalidManifestRuntime: AttemptManifest = {
  ...validManifest,
  // @ts-expect-error AttemptManifest runtime must stay within the current runtime vocabulary
  runtime: "future-runtime"
};

const invalidVerificationState = {
  ...validVerification,
  // @ts-expect-error AttemptVerificationState must stay within the current public vocabulary
  state: "PASS"
} satisfies { state: AttemptVerificationState };

const invalidManifestSupportTier: AttemptManifest = {
  ...validManifest,
  // @ts-expect-error AttemptManifest supportTier must stay within the current support-tier vocabulary
  supportTier: "gold"
};
