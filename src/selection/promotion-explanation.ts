import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import {
  attemptVerificationOverallOutcomes,
  attemptVerificationRequiredOutcomes,
  type AttemptVerificationCounts,
  type AttemptVerificationSummary
} from "../verification/index.js";
import type {
  AttemptPromotionAuditCandidate,
  AttemptPromotionExplanationCandidate,
  AttemptPromotionExplanationCode,
  AttemptPromotionExplanationSummary,
  AttemptPromotionReport
} from "./types.js";

const ATTEMPT_PROMOTION_EXPLANATION_BASIS = "promotion_report" as const;
const ATTEMPT_PROMOTION_REPORT_BASIS = "promotion_audit_summary" as const;
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);
const validVerificationOverallOutcomes = new Set<string>(
  attemptVerificationOverallOutcomes
);
const validVerificationRequiredOutcomes = new Set<string>(
  attemptVerificationRequiredOutcomes
);

export function deriveAttemptPromotionExplanationSummary(
  report: AttemptPromotionReport
): AttemptPromotionExplanationSummary {
  validateReportBasis(report);
  validateTaskId(report.taskId);
  validatePromotionReport(report);

  const candidates = report.candidates.map((candidate) =>
    deriveExplanationCandidate(candidate, report.selectedAttemptId)
  );
  const selected =
    candidates[0] === undefined
      ? undefined
      : cloneExplanationCandidate(candidates[0]);

  return {
    explanationBasis: ATTEMPT_PROMOTION_EXPLANATION_BASIS,
    taskId: report.taskId,
    selectedAttemptId: report.selectedAttemptId,
    candidateCount: report.candidates.length,
    comparableCandidateCount: countComparableCandidates(report.candidates),
    promotionReadyCandidateCount: countPromotionReadyCandidates(report.candidates),
    recommendedForPromotion:
      report.candidates[0]?.recommendedForPromotion ?? false,
    selected,
    candidates
  };
}

function validateReportBasis(report: AttemptPromotionReport): void {
  if (report.reportBasis !== ATTEMPT_PROMOTION_REPORT_BASIS) {
    throw new ValidationError(
      'Attempt promotion explanation summary requires report.reportBasis to be "promotion_audit_summary".'
    );
  }
}

function validateTaskId(value: unknown): void {
  if (value !== undefined && typeof value !== "string") {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.taskId to be a string when provided."
    );
  }
}

function validatePromotionReport(report: AttemptPromotionReport): void {
  if (!Array.isArray(report.candidates)) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.candidates to be an array."
    );
  }

  if (report.candidateCount !== report.candidates.length) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.candidateCount to match report.candidates.length."
    );
  }

  if (report.candidates.length === 0) {
    if (report.selectedAttemptId !== undefined) {
      throw new ValidationError(
        "Attempt promotion explanation summary requires report.selectedAttemptId to be undefined when candidates are empty."
      );
    }

    if (report.selected !== undefined) {
      throw new ValidationError(
        "Attempt promotion explanation summary requires report.selected to be undefined when candidates are empty."
      );
    }
  } else if (report.selectedAttemptId !== report.candidates[0]?.attemptId) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.selectedAttemptId to match the first candidate when candidates are present."
    );
  }

  report.candidates.forEach(validatePromotionAuditCandidate);

  if (
    !promotionAuditCandidatesEqual(report.selected, report.candidates[0])
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.selected to match the first candidate."
    );
  }

  const comparableCandidateCount = countComparableCandidates(report.candidates);

  if (report.comparableCandidateCount !== comparableCandidateCount) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.comparableCandidateCount to match the count derived from report.candidates."
    );
  }

  const promotionReadyCandidateCount = countPromotionReadyCandidates(
    report.candidates
  );

  if (report.promotionReadyCandidateCount !== promotionReadyCandidateCount) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.promotionReadyCandidateCount to match the count derived from report.candidates."
    );
  }

  const recommendedForPromotion =
    report.candidates[0]?.recommendedForPromotion ?? false;

  if (report.recommendedForPromotion !== recommendedForPromotion) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.recommendedForPromotion to match the selected report candidate."
    );
  }

  const promotionReadyCandidates = report.candidates.filter(
    (candidate) => candidate.recommendedForPromotion
  );

  if (
    !promotionAuditCandidateArraysEqual(
      report.promotionReadyCandidates,
      promotionReadyCandidates
    )
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.promotionReadyCandidates to match the stable filtered promotion-ready subgroup."
    );
  }

  const nonPromotionReadyCandidates = report.candidates.filter(
    (candidate) => !candidate.recommendedForPromotion
  );

  if (
    !promotionAuditCandidateArraysEqual(
      report.nonPromotionReadyCandidates,
      nonPromotionReadyCandidates
    )
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.nonPromotionReadyCandidates to match the stable filtered non-promotion-ready subgroup."
    );
  }

  const pendingCandidates = report.candidates.filter(
    (candidate) => candidate.pendingCheckNames.length > 0
  );

  if (
    !promotionAuditCandidateArraysEqual(
      report.pendingCandidates,
      pendingCandidates
    )
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.pendingCandidates to match the stable filtered pending subgroup."
    );
  }
}

function countComparableCandidates(
  candidates: readonly AttemptPromotionAuditCandidate[]
): number {
  return candidates.filter((candidate) => candidate.summary.hasComparablePayload)
    .length;
}

function countPromotionReadyCandidates(
  candidates: readonly AttemptPromotionAuditCandidate[]
): number {
  return candidates.filter((candidate) => candidate.recommendedForPromotion)
    .length;
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
      "Attempt promotion explanation summary requires candidate.recommendedForPromotion to be a boolean."
    );
  }

  validateAttemptVerificationSummary(candidate.summary);

  if (candidate.recommendedForPromotion !== candidate.summary.isSelectionReady) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.recommendedForPromotion to match candidate.summary.isSelectionReady."
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
}

