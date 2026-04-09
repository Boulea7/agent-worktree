import { describe, expect, expectTypeOf, it } from "vitest";

import * as verification from "../../src/verification/index.js";
import {
  deriveAttemptVerificationSummary,
  type AttemptVerificationCheckStatus,
  type AttemptVerificationCounts,
  type AttemptVerificationOverallOutcome,
  type AttemptVerificationRequiredOutcome,
  type AttemptVerificationSummary
} from "../../src/verification/index.js";

describe("verification index exports", () => {
  it("should continue exporting deriveAttemptVerificationSummary", () => {
    type VerificationIndexExports = {
      attemptVerificationCheckStatus: AttemptVerificationCheckStatus;
      attemptVerificationCounts: AttemptVerificationCounts;
      attemptVerificationOverallOutcome: AttemptVerificationOverallOutcome;
      attemptVerificationRequiredOutcome: AttemptVerificationRequiredOutcome;
      attemptVerificationSummary: AttemptVerificationSummary;
    };

    expectTypeOf<VerificationIndexExports>().not.toBeAny();
    expect(
      deriveAttemptVerificationSummary({
        state: "verified",
        checks: []
      })
    ).toMatchObject({
      sourceState: "verified",
      isSelectionReady: true
    });
  });

  it("should keep the default verification barrel restricted to public runtime exports", () => {
    expect(Object.keys(verification).sort()).toEqual(
      [
        "attemptVerificationCheckStatuses",
        "attemptVerificationOverallOutcomes",
        "attemptVerificationRequiredOutcomes",
        "deriveAttemptVerificationSummary"
      ].sort()
    );
  });
});

// @ts-expect-error verification index must not export comparator helpers
type VerificationIndexShouldNotExportComparator = typeof import("../../src/verification/index.js").compareAttemptVerificationCandidates;

// @ts-expect-error verification index must not export artifact-summary helpers
type VerificationIndexShouldNotExportArtifactSummary = typeof import("../../src/verification/index.js").deriveAttemptVerificationArtifactSummary;

// @ts-expect-error verification index must not export payload-ingestion helpers
type VerificationIndexShouldNotExportPayload = typeof import("../../src/verification/index.js").deriveAttemptVerificationPayload;

// @ts-expect-error verification index must not export execution helpers
type VerificationIndexShouldNotExportExecute = typeof import("../../src/verification/index.js").executeAttemptVerification;

// @ts-expect-error verification index must not export candidate types
type VerificationIndexShouldNotExportCandidate = import("../../src/verification/index.js").AttemptVerificationCandidate;

// @ts-expect-error verification index must not export payload input types
type VerificationIndexShouldNotExportPayloadInput = import("../../src/verification/index.js").AttemptVerificationPayloadInput;

// @ts-expect-error verification index must not export command-check types
type VerificationIndexShouldNotExportCommandCheck = import("../../src/verification/index.js").AttemptVerificationCommandCheck;

// @ts-expect-error verification index must not export check-input types
type VerificationIndexShouldNotExportCheckInput = import("../../src/verification/index.js").AttemptVerificationCheckInput;

// @ts-expect-error verification index must not export executed-check types
type VerificationIndexShouldNotExportExecutedCheck = import("../../src/verification/index.js").AttemptVerificationExecutedCheck;

// @ts-expect-error verification index must not export execution input types
type VerificationIndexShouldNotExportExecutionInput = import("../../src/verification/index.js").AttemptVerificationExecutionInput;

// @ts-expect-error verification index must not export execution result types
type VerificationIndexShouldNotExportExecutionResult = import("../../src/verification/index.js").AttemptVerificationExecutionResult;

// @ts-expect-error verification index must not export artifact-check types
type VerificationIndexShouldNotExportArtifactCheck = import("../../src/verification/index.js").AttemptVerificationArtifactCheck;

// @ts-expect-error verification index must not export artifact-summary types
type VerificationIndexShouldNotExportArtifactSummaryType = import("../../src/verification/index.js").AttemptVerificationArtifactSummary;

// @ts-expect-error verification index must not export control-plane context types
type VerificationIndexShouldNotExportExecutionSessionContext = import("../../src/verification/index.js").ExecutionSessionContext;

// @ts-expect-error verification index must not export selection candidate types
type VerificationIndexShouldNotExportAttemptSelectionCandidate = import("../../src/verification/index.js").AttemptSelectionCandidate;
