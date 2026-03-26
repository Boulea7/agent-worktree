import { ValidationError } from "../core/errors.js";
import {
  attemptStatuses,
  type AttemptManifest,
  type AttemptStatus
} from "../manifest/types.js";
import {
  deriveAttemptVerificationSummary
} from "../verification/derive.js";
import type {
  AttemptVerificationArtifactSummary,
  AttemptVerificationCounts,
  AttemptVerificationSummary
} from "../verification/types.js";
import type { AttemptPromotionCandidate } from "./types.js";

const ATTEMPT_PROMOTION_BASIS = "verification_artifact_summary" as const;
const VERIFICATION_ARTIFACT_SUMMARY_BASIS = "verification_execution" as const;
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);

export function deriveAttemptPromotionCandidate(
  manifest: AttemptManifest,
  artifactSummary: AttemptVerificationArtifactSummary
): AttemptPromotionCandidate {
  validateArtifactSummaryBasis(artifactSummary);

  const attemptId = normalizeRequiredString(
    manifest.attemptId,
    "manifest.attemptId"
  );
  const taskId = normalizeRequiredString(manifest.taskId, "manifest.taskId");
  const runtime = normalizeRequiredString(manifest.runtime, "manifest.runtime");
  const status = normalizeAttemptStatus(manifest.status);
  const summary = deriveAttemptVerificationSummary(manifest.verification);

  validateRecommendationConsistency(artifactSummary, summary);
  validateSummaryConsistency(summary, artifactSummary.summary);

  return {
    promotionBasis: ATTEMPT_PROMOTION_BASIS,
    attemptId,
    taskId,
    runtime,
    status,
    sourceKind: manifest.sourceKind,
    summary,
    artifactSummary,
    recommendedForPromotion: artifactSummary.recommendedForPromotion
  };
}

function validateArtifactSummaryBasis(
  artifactSummary: AttemptVerificationArtifactSummary
): void {
  if (artifactSummary.summaryBasis !== VERIFICATION_ARTIFACT_SUMMARY_BASIS) {
    throw new ValidationError(
      'Attempt promotion candidate requires artifactSummary.summaryBasis to be "verification_execution".'
    );
  }
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Attempt promotion candidate requires ${fieldName} to be a non-empty string.`
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      `Attempt promotion candidate requires ${fieldName} to be a non-empty string.`
    );
  }

  return normalized;
}

function normalizeAttemptStatus(value: unknown): AttemptStatus {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      "Attempt promotion candidate requires manifest.status to use the existing attempt status vocabulary."
    );
  }

  return value as AttemptStatus;
}

function validateSummaryConsistency(
  derivedSummary: AttemptVerificationSummary,
  suppliedSummary: AttemptVerificationSummary
): void {
  if (
    derivedSummary.sourceState !== suppliedSummary.sourceState ||
    derivedSummary.overallOutcome !== suppliedSummary.overallOutcome ||
    derivedSummary.requiredOutcome !== suppliedSummary.requiredOutcome ||
    derivedSummary.hasInvalidChecks !== suppliedSummary.hasInvalidChecks ||
    derivedSummary.hasComparablePayload !== suppliedSummary.hasComparablePayload ||
    derivedSummary.isSelectionReady !== suppliedSummary.isSelectionReady ||
    !countsEqual(derivedSummary.counts, suppliedSummary.counts)
  ) {
    throw new ValidationError(
      "Attempt promotion candidate requires artifactSummary.summary to match the summary derived from manifest.verification."
    );
  }
}

function validateRecommendationConsistency(
  artifactSummary: AttemptVerificationArtifactSummary,
  summary: AttemptVerificationSummary
): void {
  if (
    artifactSummary.recommendedForPromotion !==
    artifactSummary.summary.isSelectionReady
  ) {
    throw new ValidationError(
      "Attempt promotion candidate requires artifactSummary.recommendedForPromotion to match artifactSummary.summary.isSelectionReady."
    );
  }

  if (artifactSummary.recommendedForPromotion !== summary.isSelectionReady) {
    throw new ValidationError(
      "Attempt promotion candidate requires artifactSummary.recommendedForPromotion to match the summary derived from manifest.verification."
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
