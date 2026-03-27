import { ValidationError } from "../core/errors.js";
import type { AttemptVerification } from "../manifest/types.js";
import { deriveAttemptVerificationSummary } from "./derive.js";
import {
  attemptVerificationCheckStatuses,
  type AttemptVerificationArtifactCheck,
  type AttemptVerificationArtifactSummary,
  type AttemptVerificationCheckStatus,
  type AttemptVerificationCounts,
  type AttemptVerificationExecutedCheck,
  type AttemptVerificationExecutionResult,
  type AttemptVerificationSummary
} from "./types.js";

const ATTEMPT_VERIFICATION_ARTIFACT_SUMMARY_BASIS = "verification_execution" as const;
const validStatuses = new Set<AttemptVerificationCheckStatus>(
  attemptVerificationCheckStatuses
);

interface NormalizedArtifactCheck {
  exitCode?: number;
  failureKind?: string;
  name: string;
  required: boolean;
  status: AttemptVerificationCheckStatus;
}

export function deriveAttemptVerificationArtifactSummary(
  result: AttemptVerificationExecutionResult
): AttemptVerificationArtifactSummary {
  const summary = deriveAttemptVerificationSummary(result.verification);

  validateSummaryConsistency(result.summary, summary);

  const checks = deriveArtifactChecks(result.checks, result.verification);

  return {
    summaryBasis: ATTEMPT_VERIFICATION_ARTIFACT_SUMMARY_BASIS,
    summary,
    checks,
    blockingRequiredCheckNames: collectCheckNames(
      checks,
      (check) =>
        check.required &&
        (check.status === "failed" ||
          check.status === "error" ||
          check.status === "pending" ||
          check.status === "skipped")
    ),
    failedOrErrorCheckNames: collectCheckNames(
      checks,
      (check) => check.status === "failed" || check.status === "error"
    ),
    pendingCheckNames: collectCheckNames(
      checks,
      (check) => check.status === "pending"
    ),
    skippedCheckNames: collectCheckNames(
      checks,
      (check) => check.status === "skipped"
    ),
    passedCheckNames: collectCheckNames(
      checks,
      (check) => check.status === "passed"
    ),
    recommendedForPromotion: summary.isSelectionReady
  };
}

function deriveArtifactChecks(
  executedChecks: readonly AttemptVerificationExecutedCheck[],
  verification: AttemptVerification
): AttemptVerificationArtifactCheck[] {
  if (executedChecks.length !== verification.checks.length) {
    throw new ValidationError(
      "Verification artifact summary requires result.checks and verification.checks to have the same length."
    );
  }

  return executedChecks.map((check, index) => {
    const normalizedExecutedCheck = normalizeExecutedCheck(check, index);
    const normalizedVerificationCheck = normalizeVerificationCheck(
      verification.checks[index],
      index
    );

    if (
      normalizedExecutedCheck.name !== normalizedVerificationCheck.name ||
      normalizedExecutedCheck.required !== normalizedVerificationCheck.required ||
      normalizedExecutedCheck.status !== normalizedVerificationCheck.status
    ) {
      throw new ValidationError(
        `Verification artifact summary requires matching executed and verification checks at index ${index}.`
      );
    }

    return {
      name: normalizedExecutedCheck.name,
      required: normalizedExecutedCheck.required,
      status: normalizedExecutedCheck.status
    };
  });
}

function validateSummaryConsistency(
  suppliedSummary: AttemptVerificationSummary,
  derivedSummary: AttemptVerificationSummary
): void {
  if (
    suppliedSummary.sourceState !== derivedSummary.sourceState ||
    suppliedSummary.overallOutcome !== derivedSummary.overallOutcome ||
    suppliedSummary.requiredOutcome !== derivedSummary.requiredOutcome ||
    suppliedSummary.hasInvalidChecks !== derivedSummary.hasInvalidChecks ||
    suppliedSummary.hasComparablePayload !== derivedSummary.hasComparablePayload ||
    suppliedSummary.isSelectionReady !== derivedSummary.isSelectionReady ||
    !countsEqual(suppliedSummary.counts, derivedSummary.counts)
  ) {
    throw new ValidationError(
      "Verification artifact summary requires result.summary to match the summary derived from result.verification."
    );
  }
}

