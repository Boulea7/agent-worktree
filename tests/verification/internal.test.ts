import { describe, expect, expectTypeOf, it } from "vitest";

import * as verification from "../../src/verification/internal.js";
import type {
  AttemptVerificationArtifactSummary,
  AttemptVerificationCandidate,
  AttemptVerificationExecutionInput,
  AttemptVerificationExecutionResult,
  AttemptVerificationPayloadInput,
  AttemptVerificationSummary
} from "../../src/verification/internal.js";

describe("verification internal exports", () => {
  it("should keep the current internal verification runtime export inventory explicit", () => {
    expect(Object.keys(verification).sort()).toEqual(
      [
        "attemptVerificationCheckStatuses",
        "attemptVerificationOverallOutcomes",
        "attemptVerificationRequiredOutcomes",
        "compareAttemptVerificationCandidates",
        "deriveAttemptVerificationArtifactSummary",
        "deriveAttemptVerificationPayload",
        "deriveAttemptVerificationSummary",
        "executeAttemptVerification"
      ].sort()
    );
  });

  it("should keep verification internals free of unrelated control-plane and selection helpers", () => {
    expect(verification).not.toHaveProperty("buildExecutionSessionIndex");
    expect(verification).not.toHaveProperty("consumeExecutionSessionWait");
    expect(verification).not.toHaveProperty("deriveAttemptSelectionCandidate");
    expect(verification).not.toHaveProperty("deriveAttemptPromotionReport");
  });

  it("should continue exporting representative internal verification types", () => {
    type VerificationInternalExports = {
      candidate: AttemptVerificationCandidate;
      payloadInput: AttemptVerificationPayloadInput;
      executionInput: AttemptVerificationExecutionInput;
      executionResult: AttemptVerificationExecutionResult;
      artifactSummary: AttemptVerificationArtifactSummary;
      summary: AttemptVerificationSummary;
    };

    expectTypeOf<VerificationInternalExports>().not.toBeAny();
  });
});

// @ts-expect-error verification internal barrel must not export control-plane record types
type VerificationInternalShouldNotExportExecutionSessionRecord = import("../../src/verification/internal.js").ExecutionSessionRecord;

// @ts-expect-error verification internal barrel must not export control-plane context types
type VerificationInternalShouldNotExportExecutionSessionContext = import("../../src/verification/internal.js").ExecutionSessionContext;

// @ts-expect-error verification internal barrel must not export selection candidate types
type VerificationInternalShouldNotExportSelectionCandidate = import("../../src/verification/internal.js").AttemptSelectionCandidate;

// @ts-expect-error verification internal barrel must not export handoff decision summary types
type VerificationInternalShouldNotExportHandoffDecisionSummary = import("../../src/verification/internal.js").AttemptHandoffDecisionSummary;

// @ts-expect-error verification internal barrel must not export control-plane helpers
type VerificationInternalShouldNotExportControlPlaneHelper = typeof import("../../src/verification/internal.js").buildExecutionSessionIndex;

// @ts-expect-error verification internal barrel must not export selection helpers
type VerificationInternalShouldNotExportSelectionHelper = typeof import("../../src/verification/internal.js").deriveAttemptSelectionCandidate;