function deriveExplanationCandidate(
  candidate: AttemptPromotionAuditCandidate,
  selectedAttemptId: string | undefined
): AttemptPromotionExplanationCandidate {
  const isSelected = candidate.attemptId === selectedAttemptId;

  return {
    attemptId: candidate.attemptId,
    runtime: candidate.runtime,
    status: candidate.status,
    sourceKind: candidate.sourceKind,
    isSelected,
    recommendedForPromotion: candidate.recommendedForPromotion,
    explanationCode: deriveExplanationCode(candidate, isSelected),
    blockingRequiredCheckNames: [...candidate.blockingRequiredCheckNames],
    failedOrErrorCheckNames: [...candidate.failedOrErrorCheckNames],
    pendingCheckNames: [...candidate.pendingCheckNames]
  };
}

function cloneExplanationCandidate(
  candidate: AttemptPromotionExplanationCandidate
): AttemptPromotionExplanationCandidate {
  return {
    attemptId: candidate.attemptId,
    runtime: candidate.runtime,
    status: candidate.status,
    sourceKind: candidate.sourceKind,
    isSelected: candidate.isSelected,
    recommendedForPromotion: candidate.recommendedForPromotion,
    explanationCode: candidate.explanationCode,
    blockingRequiredCheckNames: [...candidate.blockingRequiredCheckNames],
    failedOrErrorCheckNames: [...candidate.failedOrErrorCheckNames],
    pendingCheckNames: [...candidate.pendingCheckNames]
  };
}

function deriveExplanationCode(
  candidate: AttemptPromotionAuditCandidate,
  isSelected: boolean
): AttemptPromotionExplanationCode {
  if (isSelected) {
    return "selected";
  }

  if (candidate.recommendedForPromotion) {
    return "promotion_ready";
  }

  if (
    candidate.summary.requiredOutcome === "failed" ||
    candidate.failedOrErrorCheckNames.length > 0
  ) {
    return "required_checks_failed";
  }

  if (
    candidate.summary.requiredOutcome === "pending" ||
    candidate.pendingCheckNames.length > 0
  ) {
    return "required_checks_pending";
  }

  return "verification_incomplete";
}

function promotionAuditCandidateArraysEqual(
  left: readonly AttemptPromotionAuditCandidate[] | unknown,
  right: readonly AttemptPromotionAuditCandidate[]
): boolean {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((candidate, index) =>
      promotionAuditCandidatesEqual(
        candidate as AttemptPromotionAuditCandidate | undefined,
        right[index]
      )
    )
  );
}

function promotionAuditCandidatesEqual(
  left: AttemptPromotionAuditCandidate | undefined,
  right: AttemptPromotionAuditCandidate | undefined
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }

  return (
    left.attemptId === right.attemptId &&
    left.runtime === right.runtime &&
    left.status === right.status &&
    left.sourceKind === right.sourceKind &&
    left.recommendedForPromotion === right.recommendedForPromotion &&
    summariesEqual(left.summary, right.summary) &&
    stringArraysEqual(
      left.blockingRequiredCheckNames,
      right.blockingRequiredCheckNames
    ) &&
    stringArraysEqual(
      left.failedOrErrorCheckNames,
      right.failedOrErrorCheckNames
    ) &&
    stringArraysEqual(left.pendingCheckNames, right.pendingCheckNames)
  );
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

function validateAttemptVerificationSummary(summary: unknown): void {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary to be an object."
    );
  }

  if (typeof summary.sourceState !== "string") {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.sourceState to be a string."
    );
  }

  if (
    typeof summary.overallOutcome !== "string" ||
    !validVerificationOverallOutcomes.has(summary.overallOutcome)
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.overallOutcome to use the existing verification overall-outcome vocabulary."
    );
  }

  if (
    typeof summary.requiredOutcome !== "string" ||
    !validVerificationRequiredOutcomes.has(summary.requiredOutcome)
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.requiredOutcome to use the existing verification required-outcome vocabulary."
    );
  }

  if (typeof summary.hasInvalidChecks !== "boolean") {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.hasInvalidChecks to be a boolean."
    );
  }

  if (typeof summary.hasComparablePayload !== "boolean") {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.hasComparablePayload to be a boolean."
    );
  }

  if (typeof summary.isSelectionReady !== "boolean") {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.isSelectionReady to be a boolean."
    );
  }

  validateVerificationCounts(summary.counts);
}

function validateVerificationCounts(counts: unknown): void {
  if (!isRecord(counts)) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.counts to be an object."
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
      "Attempt promotion explanation summary requires candidate.summary.counts to use non-negative integer values."
    );
  }
}

function validateCheckNameList(
  values: readonly string[],
  fieldName: string
): void {
  if (!Array.isArray(values)) {
    throw new ValidationError(
      `Attempt promotion explanation summary requires ${fieldName} to be an array of non-empty strings.`
    );
  }

  if (
    values.some(
      (value) => typeof value !== "string" || value.trim().length === 0
    )
  ) {
    throw new ValidationError(
      `Attempt promotion explanation summary requires ${fieldName} to use non-empty string entries.`
    );
  }
}

function validateNonEmptyString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Attempt promotion explanation summary requires ${fieldName} to be a non-empty string.`
    );
  }
}

function validateAttemptStatus(value: unknown): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.status to use the existing attempt status vocabulary."
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
      "Attempt promotion explanation summary requires candidate.sourceKind to use the existing attempt source-kind vocabulary when provided."
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

function stringArraysEqual(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
