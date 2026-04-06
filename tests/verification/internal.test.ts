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
