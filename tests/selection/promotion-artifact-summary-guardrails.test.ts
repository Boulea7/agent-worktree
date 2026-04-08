import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type { AttemptVerification } from "../../src/manifest/types.js";
import { validatePromotionArtifactSummaryCheckNameLists } from "../../src/selection/promotion-artifact-summary-guardrails.js";
import {
  deriveAttemptVerificationArtifactSummary,
  deriveAttemptVerificationPayload,
  deriveAttemptVerificationSummary,
  type AttemptVerificationArtifactSummary,
  type AttemptVerificationCheckStatus,
  type AttemptVerificationExecutedCheck,
  type AttemptVerificationExecutionResult
} from "../../src/verification/internal.js";

describe("selection promotion-artifact-summary-guardrails helpers", () => {
  it("should accept a canonical artifact summary", () => {
    const checks = [
      createExecutedCheck({
        name: "lint",
        required: true,
        status: "passed"
      }),
      createExecutedCheck({
        name: "unit",
        required: true,
        status: "pending"
      }),
      createExecutedCheck({
        name: "docs",
        required: false,
        status: "skipped"
      })
    ];
    const verification = createVerification(checks);
    const artifactSummary = createArtifactSummary(checks, verification);

    expect(() =>
      validatePromotionArtifactSummaryCheckNameLists({
        artifactSummary,
        errorPrefix: "Attempt promotion candidate requires",
        summaryField: "artifactSummary",
        verification
      })
    ).not.toThrow();
  });

  it("should reject drift in canonical check-name lists", () => {
    const checks = [
      createExecutedCheck({
        name: "lint",
        required: true,
        status: "failed"
      }),
      createExecutedCheck({
        name: "unit",
        required: true,
        status: "pending"
      }),
      createExecutedCheck({
        name: "docs",
        required: false,
        status: "skipped"
      }),
      createExecutedCheck({
        name: "smoke",
        required: false,
        status: "passed"
      })
    ];
    const verification = createVerification(checks);
    const baseSummary = createArtifactSummary(checks, verification);
    const fieldNames = [
      "blockingRequiredCheckNames",
      "failedOrErrorCheckNames",
      "pendingCheckNames",
      "skippedCheckNames",
      "passedCheckNames"
    ] as const;

    for (const fieldName of fieldNames) {
      const artifactSummary = {
        ...baseSummary,
        [fieldName]: ["shadow"]
      } satisfies AttemptVerificationArtifactSummary;

      expect(() =>
        validatePromotionArtifactSummaryCheckNameLists({
          artifactSummary,
          errorPrefix: "Attempt promotion candidate requires",
          summaryField: "artifactSummary"
        })
      ).toThrow(
        `Attempt promotion candidate requires artifactSummary.${fieldName} to match artifactSummary.checks.`
      );
    }
  });

  it("should reject a summary that does not match the canonical summary derived from checks", () => {
    const checks = [
      createExecutedCheck({
        name: "lint",
        required: true,
        status: "passed"
      })
    ];
    const verification = createVerification(checks);
    const artifactSummary = {
      ...createArtifactSummary(checks, verification),
      summary: {
        ...deriveAttemptVerificationSummary(verification),
        overallOutcome: "failed"
      }
    } satisfies AttemptVerificationArtifactSummary;

    expect(() =>
      validatePromotionArtifactSummaryCheckNameLists({
        artifactSummary,
        errorPrefix: "Attempt promotion candidate requires",
        summaryField: "artifactSummary"
      })
    ).toThrow(
      "Attempt promotion candidate requires artifactSummary.summary to match the summary derived from artifactSummary.checks."
    );
  });

  it("should reject artifact summaries that drift from manifest.verification.checks", () => {
    const checks = [
      createExecutedCheck({
        name: "lint",
        required: true,
        status: "passed"
      })
    ];
    const verification = createVerification(checks);
    const artifactSummary = createArtifactSummary(checks, verification);
    const mismatchedVerification: AttemptVerification = {
      ...verification,
      checks: [
        {
          name: "lint",
          required: true,
          status: "failed"
        }
      ]
    };

    expect(() =>
      validatePromotionArtifactSummaryCheckNameLists({
        artifactSummary,
        errorPrefix: "Attempt promotion candidate requires",
        summaryField: "artifactSummary",
        verification: mismatchedVerification
      })
    ).toThrow(
      "Attempt promotion candidate requires artifactSummary.checks to match manifest.verification.checks."
    );
  });
});

function createArtifactSummary(
  checks: readonly AttemptVerificationExecutedCheck[],
  verification: AttemptVerification
): AttemptVerificationArtifactSummary {
  return deriveAttemptVerificationArtifactSummary(
    createExecutionResult(checks, verification)
  );
}

function createExecutionResult(
  checks: readonly AttemptVerificationExecutedCheck[],
  verification: AttemptVerification
): AttemptVerificationExecutionResult {
  return {
    checks: [...checks],
    verification,
    summary: deriveAttemptVerificationSummary(verification)
  };
}

function createVerification(
  checks: readonly AttemptVerificationExecutedCheck[]
): AttemptVerification {
  return deriveAttemptVerificationPayload({
    state: deriveVerificationState(checks),
    checks: checks.map((check) => ({
      name: check.name,
      required: check.required,
      status: check.status
    }))
  });
}

function createExecutedCheck(input: {
  name: string;
  required: boolean;
  status: AttemptVerificationCheckStatus;
}): AttemptVerificationExecutedCheck {
  const executionMetadata =
    input.status === "passed"
      ? { exitCode: 0 }
      : input.status === "failed"
        ? { exitCode: 1 }
        : {};

  return {
    name: input.name,
    required: input.required,
    status: input.status,
    ...executionMetadata
  };
}

function deriveVerificationState(
  checks: readonly AttemptVerificationExecutedCheck[]
): string {
  if (checks.some((check) => check.status === "failed" || check.status === "error")) {
    return "failed";
  }

  if (checks.some((check) => check.status === "pending")) {
    return "pending";
  }

  return "passed";
}
