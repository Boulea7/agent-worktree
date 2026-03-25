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
  AttemptPromotionTarget
} from "./types.js";

const ATTEMPT_PROMOTION_TARGET_BASIS = "promotion_decision_summary" as const;
const ATTEMPT_PROMOTION_DECISION_BASIS =
  "promotion_explanation_summary" as const;
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);
const validExplanationCodes = new Set<AttemptPromotionExplanationCode>([
  "selected",
  "promotion_ready",
  "required_checks_failed",
  "required_checks_pending",
  "verification_incomplete"
]);
const validBlockingReasons =
  new Set<AttemptPromotionDecisionBlockingReason>([
    "no_candidates",
    "required_checks_failed",
    "required_checks_pending",
    "verification_incomplete"
  ]);

export function deriveAttemptPromotionTarget(
  summary: AttemptPromotionDecisionSummary
): AttemptPromotionTarget | undefined {
  validateDecisionBasis(summary);
  validateTaskId(summary.taskId);
  validatePromotionDecisionSummary(summary);

  if (!summary.canPromote) {
    return undefined;
  }

  const selected = summary.selected;

  if (selected === undefined) {
    throw new ValidationError(
      "Attempt promotion target requires summary.selected to be defined when summary.canPromote is true."
    );
  }

  return {
    targetBasis: ATTEMPT_PROMOTION_TARGET_BASIS,
    taskId: summary.taskId,
    attemptId: selected.attemptId,
    runtime: selected.runtime,
    status: selected.status,
    sourceKind: selected.sourceKind
  };
}

function validateDecisionBasis(summary: AttemptPromotionDecisionSummary): void {
  if (summary.decisionBasis !== ATTEMPT_PROMOTION_DECISION_BASIS) {
    throw new ValidationError(
      'Attempt promotion target requires summary.decisionBasis to be "promotion_explanation_summary".'
    );
  }
}

function validateTaskId(value: unknown): void {
  if (value !== undefined && typeof value !== "string") {
    throw new ValidationError(
      "Attempt promotion target requires summary.taskId to be a string when provided."
    );
  }
}

function validatePromotionDecisionSummary(
  summary: AttemptPromotionDecisionSummary
): void {
  validateNonNegativeInteger(summary.candidateCount, "summary.candidateCount");
  validateComparableCandidateCount(summary);
  validatePromotionReadyCandidateCount(summary);
  validateBoolean(
    summary.recommendedForPromotion,
    "summary.recommendedForPromotion"
  );
  validateBoolean(summary.canPromote, "summary.canPromote");
  validateBoolean(summary.hasBlockingReasons, "summary.hasBlockingReasons");
  validateBlockingReasons(summary.blockingReasons);

  if (summary.candidateCount === 0) {
    if (summary.selectedAttemptId !== undefined) {
      throw new ValidationError(
        "Attempt promotion target requires summary.selectedAttemptId to be undefined when summary.candidateCount is 0."
      );
    }

    if (summary.selected !== undefined) {
      throw new ValidationError(
        "Attempt promotion target requires summary.selected to be undefined when summary.candidateCount is 0."
      );
    }

    if (summary.recommendedForPromotion !== false) {
      throw new ValidationError(
        "Attempt promotion target requires summary.recommendedForPromotion to be false when summary.candidateCount is 0."
      );
    }

    if (summary.promotionReadyCandidateCount !== 0) {
      throw new ValidationError(
        "Attempt promotion target requires summary.promotionReadyCandidateCount to be 0 when summary.candidateCount is 0."
      );
    }

    if (summary.comparableCandidateCount !== 0) {
      throw new ValidationError(
        "Attempt promotion target requires summary.comparableCandidateCount to be 0 when summary.candidateCount is 0."
      );
    }
  } else {
    validateNonEmptyString(
      summary.selectedAttemptId,
      "summary.selectedAttemptId",
      "Attempt promotion target requires summary.selectedAttemptId to be a non-empty string when summary.candidateCount is greater than 0."
    );

    if (summary.selected === undefined) {
      throw new ValidationError(
        "Attempt promotion target requires summary.selected to be defined when summary.candidateCount is greater than 0."
      );
    }

    validateSelectedCandidate(summary.selected);

    if (summary.selectedAttemptId !== summary.selected.attemptId) {
      throw new ValidationError(
        "Attempt promotion target requires summary.selectedAttemptId to match summary.selected.attemptId."
      );
    }

    if (
      summary.recommendedForPromotion !==
      summary.selected.recommendedForPromotion
    ) {
      throw new ValidationError(
        "Attempt promotion target requires summary.recommendedForPromotion to match summary.selected.recommendedForPromotion."
      );
    }
  }

  const canonicalBlockingReasons = deriveBlockingReasons(
    summary.selected,
    summary.candidateCount
  );

  if (
    !blockingReasonArraysEqual(summary.blockingReasons, canonicalBlockingReasons)
  ) {
    throw new ValidationError(
      "Attempt promotion target requires summary.blockingReasons to match the canonical blocker derivation from summary.selected."
    );
  }

  if (summary.canPromote !== (summary.blockingReasons.length === 0)) {
    throw new ValidationError(
      "Attempt promotion target requires summary.canPromote to match whether summary.blockingReasons is empty."
    );
  }

  if (summary.hasBlockingReasons !== (summary.blockingReasons.length > 0)) {
    throw new ValidationError(
      "Attempt promotion target requires summary.hasBlockingReasons to match whether summary.blockingReasons is non-empty."
    );
  }

  if (summary.canPromote) {
    if (summary.selected === undefined) {
      throw new ValidationError(
        "Attempt promotion target requires summary.selected to be defined when summary.canPromote is true."
      );
    }

    if (summary.selected.hasComparablePayload !== true) {
      throw new ValidationError(
        "Attempt promotion target requires summary.selected.hasComparablePayload to be true when summary.canPromote is true."
      );
    }

    if (summary.comparableCandidateCount < 1) {
      throw new ValidationError(
        "Attempt promotion target requires summary.comparableCandidateCount to be at least 1 when summary.canPromote is true."
      );
    }

    if (summary.recommendedForPromotion !== true) {
      throw new ValidationError(
        "Attempt promotion target requires summary.recommendedForPromotion to be true when summary.canPromote is true."
      );
    }
  } else if (
    summary.candidateCount > 0 &&
    summary.blockingReasons.length === 0
  ) {
    throw new ValidationError(
      "Attempt promotion target requires summary.blockingReasons to be non-empty when summary.canPromote is false and summary.candidateCount is greater than 0."
    );
  }
}