function countsEqual(
  left: AttemptVerificationCounts,
  right: AttemptVerificationCounts
): boolean {
  return (
    left.total === right.total &&
    left.valid === right.valid &&
    left.invalid === right.invalid &&
    left.required === right.required &&
    left.optional === right.optional &&
    left.passed === right.passed &&
    left.failed === right.failed &&
    left.pending === right.pending &&
    left.skipped === right.skipped &&
    left.error === right.error
  );
}

function collectCheckNames(
  checks: readonly AttemptVerificationArtifactCheck[],
  predicate: (check: AttemptVerificationArtifactCheck) => boolean
): string[] {
  return checks.filter(predicate).map((check) => check.name);
}

function normalizeExecutedCheck(
  value: AttemptVerificationExecutedCheck,
  index: number
): NormalizedArtifactCheck {
  if (typeof value.required !== "boolean") {
    throw new ValidationError(
      `Verification artifact summary requires executed check ${index} to use a boolean required flag.`
    );
  }

  const normalized: NormalizedArtifactCheck = {
    name: normalizeCheckName(value.name, "executed", index),
    required: value.required,
    status: normalizeCheckStatus(value.status, "executed", index)
  };

  if (value.exitCode !== undefined) {
    if (!Number.isInteger(value.exitCode)) {
      throw new ValidationError(
        `Verification artifact summary requires executed check ${index} to use an integer exitCode when provided.`
      );
    }

    normalized.exitCode = value.exitCode;
  }

  if (value.failureKind !== undefined) {
    if (typeof value.failureKind !== "string" || value.failureKind.length === 0) {
      throw new ValidationError(
        `Verification artifact summary requires executed check ${index} to use a non-empty string failureKind when provided.`
      );
    }

    normalized.failureKind = value.failureKind;
  }

  validateExecutedCheckMetadata(normalized, index);

  return normalized;
}

function validateExecutedCheckMetadata(
  check: NormalizedArtifactCheck,
  index: number
): void {
  switch (check.status) {
    case "passed":
      if (check.exitCode !== 0 || check.failureKind !== undefined) {
        throw new ValidationError(
          `Verification artifact summary requires executed check ${index} with status "passed" to use exitCode 0 and omit failureKind.`
        );
      }
      return;
    case "failed":
      if (check.exitCode === undefined || check.exitCode === 0) {
        throw new ValidationError(
          `Verification artifact summary requires executed check ${index} with status "failed" to use a non-zero exitCode.`
        );
      }
      return;
    case "error":
      if (check.exitCode !== undefined && check.exitCode === 0) {
        throw new ValidationError(
          `Verification artifact summary requires executed check ${index} with status "error" to avoid exitCode 0 when exitCode is provided.`
        );
      }
      return;
    case "pending":
    case "skipped":
      if (check.exitCode !== undefined || check.failureKind !== undefined) {
        throw new ValidationError(
          `Verification artifact summary requires executed check ${index} with status "${check.status}" to omit execution metadata.`
        );
      }
      return;
  };
}

function normalizeVerificationCheck(
  value: unknown,
  index: number
): NormalizedArtifactCheck {
  if (!isRecord(value)) {
    throw new ValidationError(
      `Verification artifact summary requires verification check ${index} to be an object.`
    );
  }

  if (value.required !== undefined && typeof value.required !== "boolean") {
    throw new ValidationError(
      `Verification artifact summary requires verification check ${index} to use a boolean required flag when provided.`
    );
  }

  return {
    name: normalizeCheckName(value.name, "verification", index),
    required: value.required ?? false,
    status: normalizeCheckStatus(value.status, "verification", index)
  };
}

function normalizeCheckName(
  value: unknown,
  source: "executed" | "verification",
  index: number
): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Verification artifact summary requires ${source} check ${index} to use a non-empty string name.`
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      `Verification artifact summary requires ${source} check ${index} to use a non-empty string name.`
    );
  }

  return normalized;
}

function normalizeCheckStatus(
  value: unknown,
  source: "executed" | "verification",
  index: number
): AttemptVerificationCheckStatus {
  if (
    typeof value !== "string" ||
    !validStatuses.has(value as AttemptVerificationCheckStatus)
  ) {
    throw new ValidationError(
      `Verification artifact summary requires ${source} check ${index} to use the existing verification status vocabulary.`
    );
  }

  return value as AttemptVerificationCheckStatus;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
