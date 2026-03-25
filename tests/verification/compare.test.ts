import { describe, expect, it } from "vitest";

import type {
  AttemptVerificationCandidate,
  AttemptVerificationCounts,
  AttemptVerificationSummary
} from "../../src/verification/internal.js";
import { compareAttemptVerificationCandidates } from "../../src/verification/internal.js";

describe("verification selection helpers", () => {
  it("should prefer a selection-ready candidate over a non-ready candidate", () => {
    expect(
      compareAttemptVerificationCandidates(
        createCandidate("att_ready", {
          overallOutcome: "passed",
          requiredOutcome: "satisfied",
          isSelectionReady: true
        }),
        createCandidate("att_pending", {
          overallOutcome: "pending",
          requiredOutcome: "pending"
        })
      )
    ).toBeLessThan(0);
  });

  it("should prefer a comparable payload over an incomplete payload", () => {
    expect(
      compareAttemptVerificationCandidates(
        createCandidate("att_comparable", {
          overallOutcome: "pending",
          requiredOutcome: "pending",
          hasComparablePayload: true
        }),
        createCandidate("att_incomplete", {
          overallOutcome: "incomplete",
          requiredOutcome: "incomplete",
          hasComparablePayload: false,
          hasInvalidChecks: true,
          counts: {
            invalid: 1
          }
        })
      )
    ).toBeLessThan(0);
  });

  it("should prefer a stronger required outcome before looking at overall outcome", () => {
    expect(
      compareAttemptVerificationCandidates(
        createCandidate("att_required_ok", {
          overallOutcome: "failed",
          requiredOutcome: "satisfied",
          counts: {
            error: 1
          }
        }),
        createCandidate("att_required_pending", {
          overallOutcome: "passed",
          requiredOutcome: "pending"
        })
      )
    ).toBeLessThan(0);
  });

  it("should prefer a stronger overall outcome when the required outcome is tied", () => {
    expect(
      compareAttemptVerificationCandidates(
        createCandidate("att_passed", {
          overallOutcome: "passed",
          requiredOutcome: "satisfied",
          counts: {
            passed: 2,
            required: 1,
            optional: 1,
            total: 2,
            valid: 2
          },
          isSelectionReady: true
        }),
        createCandidate("att_pending", {
          overallOutcome: "pending",
          requiredOutcome: "satisfied",
          counts: {
            pending: 1,
            required: 1,
            total: 1,
            valid: 1
          }
        })
      )
    ).toBeLessThan(0);
  });

  it("should prefer fewer failed and error checks when outcomes are otherwise tied", () => {
    expect(
      compareAttemptVerificationCandidates(
        createCandidate("att_fewer_failures", {
          overallOutcome: "failed",
          requiredOutcome: "failed",
          counts: {
            failed: 1,
            error: 0
          }
        }),
        createCandidate("att_more_failures", {
          overallOutcome: "failed",
          requiredOutcome: "failed",
          counts: {
            failed: 1,
            error: 1
          }
        })
      )
    ).toBeLessThan(0);
  });

  it("should prefer fewer pending checks when failure counts are tied", () => {
    expect(
      compareAttemptVerificationCandidates(
        createCandidate("att_less_pending", {
          overallOutcome: "pending",
          requiredOutcome: "pending",
          counts: {
            pending: 1
          }
        }),
        createCandidate("att_more_pending", {
          overallOutcome: "pending",
          requiredOutcome: "pending",
          counts: {
            pending: 2,
            total: 2,
            valid: 2
          }
        })
      )
    ).toBeLessThan(0);
  });

  it("should prefer fewer invalid checks when earlier dimensions are tied", () => {
    expect(
      compareAttemptVerificationCandidates(
        createCandidate("att_less_invalid", {
          overallOutcome: "incomplete",
          requiredOutcome: "incomplete",
          hasComparablePayload: false,
          hasInvalidChecks: true,
          counts: {
            invalid: 1
          }
        }),
        createCandidate("att_more_invalid", {
          overallOutcome: "incomplete",
          requiredOutcome: "incomplete",
          hasComparablePayload: false,
          hasInvalidChecks: true,
          counts: {
            invalid: 2,
            total: 2
          }
        })
      )
    ).toBeLessThan(0);
  });

  it("should prefer more passed checks when all penalties are tied", () => {
    expect(
      compareAttemptVerificationCandidates(
        createCandidate("att_more_passed", {
          overallOutcome: "passed",
          requiredOutcome: "satisfied",
          counts: {
            total: 3,
            valid: 3,
            required: 1,
            optional: 2,
            passed: 3
          },
          isSelectionReady: true
        }),
        createCandidate("att_less_passed", {
          overallOutcome: "passed",
          requiredOutcome: "satisfied",
          counts: {
            total: 2,
            valid: 2,
            required: 1,
            optional: 1,
            passed: 2
          },
          isSelectionReady: true
        })
      )
    ).toBeLessThan(0);
  });

  it("should fall back to attemptId ordering for a deterministic final tie-break", () => {
    expect(
      compareAttemptVerificationCandidates(
        createCandidate("att_a"),
        createCandidate("att_b")
      )
    ).toBeLessThan(0);
  });

  it("should not mutate the supplied candidates", () => {
    const left = Object.freeze(createCandidate("att_left"));
    const right = Object.freeze(
      createCandidate("att_right", {
        overallOutcome: "pending",
        requiredOutcome: "pending",
        isSelectionReady: false,
        counts: {
          pending: 1,
          total: 1,
          valid: 1,
          optional: 1
        }
      })
    );

    const leftSnapshot = structuredClone(left);
    const rightSnapshot = structuredClone(right);

    expect(() =>
      compareAttemptVerificationCandidates(left, right)
    ).not.toThrow();
    expect(left).toEqual(leftSnapshot);
    expect(right).toEqual(rightSnapshot);
  });
});

function createCandidate(
  attemptId: string,
  overrides: AttemptVerificationSummaryOverrides = {}
): AttemptVerificationCandidate {
  return {
    attemptId,
    summary: createSummary(overrides)
  };
}

function createSummary(
  overrides: AttemptVerificationSummaryOverrides = {}
): AttemptVerificationSummary {
  const { counts: countOverrides, ...summaryOverrides } = overrides;

  return {
    sourceState: "verified",
    overallOutcome: "passed",
    requiredOutcome: "satisfied",
    counts: {
      total: 1,
      valid: 1,
      invalid: 0,
      required: 1,
      optional: 0,
      passed: 1,
      failed: 0,
      pending: 0,
      skipped: 0,
      error: 0,
      ...countOverrides
    },
    hasInvalidChecks: false,
    hasComparablePayload: true,
    isSelectionReady: true,
    ...summaryOverrides
  };
}

interface AttemptVerificationSummaryOverrides
  extends Omit<Partial<AttemptVerificationSummary>, "counts"> {
  counts?: Partial<AttemptVerificationCounts>;
}