function validateComparableCandidateCount(
  summary: AttemptPromotionDecisionSummary
): void {
  validateNonNegativeInteger(
    summary.comparableCandidateCount,
    "summary.comparableCandidateCount"
  );

  if (summary.comparableCandidateCount > summary.candidateCount) {
    throw new ValidationError(
      "Attempt promotion target requires summary.comparableCandidateCount to be less than or equal to summary.candidateCount."
    );
  }
}

function validatePromotionReadyCandidateCount(
  summary: AttemptPromotionDecisionSummary
): void {
  validateNonNegativeInteger(
    summary.promotionReadyCandidateCount,
    "summary.promotionReadyCandidateCount"
  );

  if (summary.promotionReadyCandidateCount > summary.candidateCount) {
    throw new ValidationError(
      "Attempt promotion target requires summary.promotionReadyCandidateCount to be less than or equal to summary.candidateCount."
    );
  }
}

function validateBoolean(value: unknown, fieldName: string): void {
  if (typeof value !== "boolean") {
    throw new ValidationError(
      `Attempt promotion target requires ${fieldName} to be a boolean.`
    );
  }
}

function validateBlockingReasons(values: unknown): void {
  if (!Array.isArray(values)) {
    throw new ValidationError(
      "Attempt promotion target requires summary.blockingReasons to be an array."
    );
  }

  if (
    values.some(
      (value) =>
        typeof value !== "string" ||
        !validBlockingReasons.has(value as AttemptPromotionDecisionBlockingReason)
    )
  ) {
    throw new ValidationError(
      "Attempt promotion target requires summary.blockingReasons to use the existing promotion decision blocker vocabulary."
    );
  }
}

function validateSelectedCandidate(
  candidate: AttemptPromotionExplanationCandidate
): void {
  validateNonEmptyString(candidate.attemptId, "summary.selected.attemptId");
  validateNonEmptyString(candidate.runtime, "summary.selected.runtime");
  validateAttemptStatus(candidate.status);
  validateAttemptSourceKind(candidate.sourceKind);

  if (candidate.isSelected !== true) {
    throw new ValidationError(
      "Attempt promotion target requires summary.selected.isSelected to be true."
    );
  }

  validateBoolean(
    candidate.recommendedForPromotion,
    "summary.selected.recommendedForPromotion"
  );

  validateBoolean(
    candidate.hasComparablePayload,
    "summary.selected.hasComparablePayload"
  );

  if (!validExplanationCodes.has(candidate.explanationCode)) {
    throw new ValidationError(
      "Attempt promotion target requires summary.selected.explanationCode to use the existing promotion explanation vocabulary."
    );
  }

  if (candidate.explanationCode !== "selected") {
    throw new ValidationError(
      'Attempt promotion target requires summary.selected.explanationCode to be "selected".'
    );
  }

  validateCheckNameList(
    candidate.blockingRequiredCheckNames,
    "summary.selected.blockingRequiredCheckNames"
  );
  validateCheckNameList(
    candidate.failedOrErrorCheckNames,
    "summary.selected.failedOrErrorCheckNames"
  );
  validateCheckNameList(
    candidate.pendingCheckNames,
    "summary.selected.pendingCheckNames"
  );
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

function validateCheckNameList(
  values: readonly string[],
  fieldName: string
): void {
  if (!Array.isArray(values)) {
    throw new ValidationError(
      `Attempt promotion target requires ${fieldName} to be an array of non-empty strings.`
    );
  }

  if (
    values.some(
      (value) => typeof value !== "string" || value.trim().length === 0
    )
  ) {
    throw new ValidationError(
      `Attempt promotion target requires ${fieldName} to use non-empty string entries.`
    );
  }
}

function validateNonNegativeInteger(value: unknown, fieldName: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(
      `Attempt promotion target requires ${fieldName} to be a non-negative integer.`
    );
  }
}

function validateNonEmptyString(
  value: unknown,
  fieldName: string,
  errorMessage?: string
): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      errorMessage ??
        `Attempt promotion target requires ${fieldName} to be a non-empty string.`
    );
  }
}

function validateAttemptStatus(value: unknown): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      "Attempt promotion target requires summary.selected.status to use the existing attempt status vocabulary."
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
      "Attempt promotion target requires summary.selected.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  }
}

function blockingReasonArraysEqual(
  left: readonly AttemptPromotionDecisionBlockingReason[],
  right: readonly AttemptPromotionDecisionBlockingReason[]
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
