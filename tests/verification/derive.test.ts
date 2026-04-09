import { describe, expect, it } from "vitest";

import type { AttemptVerification } from "../../src/manifest/types.js";
import { deriveAttemptVerificationSummary } from "../../src/verification/internal.js";

describe("verification aggregation helpers", () => {
  it("should derive a stable pending summary for a fresh attempt payload", () => {
    expect(
      deriveAttemptVerificationSummary({
        state: "pending",
        checks: []
      })
    ).toEqual({
      sourceState: "pending",
      overallOutcome: "incomplete",
      requiredOutcome: "incomplete",
      counts: {
        total: 0,
        valid: 0,
        invalid: 0,
        required: 0,
        optional: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        skipped: 0,
        error: 0
      },
      hasInvalidChecks: false,
      hasComparablePayload: false,
      isSelectionReady: false
    });
  });

  it("should satisfy required checks when every required check passes", () => {
    expect(
      deriveAttemptVerificationSummary({
        state: "pending",
        checks: [
          {
            name: "lint",
            status: "passed",
            required: true
          },
          {
            name: "unit",
            status: "passed",
            required: true
          },
          {
            name: "coverage",
            status: "skipped"
          }
        ]
      })
    ).toEqual({
      sourceState: "pending",
      overallOutcome: "passed",
      requiredOutcome: "satisfied",
      counts: {
        total: 3,
        valid: 3,
        invalid: 0,
        required: 2,
        optional: 1,
        passed: 2,
        failed: 0,
        pending: 0,
        skipped: 1,
        error: 0
      },
      hasInvalidChecks: false,
      hasComparablePayload: true,
      isSelectionReady: true
    });
  });

  it("should fail the required outcome when a required check fails", () => {
    expect(
      deriveAttemptVerificationSummary({
        state: "pending",
        checks: [
          {
            name: "lint",
            status: "failed",
            required: true
          },
          {
            name: "docs",
            status: "passed"
          }
        ]
      })
    ).toEqual({
      sourceState: "pending",
      overallOutcome: "failed",
      requiredOutcome: "failed",
      counts: {
        total: 2,
        valid: 2,
        invalid: 0,
        required: 1,
        optional: 1,
        passed: 1,
        failed: 1,
        pending: 0,
        skipped: 0,
        error: 0
      },
      hasInvalidChecks: false,
      hasComparablePayload: true,
      isSelectionReady: false
    });
  });

  it("should keep required checks pending when a required check is still pending", () => {
    expect(
      deriveAttemptVerificationSummary({
        state: "pending",
        checks: [
          {
            name: "lint",
            status: "passed",
            required: true
          },
          {
            name: "unit",
            status: "pending",
            required: true
          },
          {
            name: "docs",
            status: "skipped"
          }
        ]
      })
    ).toEqual({
      sourceState: "pending",
      overallOutcome: "pending",
      requiredOutcome: "pending",
      counts: {
        total: 3,
        valid: 3,
        invalid: 0,
        required: 2,
        optional: 1,
        passed: 1,
        failed: 0,
        pending: 1,
        skipped: 1,
        error: 0
      },
      hasInvalidChecks: false,
      hasComparablePayload: true,
      isSelectionReady: false
    });
  });

  it("should fail the required outcome when a required check is skipped", () => {
    expect(
      deriveAttemptVerificationSummary({
        state: "pending",
        checks: [
          {
            name: "lint",
            status: "skipped",
            required: true
          },
          {
            name: "docs",
            status: "passed"
          }
        ]
      })
    ).toEqual({
      sourceState: "pending",
      overallOutcome: "failed",
      requiredOutcome: "failed",
      counts: {
        total: 2,
        valid: 2,
        invalid: 0,
        required: 1,
        optional: 1,
        passed: 1,
        failed: 0,
        pending: 0,
        skipped: 1,
        error: 0
      },
      hasInvalidChecks: false,
      hasComparablePayload: true,
      isSelectionReady: false
    });
  });

  it("should keep required checks satisfied when only optional checks fail", () => {
    expect(
      deriveAttemptVerificationSummary({
        state: "pending",
        checks: [
          {
            name: "unit",
            status: "passed",
            required: true
          },
          {
            name: "e2e",
            status: "error"
          }
        ]
      })
    ).toEqual({
      sourceState: "pending",
      overallOutcome: "failed",
      requiredOutcome: "satisfied",
      counts: {
        total: 2,
        valid: 2,
        invalid: 0,
        required: 1,
        optional: 1,
        passed: 1,
        failed: 0,
        pending: 0,
        skipped: 0,
        error: 1
      },
      hasInvalidChecks: false,
      hasComparablePayload: true,
      isSelectionReady: false
    });
  });

  it("should mark the payload incomplete when any check entry is malformed", () => {
    expect(
      deriveAttemptVerificationSummary({
        state: "pending",
        checks: [
          {
            name: "lint",
            status: "passed",
            required: true
          },
          {
            status: "passed"
          }
        ]
      })
    ).toEqual({
      sourceState: "pending",
      overallOutcome: "incomplete",
      requiredOutcome: "incomplete",
      counts: {
        total: 2,
        valid: 1,
        invalid: 1,
        required: 1,
        optional: 0,
        passed: 1,
        failed: 0,
        pending: 0,
        skipped: 0,
        error: 0
      },
      hasInvalidChecks: true,
      hasComparablePayload: false,
      isSelectionReady: false
    });
  });

  it("should treat an invalid required flag as an incomplete payload", () => {
    expect(
      deriveAttemptVerificationSummary({
        state: "pending",
        checks: [
          {
            name: "lint",
            status: "passed",
            required: "yes"
          }
        ]
      })
    ).toEqual({
      sourceState: "pending",
      overallOutcome: "incomplete",
      requiredOutcome: "incomplete",
      counts: {
        total: 1,
        valid: 0,
        invalid: 1,
        required: 0,
        optional: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        skipped: 0,
        error: 0
      },
      hasInvalidChecks: true,
      hasComparablePayload: false,
      isSelectionReady: false
    });
  });

  it("should use the coarse verification state as a fallback when no valid checks exist", () => {
    expect(
      deriveAttemptVerificationSummary({
        state: "verified",
        checks: []
      })
    ).toEqual({
      sourceState: "verified",
      overallOutcome: "incomplete",
      requiredOutcome: "incomplete",
      counts: {
        total: 0,
        valid: 0,
        invalid: 0,
        required: 0,
        optional: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        skipped: 0,
        error: 0
      },
      hasInvalidChecks: false,
      hasComparablePayload: false,
      isSelectionReady: false
    });
  });

  it("should keep zero-check failed states incomplete instead of comparable", () => {
    expect(
      deriveAttemptVerificationSummary({
        state: "failed",
        checks: []
      })
    ).toEqual({
      sourceState: "failed",
      overallOutcome: "incomplete",
      requiredOutcome: "incomplete",
      counts: {
        total: 0,
        valid: 0,
        invalid: 0,
        required: 0,
        optional: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        skipped: 0,
        error: 0
      },
      hasInvalidChecks: false,
      hasComparablePayload: false,
      isSelectionReady: false
    });
  });

  it("should treat an unknown fallback state as incomplete when no valid checks exist", () => {
    expect(
      deriveAttemptVerificationSummary({
        state: "mystery",
        checks: []
      })
    ).toEqual({
      sourceState: "mystery",
      overallOutcome: "incomplete",
      requiredOutcome: "incomplete",
      counts: {
        total: 0,
        valid: 0,
        invalid: 0,
        required: 0,
        optional: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        skipped: 0,
        error: 0
      },
      hasInvalidChecks: false,
      hasComparablePayload: false,
      isSelectionReady: false
    });
  });

  it("should not mutate the input verification payload", () => {
    const verification = {
      state: "pending",
      checks: [
        Object.freeze({
          name: "lint",
          status: "passed",
          required: true
        }),
        Object.freeze({
          name: "unit",
          status: "pending"
        })
      ]
    } satisfies AttemptVerification;

    const snapshot = structuredClone(verification);

    expect(() => deriveAttemptVerificationSummary(verification)).not.toThrow();
    expect(verification).toEqual(snapshot);
  });
});
