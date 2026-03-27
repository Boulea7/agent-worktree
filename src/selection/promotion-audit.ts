import { ValidationError } from "../core/errors.js";
import { attemptSourceKinds } from "../manifest/types.js";
import type {
  AttemptVerificationArtifactCheck,
  AttemptVerificationArtifactSummary,
  AttemptVerificationCheckStatus,
  AttemptVerificationCounts,
  AttemptVerificationSummary
} from "../verification/types.js";
import { attemptVerificationCheckStatuses } from "../verification/types.js";
import { deriveAttemptPromotionResult } from "./promotion-result.js";
import type {
  AttemptPromotionAuditCandidate,
  AttemptPromotionAuditSummary,
  AttemptPromotionCandidate,
  AttemptPromotionResult
} from "./types.js";

const ATTEMPT_PROMOTION_AUDIT_BASIS = "promotion_result" as const;
const ATTEMPT_PROMOTION_RESULT_BASIS = "promotion_candidate" as const;
const validAttemptSourceKinds = new Set<string>(attemptSourceKinds);
const validVerificationCheckStatuses = new Set(attemptVerificationCheckStatuses);

export function deriveAttemptPromotionAuditSummary(
  result: AttemptPromotionResult
): AttemptPromotionAuditSummary {
  validatePromotionResultBasis(result);

  const canonicalResult = deriveAttemptPromotionResult(result.candidates);

  validatePromotionResultConsistency(result, canonicalResult);
  result.candidates.forEach((candidate) =>
    validatePromotionAuditCandidate(candidate)
  );

  return {
    auditBasis: ATTEMPT_PROMOTION_AUDIT_BASIS,
    taskId: result.taskId,
    selectedAttemptId: result.selected?.attemptId,
    candidateCount: result.candidates.length,
    comparableCandidateCount: countComparableCandidates(result.candidates),
    promotionReadyCandidateCount: countPromotionReadyCandidates(
      result.candidates
    ),
    recommendedForPromotion: result.selected?.recommendedForPromotion ?? false,
    candidates: result.candidates.map(deriveAttemptPromotionAuditCandidate)
  };
}

function validatePromotionResultBasis(result: AttemptPromotionResult): void {
  if (result.promotionResultBasis !== ATTEMPT_PROMOTION_RESULT_BASIS) {
    throw new ValidationError(
      'Attempt promotion audit summary requires result.promotionResultBasis to be "promotion_candidate".'
    );
  }
}

function validatePromotionResultConsistency(
  suppliedResult: AttemptPromotionResult,
  canonicalResult: AttemptPromotionResult
): void {
  if (suppliedResult.taskId !== canonicalResult.taskId) {
    throw new ValidationError(
      "Attempt promotion audit summary requires result.taskId to match the canonical promotion result."
    );
  }

  if (
    !promotionCandidatesEqual(suppliedResult.selected, canonicalResult.selected)
  ) {
    throw new ValidationError(
      "Attempt promotion audit summary requires result.selected to match the canonical promotion result."
    );
  }

  const comparableCandidateCount = countComparableCandidates(
    suppliedResult.candidates
  );

  if (suppliedResult.comparableCandidateCount !== comparableCandidateCount) {
    throw new ValidationError(
      "Attempt promotion audit summary requires result.comparableCandidateCount to match the count derived from result.candidates."
    );
  }

  const promotionReadyCandidateCount = countPromotionReadyCandidates(
    suppliedResult.candidates
  );

  if (
    suppliedResult.promotionReadyCandidateCount !== promotionReadyCandidateCount
  ) {
    throw new ValidationError(
      "Attempt promotion audit summary requires result.promotionReadyCandidateCount to match the count derived from result.candidates."
    );
  }

  const recommendedForPromotion =
    suppliedResult.selected?.recommendedForPromotion ?? false;

  if (suppliedResult.recommendedForPromotion !== recommendedForPromotion) {
    throw new ValidationError(
      "Attempt promotion audit summary requires result.recommendedForPromotion to match the selected promotion candidate."
    );
  }

  if (
    !promotionCandidateArraysEqual(
      suppliedResult.candidates,
      canonicalResult.candidates
    )
  ) {
    throw new ValidationError(
      "Attempt promotion audit summary requires result.candidates to preserve canonical promotion-result ordering."
    );
  }
}

