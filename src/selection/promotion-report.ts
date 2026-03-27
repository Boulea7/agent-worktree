import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptVerificationCounts,
  AttemptVerificationSummary
} from "../verification/types.js";
import {
  attemptVerificationOverallOutcomes,
  attemptVerificationRequiredOutcomes
} from "../verification/types.js";
import type {
  AttemptPromotionAuditCandidate,
  AttemptPromotionAuditSummary,
  AttemptPromotionReport
} from "./types.js";

const ATTEMPT_PROMOTION_REPORT_BASIS = "promotion_audit_summary" as const;
const ATTEMPT_PROMOTION_AUDIT_BASIS = "promotion_result" as const;
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);
const validVerificationOverallOutcomes = new Set<string>(
  attemptVerificationOverallOutcomes
);
const validVerificationRequiredOutcomes = new Set<string>(
  attemptVerificationRequiredOutcomes
);

export function deriveAttemptPromotionReport(
  summary: AttemptPromotionAuditSummary
): AttemptPromotionReport {
  validateAuditBasis(summary);

  validatePromotionAuditSummary(summary);

  const candidates = summary.candidates.map(clonePromotionAuditCandidate);
  const selected = candidates[0];
  const promotionReadyCandidates = candidates.filter(
    (candidate) => candidate.recommendedForPromotion
  );
  const nonPromotionReadyCandidates = candidates.filter(
    (candidate) => !candidate.recommendedForPromotion
  );
  const pendingCandidates = candidates.filter(
    (candidate) => candidate.pendingCheckNames.length > 0
  );

  return {
    reportBasis: ATTEMPT_PROMOTION_REPORT_BASIS,
    taskId: summary.taskId,
    selectedAttemptId: summary.selectedAttemptId,
    candidateCount: summary.candidateCount,
    comparableCandidateCount: summary.comparableCandidateCount,
    promotionReadyCandidateCount: summary.promotionReadyCandidateCount,
    recommendedForPromotion: summary.recommendedForPromotion,
    candidates,
    selected,
    promotionReadyCandidates,
    nonPromotionReadyCandidates,
    pendingCandidates
  };
}

function validateAuditBasis(summary: AttemptPromotionAuditSummary): void {
  if (summary.auditBasis !== ATTEMPT_PROMOTION_AUDIT_BASIS) {
    throw new ValidationError(
      'Attempt promotion report requires summary.auditBasis to be "promotion_result".'
    );
  }
}

function validatePromotionAuditSummary(
  summary: AttemptPromotionAuditSummary
): void {
  if (summary.candidateCount !== summary.candidates.length) {
    throw new ValidationError(
      "Attempt promotion report requires summary.candidateCount to match summary.candidates.length."
    );
  }

  if (summary.candidates.length === 0) {
    if (summary.selectedAttemptId !== undefined) {
      throw new ValidationError(
        "Attempt promotion report requires summary.selectedAttemptId to be undefined when candidates are empty."
      );
    }

    if (summary.recommendedForPromotion !== false) {
      throw new ValidationError(
        "Attempt promotion report requires summary.recommendedForPromotion to be false when candidates are empty."
      );
    }
  } else if (summary.selectedAttemptId !== summary.candidates[0]?.attemptId) {
    throw new ValidationError(
      "Attempt promotion report requires summary.selectedAttemptId to match the first candidate when candidates are present."
    );
  }

  summary.candidates.forEach(validatePromotionAuditCandidate);

  const comparableCandidateCount = summary.candidates.filter(
    (candidate) => candidate.summary.hasComparablePayload
  ).length;

  if (summary.comparableCandidateCount !== comparableCandidateCount) {
    throw new ValidationError(
      "Attempt promotion report requires summary.comparableCandidateCount to match the count derived from summary.candidates."
    );
  }

  const promotionReadyCandidateCount = summary.candidates.filter(
    (candidate) => candidate.recommendedForPromotion
  ).length;

  if (summary.promotionReadyCandidateCount !== promotionReadyCandidateCount) {
    throw new ValidationError(
      "Attempt promotion report requires summary.promotionReadyCandidateCount to match the count derived from summary.candidates."
    );
  }

  const recommendedForPromotion =
    summary.candidates[0]?.recommendedForPromotion ?? false;

  if (summary.recommendedForPromotion !== recommendedForPromotion) {
    throw new ValidationError(
      "Attempt promotion report requires summary.recommendedForPromotion to match the selected audit candidate."
    );
  }
}

