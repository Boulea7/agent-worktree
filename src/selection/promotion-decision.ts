import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptPromotionDecisionBlockingReason,
  AttemptPromotionDecisionSummary,
  AttemptPromotionExplanationCandidate,
  AttemptPromotionExplanationCode,
  AttemptPromotionExplanationSummary
} from "./types.js";

const ATTEMPT_PROMOTION_DECISION_BASIS =
  "promotion_explanation_summary" as const;
const ATTEMPT_PROMOTION_EXPLANATION_BASIS = "promotion_report" as const;
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);
const validExplanationCodes = new Set<AttemptPromotionExplanationCode>([
  "selected",
  "promotion_ready",
  "required_checks_failed",
  "required_checks_pending",
  "verification_incomplete"
]);

export function deriveAttemptPromotionDecisionSummary(
  summary: AttemptPromotionExplanationSummary
): AttemptPromotionDecisionSummary {
  validateExplanationBasis(summary);
  validateTaskId(summary.taskId);
  validatePromotionExplanationSummary(summary);

  const selected =
    summary.candidates[0] === undefined
      ? undefined
      : cloneExplanationCandidate(summary.candidates[0]);
  const blockingReasons = deriveBlockingReasons(selected, summary.candidateCount);

  return {
    decisionBasis: ATTEMPT_PROMOTION_DECISION_BASIS,
    taskId: summary.taskId,
    selectedAttemptId: summary.selectedAttemptId,
    candidateCount: summary.candidates.length,
    comparableCandidateCount: summary.comparableCandidateCount,
    promotionReadyCandidateCount: countPromotionReadyCandidates(summary.candidates),
    recommendedForPromotion:
      summary.candidates[0]?.recommendedForPromotion ?? false,
    selected,
    blockingReasons,
    canPromote: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0
  };
}

function validateExplanationBasis(
  summary: AttemptPromotionExplanationSummary
): void {
  if (summary.explanationBasis !== ATTEMPT_PROMOTION_EXPLANATION_BASIS) {
    throw new ValidationError(
      'Attempt promotion decision summary requires summary.explanationBasis to be "promotion_report".'
    );
  }
}

function validateTaskId(value: unknown): void {
  if (value !== undefined && typeof value !== "string") {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.taskId to be a string when provided."
    );
  }
}

function validatePromotionExplanationSummary(
  summary: AttemptPromotionExplanationSummary
): void {
  if (!Array.isArray(summary.candidates)) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.candidates to be an array."
    );
  }

  if (summary.candidateCount !== summary.candidates.length) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.candidateCount to match summary.candidates.length."
    );
  }

  validateComparableCandidateCount(summary);

  if (summary.candidates.length === 0) {
    if (summary.selectedAttemptId !== undefined) {
      throw new ValidationError(
        "Attempt promotion decision summary requires summary.selectedAttemptId to be undefined when candidates are empty."
      );
    }

    if (summary.selected !== undefined) {
      throw new ValidationError(
        "Attempt promotion decision summary requires summary.selected to be undefined when candidates are empty."
      );
    }
  } else if (summary.selectedAttemptId !== summary.candidates[0]?.attemptId) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.selectedAttemptId to match the first candidate when candidates are present."
    );
  }

  summary.candidates.forEach((candidate, index) => {
    validateExplanationCandidate(candidate);

    if (index === 0 && candidate.isSelected !== true) {
      throw new ValidationError(
        "Attempt promotion decision summary requires the first candidate to be selected."
      );
    }

    if (index > 0 && candidate.isSelected !== false) {
      throw new ValidationError(
        "Attempt promotion decision summary requires non-first candidates to be unselected."
      );
    }
  });

  if (
    !explanationCandidatesEqual(summary.selected, summary.candidates[0])
  ) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.selected to match the first candidate."
    );
  }

  const promotionReadyCandidateCount = countPromotionReadyCandidates(
    summary.candidates
  );

  if (summary.promotionReadyCandidateCount !== promotionReadyCandidateCount) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.promotionReadyCandidateCount to match the count derived from summary.candidates."
    );
  }

  const recommendedForPromotion =
    summary.candidates[0]?.recommendedForPromotion ?? false;

  if (summary.recommendedForPromotion !== recommendedForPromotion) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.recommendedForPromotion to match the selected explanation candidate."
    );
  }
}