function countComparableCandidates(
  candidates: readonly AttemptPromotionCandidate[]
): number {
  return candidates.filter((candidate) => candidate.summary.hasComparablePayload)
    .length;
}

function countPromotionReadyCandidates(
  candidates: readonly AttemptPromotionCandidate[]
): number {
  return candidates.filter((candidate) => candidate.recommendedForPromotion)
    .length;
}

function deriveAttemptPromotionAuditCandidate(
  candidate: AttemptPromotionCandidate
): AttemptPromotionAuditCandidate {
  return {
    attemptId: candidate.attemptId,
    runtime: candidate.runtime,
    status: candidate.status,
    sourceKind: candidate.sourceKind,
    summary: cloneAttemptVerificationSummary(candidate.summary),
    recommendedForPromotion: candidate.recommendedForPromotion,
    blockingRequiredCheckNames: [
      ...candidate.artifactSummary.blockingRequiredCheckNames
    ],
    failedOrErrorCheckNames: [...candidate.artifactSummary.failedOrErrorCheckNames],
    pendingCheckNames: [...candidate.artifactSummary.pendingCheckNames],
    skippedCheckNames: [...candidate.artifactSummary.skippedCheckNames]
  };
}

function validatePromotionAuditCandidate(
  candidate: AttemptPromotionCandidate
): void {
  validateCandidateSourceKind(candidate.sourceKind);
  validateArtifactSummaryNameLists(candidate.artifactSummary);
}