function validatePromotionAuditCandidate(
  candidate: AttemptPromotionAuditCandidate
): void {
  validateNonEmptyString(candidate.attemptId, "candidate.attemptId");
  validateNonEmptyString(candidate.runtime, "candidate.runtime");
  validateAttemptStatus(candidate.status);
  validateAttemptSourceKind(candidate.sourceKind);
  if (typeof candidate.recommendedForPromotion !== "boolean") {
    throw new ValidationError(
      "Attempt promotion report requires candidate.recommendedForPromotion to be a boolean."
    );
  }

  validateAttemptVerificationSummary(candidate.summary);

  if (candidate.recommendedForPromotion !== candidate.summary.isSelectionReady) {
    throw new ValidationError(
      "Attempt promotion report requires candidate.recommendedForPromotion to match candidate.summary.isSelectionReady."
    );
  }

  validateCheckNameList(
    candidate.blockingRequiredCheckNames,
    "candidate.blockingRequiredCheckNames"
  );
  validateCheckNameList(
    candidate.failedOrErrorCheckNames,
    "candidate.failedOrErrorCheckNames"
  );
  validateCheckNameList(candidate.pendingCheckNames, "candidate.pendingCheckNames");
  validateCheckNameList(candidate.skippedCheckNames, "candidate.skippedCheckNames");
}

function clonePromotionAuditCandidate(
  candidate: AttemptPromotionAuditCandidate
): AttemptPromotionAuditCandidate {
  return {
    attemptId: candidate.attemptId,
    runtime: candidate.runtime,
    status: candidate.status,
    sourceKind: candidate.sourceKind,
    summary: cloneAttemptVerificationSummary(candidate.summary),
    recommendedForPromotion: candidate.recommendedForPromotion,
    blockingRequiredCheckNames: [...candidate.blockingRequiredCheckNames],
    failedOrErrorCheckNames: [...candidate.failedOrErrorCheckNames],
    pendingCheckNames: [...candidate.pendingCheckNames],
    skippedCheckNames: [...candidate.skippedCheckNames]
  };
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

function validateAttemptVerificationSummary(
  summary: unknown
): void {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt promotion report requires candidate.summary to be an object."
    );
  }

  if (typeof summary.sourceState !== "string") {
    throw new ValidationError(
      "Attempt promotion report requires candidate.summary.sourceState to be a string."
    );
  }

  if (
    typeof summary.overallOutcome !== "string" ||
    !validVerificationOverallOutcomes.has(summary.overallOutcome)
  ) {
    throw new ValidationError(
      "Attempt promotion report requires candidate.summary.overallOutcome to use the existing verification overall-outcome vocabulary."
    );
  }

  if (
    typeof summary.requiredOutcome !== "string" ||
    !validVerificationRequiredOutcomes.has(summary.requiredOutcome)
  ) {
    throw new ValidationError(
      "Attempt promotion report requires candidate.summary.requiredOutcome to use the existing verification required-outcome vocabulary."
    );
  }

  if (typeof summary.hasInvalidChecks !== "boolean") {
    throw new ValidationError(
      "Attempt promotion report requires candidate.summary.hasInvalidChecks to be a boolean."
    );
  }

  if (typeof summary.hasComparablePayload !== "boolean") {
    throw new ValidationError(
      "Attempt promotion report requires candidate.summary.hasComparablePayload to be a boolean."
    );
  }

  if (typeof summary.isSelectionReady !== "boolean") {
    throw new ValidationError(
      "Attempt promotion report requires candidate.summary.isSelectionReady to be a boolean."
    );
  }

  validateVerificationCounts(summary.counts);
}

function validateVerificationCounts(counts: unknown): void {
  if (!isRecord(counts)) {
    throw new ValidationError(
      "Attempt promotion report requires candidate.summary.counts to be an object."
    );
  }

  const values = [
    counts.total,
    counts.valid,
    counts.invalid,
    counts.required,
    counts.optional,
    counts.passed,
    counts.failed,
    counts.pending,
    counts.skipped,
    counts.error
  ];

  if (
    values.some(
      (value) =>
        typeof value !== "number" || !Number.isInteger(value) || value < 0
    )
  ) {
    throw new ValidationError(
      "Attempt promotion report requires candidate.summary.counts to use non-negative integer values."
    );
  }
}

function validateCheckNameList(
  values: readonly string[],
  fieldName: string
): void {
  if (!Array.isArray(values)) {
    throw new ValidationError(
      `Attempt promotion report requires ${fieldName} to be an array of non-empty strings.`
    );
  }

  if (
    values.some(
      (value) => typeof value !== "string" || value.trim().length === 0
    )
  ) {
    throw new ValidationError(
      `Attempt promotion report requires ${fieldName} to use non-empty string entries.`
    );
  }
}

function validateNonEmptyString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Attempt promotion report requires ${fieldName} to be a non-empty string.`
    );
  }
}

function validateAttemptStatus(value: unknown): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      "Attempt promotion report requires candidate.status to use the existing attempt status vocabulary."
    );
  }
}

function validateAttemptSourceKind(value: unknown): void {
  if (
    value !== undefined &&
    (typeof value !== "string" ||
      !validAttemptSourceKinds.has(value as AttemptSourceKind))
  ) {
    throw new ValidationError(
      "Attempt promotion report requires candidate.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
