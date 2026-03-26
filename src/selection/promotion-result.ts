import { ValidationError } from "../core/errors.js";
import {
  attemptStatuses,
  type AttemptStatus
} from "../manifest/types.js";
import {
  compareAttemptVerificationCandidates
} from "../verification/compare.js";
import type {
  AttemptVerificationCounts,
  AttemptVerificationSummary
} from "../verification/types.js";
import type {
  AttemptPromotionCandidate,
  AttemptPromotionResult
} from "./types.js";

const ATTEMPT_PROMOTION_RESULT_BASIS = "promotion_candidate" as const;
const ATTEMPT_PROMOTION_BASIS = "verification_artifact_summary" as const;
const VERIFICATION_ARTIFACT_SUMMARY_BASIS = "verification_execution" as const;
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);

export function deriveAttemptPromotionResult(
  candidates: readonly AttemptPromotionCandidate[]
): AttemptPromotionResult {
  const firstCandidate = candidates[0];

  if (firstCandidate === undefined) {
    return {
      promotionResultBasis: ATTEMPT_PROMOTION_RESULT_BASIS,
      taskId: undefined,
      candidates: [],
      selected: undefined,
      comparableCandidateCount: 0,
      promotionReadyCandidateCount: 0,
      recommendedForPromotion: false
    };
  }

  const validatedCandidates = candidates.map((candidate) => {
    validatePromotionCandidate(candidate);
    return candidate;
  });
  const taskId = normalizeRequiredString(
    firstCandidate.taskId,
    "candidate.taskId"
  );

  validateTaskBoundary(validatedCandidates, taskId);

  const sortedCandidates = [...validatedCandidates].sort(
    compareAttemptPromotionCandidates
  );
  const selected = sortedCandidates[0];
  const comparableCandidateCount = sortedCandidates.filter(
    (candidate) => candidate.summary.hasComparablePayload
  ).length;
  const promotionReadyCandidateCount = sortedCandidates.filter(
    (candidate) => candidate.recommendedForPromotion
  ).length;

  return {
    promotionResultBasis: ATTEMPT_PROMOTION_RESULT_BASIS,
    taskId,
    candidates: sortedCandidates,
    selected,
    comparableCandidateCount,
    promotionReadyCandidateCount,
    recommendedForPromotion: selected?.recommendedForPromotion ?? false
  };
}

function compareAttemptPromotionCandidates(
  left: AttemptPromotionCandidate,
  right: AttemptPromotionCandidate
): number {
  return compareAttemptVerificationCandidates(
    {
      attemptId: left.attemptId,
      summary: left.summary
    },
    {
      attemptId: right.attemptId,
      summary: right.summary
    }
  );
}

function validatePromotionCandidate(
  candidate: AttemptPromotionCandidate
): void {
  if (candidate.promotionBasis !== ATTEMPT_PROMOTION_BASIS) {
    throw new ValidationError(
      'Attempt promotion result requires candidate.promotionBasis to be "verification_artifact_summary".'
    );
  }

  normalizeRequiredString(candidate.attemptId, "candidate.attemptId");
  normalizeRequiredString(candidate.taskId, "candidate.taskId");
  normalizeRequiredString(candidate.runtime, "candidate.runtime");
  normalizeAttemptStatus(candidate.status);

  if (
    candidate.artifactSummary.summaryBasis !== VERIFICATION_ARTIFACT_SUMMARY_BASIS
  ) {
    throw new ValidationError(
      'Attempt promotion result requires candidate.artifactSummary.summaryBasis to be "verification_execution".'
    );
  }

  validateRecommendationConsistency(candidate);
  validateSummaryConsistency(candidate.summary, candidate.artifactSummary.summary);
}

function validateTaskBoundary(
  candidates: readonly AttemptPromotionCandidate[],
  taskId: string
): void {
  for (const candidate of candidates) {
    const candidateTaskId = normalizeRequiredString(
      candidate.taskId,
      "candidate.taskId"
    );

    if (candidateTaskId !== taskId) {
      throw new ValidationError(
        "Attempt promotion result requires candidates from a single taskId."
      );
    }
  }
}

function validateRecommendationConsistency(
  candidate: AttemptPromotionCandidate
): void {
  if (candidate.recommendedForPromotion !== candidate.summary.isSelectionReady) {
    throw new ValidationError(
      "Attempt promotion result requires candidate.recommendedForPromotion to match candidate.summary.isSelectionReady."
    );
  }

  if (
    candidate.recommendedForPromotion !==
    candidate.artifactSummary.recommendedForPromotion
  ) {
    throw new ValidationError(
      "Attempt promotion result requires candidate.recommendedForPromotion to match candidate.artifactSummary.recommendedForPromotion."
    );
  }
}

function validateSummaryConsistency(
  candidateSummary: AttemptVerificationSummary,
  artifactSummary: AttemptVerificationSummary
): void {
  if (
    candidateSummary.sourceState !== artifactSummary.sourceState ||
    candidateSummary.overallOutcome !== artifactSummary.overallOutcome ||
    candidateSummary.requiredOutcome !== artifactSummary.requiredOutcome ||
    candidateSummary.hasInvalidChecks !== artifactSummary.hasInvalidChecks ||
    candidateSummary.hasComparablePayload !== artifactSummary.hasComparablePayload ||
    candidateSummary.isSelectionReady !== artifactSummary.isSelectionReady ||
    !countsEqual(candidateSummary.counts, artifactSummary.counts)
  ) {
    throw new ValidationError(
      "Attempt promotion result requires candidate.summary to match candidate.artifactSummary.summary."
    );
  }
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Attempt promotion result requires ${fieldName} to be a non-empty string.`
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      `Attempt promotion result requires ${fieldName} to be a non-empty string.`
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
      "Attempt promotion result requires candidate.status to use the existing attempt status vocabulary."
    );
  }

  return value as AttemptStatus;
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