function validateCandidateSourceKind(sourceKind: unknown): void {
  if (
    sourceKind !== undefined &&
    (typeof sourceKind !== "string" || !validAttemptSourceKinds.has(sourceKind))
  ) {
    throw new ValidationError(
      "Attempt promotion audit summary requires candidate.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  }
}

function validateArtifactSummaryNameLists(
  artifactSummary: AttemptVerificationArtifactSummary
): void {
  const checks = artifactSummary.checks.map(normalizeArtifactCheck);

  const blockingRequiredCheckNames = collectCheckNames(
    checks,
    (check) =>
      check.required &&
      (check.status === "failed" ||
        check.status === "error" ||
        check.status === "pending" ||
        check.status === "skipped")
  );

  if (
    !stringArraysEqual(
      artifactSummary.blockingRequiredCheckNames,
      blockingRequiredCheckNames
    )
  ) {
    throw new ValidationError(
      "Attempt promotion audit summary requires candidate.artifactSummary.blockingRequiredCheckNames to match candidate.artifactSummary.checks."
    );
  }

  const failedOrErrorCheckNames = collectCheckNames(
    checks,
    (check) => check.status === "failed" || check.status === "error"
  );

  if (
    !stringArraysEqual(
      artifactSummary.failedOrErrorCheckNames,
      failedOrErrorCheckNames
    )
  ) {
    throw new ValidationError(
      "Attempt promotion audit summary requires candidate.artifactSummary.failedOrErrorCheckNames to match candidate.artifactSummary.checks."
    );
  }

  const pendingCheckNames = collectCheckNames(
    checks,
    (check) => check.status === "pending"
  );

  if (!stringArraysEqual(artifactSummary.pendingCheckNames, pendingCheckNames)) {
    throw new ValidationError(
      "Attempt promotion audit summary requires candidate.artifactSummary.pendingCheckNames to match candidate.artifactSummary.checks."
    );
  }

  const skippedCheckNames = collectCheckNames(
    checks,
    (check) => check.status === "skipped"
  );

  if (!stringArraysEqual(artifactSummary.skippedCheckNames, skippedCheckNames)) {
    throw new ValidationError(
      "Attempt promotion audit summary requires candidate.artifactSummary.skippedCheckNames to match candidate.artifactSummary.checks."
    );
  }
}

function cloneAttemptVerificationSummary(
  summary: AttemptVerificationSummary
): AttemptVerificationSummary {
  return {
    sourceState: summary.sourceState,
    overallOutcome: summary.overallOutcome,
    requiredOutcome: summary.requiredOutcome,
    counts: {
      total: summary.counts.total,
      valid: summary.counts.valid,
      invalid: summary.counts.invalid,
      required: summary.counts.required,
      optional: summary.counts.optional,
      passed: summary.counts.passed,
      failed: summary.counts.failed,
      pending: summary.counts.pending,
      skipped: summary.counts.skipped,
      error: summary.counts.error
    },
    hasInvalidChecks: summary.hasInvalidChecks,
    hasComparablePayload: summary.hasComparablePayload,
    isSelectionReady: summary.isSelectionReady
  };
}

function promotionCandidateArraysEqual(
  left: readonly AttemptPromotionCandidate[],
  right: readonly AttemptPromotionCandidate[]
): boolean {
  return (
    left.length === right.length &&
    left.every((candidate, index) =>
      promotionCandidatesEqual(candidate, right[index])
    )
  );
}

function promotionCandidatesEqual(
  left: AttemptPromotionCandidate | undefined,
  right: AttemptPromotionCandidate | undefined
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }

  return (
    left.promotionBasis === right.promotionBasis &&
    left.attemptId === right.attemptId &&
    left.taskId === right.taskId &&
    left.runtime === right.runtime &&
    left.status === right.status &&
    left.sourceKind === right.sourceKind &&
    summariesEqual(left.summary, right.summary) &&
    artifactSummariesEqual(left.artifactSummary, right.artifactSummary) &&
    left.recommendedForPromotion === right.recommendedForPromotion
  );
}

function artifactSummariesEqual(
  left: AttemptVerificationArtifactSummary,
  right: AttemptVerificationArtifactSummary
): boolean {
  return (
    left.summaryBasis === right.summaryBasis &&
    summariesEqual(left.summary, right.summary) &&
    artifactChecksEqual(left.checks, right.checks) &&
    stringArraysEqual(
      left.blockingRequiredCheckNames,
      right.blockingRequiredCheckNames
    ) &&
    stringArraysEqual(left.failedOrErrorCheckNames, right.failedOrErrorCheckNames) &&
    stringArraysEqual(left.pendingCheckNames, right.pendingCheckNames) &&
    stringArraysEqual(left.skippedCheckNames, right.skippedCheckNames) &&
    stringArraysEqual(left.passedCheckNames, right.passedCheckNames) &&
    left.recommendedForPromotion === right.recommendedForPromotion
  );
}

function artifactChecksEqual(
  left: readonly AttemptVerificationArtifactCheck[],
  right: readonly AttemptVerificationArtifactCheck[]
): boolean {
  return (
    left.length === right.length &&
    left.every((check, index) => {
      const other = right[index];

      return (
        other !== undefined &&
        check.name === other.name &&
        check.required === other.required &&
        check.status === other.status
      );
    })
  );
}

function normalizeArtifactCheck(
  check: AttemptVerificationArtifactCheck
): AttemptVerificationArtifactCheck {
  if (typeof check.name !== "string" || check.name.trim().length === 0) {
    throw new ValidationError(
      "Attempt promotion audit summary requires candidate.artifactSummary.checks to use non-empty string names."
    );
  }

  if (typeof check.required !== "boolean") {
    throw new ValidationError(
      "Attempt promotion audit summary requires candidate.artifactSummary.checks to use boolean required flags."
    );
  }

  if (!validVerificationCheckStatuses.has(check.status)) {
    throw new ValidationError(
      "Attempt promotion audit summary requires candidate.artifactSummary.checks to use the existing verification status vocabulary."
    );
  }

  return {
    name: check.name,
    required: check.required,
    status: check.status as AttemptVerificationCheckStatus
  };
}

function summariesEqual(
  left: AttemptVerificationSummary,
  right: AttemptVerificationSummary
): boolean {
  return (
    left.sourceState === right.sourceState &&
    left.overallOutcome === right.overallOutcome &&
    left.requiredOutcome === right.requiredOutcome &&
    countsEqual(left.counts, right.counts) &&
    left.hasInvalidChecks === right.hasInvalidChecks &&
    left.hasComparablePayload === right.hasComparablePayload &&
    left.isSelectionReady === right.isSelectionReady
  );
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

function stringArraysEqual(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function collectCheckNames(
  checks: readonly AttemptVerificationArtifactCheck[],
  predicate: (check: AttemptVerificationArtifactCheck) => boolean
): string[] {
  return checks.filter(predicate).map((check) => check.name);
}