function validateComparableCandidateCount(
  summary: AttemptPromotionExplanationSummary
): void {
  if (
    typeof summary.comparableCandidateCount !== "number" ||
    !Number.isInteger(summary.comparableCandidateCount) ||
    summary.comparableCandidateCount < 0
  ) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.comparableCandidateCount to be a non-negative integer."
    );
  }

  if (summary.comparableCandidateCount > summary.candidateCount) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.comparableCandidateCount to be less than or equal to summary.candidateCount."
    );
  }
}

function validateExplanationCandidate(
  candidate: AttemptPromotionExplanationCandidate
): void {
  validateNonEmptyString(candidate.attemptId, "candidate.attemptId");
  validateNonEmptyString(candidate.runtime, "candidate.runtime");
  validateAttemptStatus(candidate.status);
  validateAttemptSourceKind(candidate.sourceKind);

  if (typeof candidate.isSelected !== "boolean") {
    throw new ValidationError(
      "Attempt promotion decision summary requires candidate.isSelected to be a boolean."
    );
  }

  if (typeof candidate.recommendedForPromotion !== "boolean") {
    throw new ValidationError(
      "Attempt promotion decision summary requires candidate.recommendedForPromotion to be a boolean."
    );
  }

  if (!validExplanationCodes.has(candidate.explanationCode)) {
    throw new ValidationError(
      "Attempt promotion decision summary requires candidate.explanationCode to use the existing promotion explanation vocabulary."
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

function deriveBlockingReasons(
  selected: AttemptPromotionExplanationCandidate | undefined,
  candidateCount: number
): AttemptPromotionDecisionBlockingReason[] {
  if (candidateCount === 0 || selected === undefined) {
    return ["no_candidates"];
  }

  if (selected.recommendedForPromotion) {
    return [];
  }

  const blockingReasons: AttemptPromotionDecisionBlockingReason[] = [];

  if (selected.failedOrErrorCheckNames.length > 0) {
    blockingReasons.push("required_checks_failed");
  }

  if (selected.pendingCheckNames.length > 0) {
    blockingReasons.push("required_checks_pending");
  }

  if (blockingReasons.length === 0) {
    blockingReasons.push("verification_incomplete");
  }

  return blockingReasons;
}

function countPromotionReadyCandidates(
  candidates: readonly AttemptPromotionExplanationCandidate[]
): number {
  return candidates.filter((candidate) => candidate.recommendedForPromotion)
    .length;
}

function explanationCandidatesEqual(
  left: AttemptPromotionExplanationCandidate | undefined,
  right: AttemptPromotionExplanationCandidate | undefined
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }

  return (
    left.attemptId === right.attemptId &&
    left.runtime === right.runtime &&
    left.status === right.status &&
    left.sourceKind === right.sourceKind &&
    left.isSelected === right.isSelected &&
    left.recommendedForPromotion === right.recommendedForPromotion &&
    left.explanationCode === right.explanationCode &&
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

function validateCheckNameList(
  values: readonly string[],
  fieldName: string
): void {
  if (!Array.isArray(values)) {
    throw new ValidationError(
      `Attempt promotion decision summary requires ${fieldName} to be an array of non-empty strings.`
    );
  }

  if (
    values.some(
      (value) => typeof value !== "string" || value.trim().length === 0
    )
  ) {
    throw new ValidationError(
      `Attempt promotion decision summary requires ${fieldName} to use non-empty string entries.`
    );
  }
}

function validateNonEmptyString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Attempt promotion decision summary requires ${fieldName} to be a non-empty string.`
    );
  }
}

function validateAttemptStatus(value: unknown): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      "Attempt promotion decision summary requires candidate.status to use the existing attempt status vocabulary."
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
      "Attempt promotion decision summary requires candidate.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  }
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
