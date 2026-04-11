import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveAttemptVerificationPayload,
  deriveAttemptVerificationSummary
} from "../../src/verification/internal.js";
import type {
  AttemptVerificationCheckInput,
  AttemptVerificationPayloadInput
} from "../../src/verification/internal.js";

describe("verification payload ingestion helpers", () => {
  it("should derive a stable pending payload for empty input", () => {
    expect(deriveAttemptVerificationPayload({})).toEqual({
      state: "pending",
      checks: []
    });
  });

  it("should normalize valid checks and preserve order", () => {
    expect(
      deriveAttemptVerificationPayload({
        state: "failed",
        checks: [
          {
            name: " lint ",
            status: "passed",
            required: true
          },
          {
            name: "unit",
            status: "failed"
          },
          {
            name: "docs",
            status: "skipped",
            required: false
          }
        ]
      })
    ).toEqual({
      state: "failed",
      checks: [
        {
          name: "lint",
          status: "passed",
          required: true
        },
        {
          name: "unit",
          status: "failed",
          required: false
        },
        {
          name: "docs",
          status: "skipped",
          required: false
        }
      ]
    });
  });

  it("should trim and preserve unknown non-empty states for internal ingest", () => {
    const payload = deriveAttemptVerificationPayload({
      state: " legacy_pending ",
      checks: [
        {
          name: "lint",
          status: "passed",
          required: true
        }
      ]
    });

    expect(payload).toEqual({
      state: "legacy_pending",
      checks: [
        {
          name: "lint",
          status: "passed",
          required: true
        }
      ]
    });
    expect(deriveAttemptVerificationSummary(payload)).toMatchObject({
      sourceState: "legacy_pending",
      overallOutcome: "passed",
      requiredOutcome: "satisfied",
      hasComparablePayload: true,
      isSelectionReady: true
    });
  });

  it("should produce payloads that remain directly consumable by the summary helper", () => {
    const payload = deriveAttemptVerificationPayload({
      checks: [
        {
          name: "lint",
          status: "passed",
          required: true
        },
        {
          name: "unit",
          status: "error"
        }
      ]
    });

    expect(deriveAttemptVerificationSummary(payload)).toEqual({
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

  it("should reject blank states and malformed checks loudly", () => {
    expect(() =>
      deriveAttemptVerificationPayload({
        state: "   "
      } as unknown as AttemptVerificationPayloadInput)
    ).toThrow(ValidationError);

    for (const invalidCheck of [
      {
        status: "passed"
      },
      {
        name: "lint",
        status: "unknown"
      },
      {
        name: "lint",
        status: "passed",
        required: "yes"
      }
    ]) {
      expect(() =>
        deriveAttemptVerificationPayload({
          checks: [invalidCheck]
        } as unknown as AttemptVerificationPayloadInput)
      ).toThrow(ValidationError);
    }
  });

  it("should not mutate the supplied ingestion input", () => {
    const input = {
      state: "pending",
      checks: [
        Object.freeze({
          name: " lint ",
          status: "passed",
          required: true
        }),
        Object.freeze({
          name: "docs",
          status: "pending"
        })
      ]
    } satisfies AttemptVerificationPayloadInput;
    const snapshot = structuredClone(input);

    expect(() => deriveAttemptVerificationPayload(input)).not.toThrow();
    expect(input).toEqual(snapshot);
  });

  it("should reject blank check names even when typed as valid inputs", () => {
    const input = {
      checks: [
        {
          name: "   ",
          status: "passed"
        }
      ]
    } as unknown as AttemptVerificationPayloadInput;

    expect(() => deriveAttemptVerificationPayload(input)).toThrow(ValidationError);
  });
});
