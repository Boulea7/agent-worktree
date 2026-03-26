import { describe, expect, it } from "vitest";

import {
  compareAttemptVerificationCandidates,
  deriveAttemptVerificationSummary
} from "../../src/verification/index.js";

describe("verification index exports", () => {
  it("should continue exporting deriveAttemptVerificationSummary", () => {
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

  it("should continue exporting compareAttemptVerificationCandidates", () => {
    expect(
      compareAttemptVerificationCandidates(
        {
          attemptId: "att_a",
          summary: deriveAttemptVerificationSummary({
            state: "verified",
            checks: []
          })
        },
        {
          attemptId: "att_b",
          summary: deriveAttemptVerificationSummary({
            state: "failed",
            checks: [
              {
                name: "lint",
                required: true,
                status: "failed"
              }
            ]
          })
        }
      )
    ).toBeLessThan(0);
  });
});
