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
  AttemptPromotionExplanationSummary,
  AttemptSelectedIdentity
} from "./types.js";
import {
  accessSelectionValue,
  rethrowSelectionAccessError
} from "./entry-validation.js";
import {
  validateDownstreamIdentityIngress
} from "./downstream-identity-guardrails.js";

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
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary to be an object."
    );
  }

  try {
    const normalizedSummary = normalizePromotionExplanationInput(summary);

    validateExplanationBasis(normalizedSummary);
    validateTaskId(normalizedSummary.taskId);
    const normalizedTaskId = normalizeOptionalTaskId(normalizedSummary.taskId);
    validatePromotionExplanationSummary(normalizedSummary, normalizedTaskId);

    const selected =
      normalizedSummary.candidates[0] === undefined
        ? undefined
        : cloneExplanationCandidate(normalizedSummary.candidates[0]);
    const blockingReasons = deriveBlockingReasons(
      selected,
      normalizedSummary.candidateCount
    );

    return {
      decisionBasis: ATTEMPT_PROMOTION_DECISION_BASIS,
      taskId: normalizedTaskId,
      selectedAttemptId: normalizedSummary.selectedAttemptId,
      selectedIdentity: deriveSelectedIdentity(normalizedTaskId, selected),
      candidateCount: normalizedSummary.candidates.length,
      comparableCandidateCount: countComparableCandidates(normalizedSummary.candidates),
      promotionReadyCandidateCount: countPromotionReadyCandidates(
        normalizedSummary.candidates
      ),
      recommendedForPromotion:
        normalizedSummary.candidates[0]?.recommendedForPromotion ?? false,
      selected,
      blockingReasons,
      canPromote: blockingReasons.length === 0,
      hasBlockingReasons: blockingReasons.length > 0
    };
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt promotion decision summary requires summary to be a readable object."
    );
  }
}

function normalizePromotionExplanationInput(
  summary: Record<string, unknown>
): AttemptPromotionExplanationSummary {
  return {
    explanationBasis: accessSelectionValue(summary, "explanationBasis") as AttemptPromotionExplanationSummary["explanationBasis"],
    taskId: accessSelectionValue(summary, "taskId") as AttemptPromotionExplanationSummary["taskId"],
    selectedAttemptId: accessSelectionValue(summary, "selectedAttemptId") as AttemptPromotionExplanationSummary["selectedAttemptId"],
    selectedIdentity: accessSelectionValue(summary, "selectedIdentity") as AttemptPromotionExplanationSummary["selectedIdentity"],
    candidateCount: accessSelectionValue(summary, "candidateCount") as AttemptPromotionExplanationSummary["candidateCount"],
    comparableCandidateCount: accessSelectionValue(summary, "comparableCandidateCount") as AttemptPromotionExplanationSummary["comparableCandidateCount"],
    promotionReadyCandidateCount: accessSelectionValue(summary, "promotionReadyCandidateCount") as AttemptPromotionExplanationSummary["promotionReadyCandidateCount"],
    recommendedForPromotion: accessSelectionValue(summary, "recommendedForPromotion") as AttemptPromotionExplanationSummary["recommendedForPromotion"],
    selected: accessSelectionValue(summary, "selected") as AttemptPromotionExplanationSummary["selected"],
    candidates: accessSelectionValue(summary, "candidates") as AttemptPromotionExplanationSummary["candidates"]
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
  if (
    value !== undefined &&
    (typeof value !== "string" || value.trim().length === 0)
  ) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.taskId to be a non-empty string when provided."
    );
  }
}

function validatePromotionExplanationSummary(
  summary: AttemptPromotionExplanationSummary,
  normalizedTaskId: AttemptPromotionExplanationSummary["taskId"]
): void {
  if (!Array.isArray(summary.candidates)) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.candidates to be an array."
    );
  }

  validateCandidateEntries(summary.candidates);

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
    if (summary.selectedIdentity !== undefined) {
      throw new ValidationError(
        "Attempt promotion decision summary requires summary.selectedIdentity to be undefined when candidates are empty."
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

    const canonicalExplanationCode = deriveCanonicalExplanationCode(
      candidate,
      index
    );

    if (candidate.explanationCode !== canonicalExplanationCode) {
      throw new ValidationError(
        "Attempt promotion decision summary requires candidate.explanationCode to match the canonical explanation derived from candidate state."
      );
    }
  });

  validateSelectedIdentity(
    normalizedTaskId,
    summary.selectedIdentity,
    summary.candidates[0]
  );
  validateCanonicalCandidateIdentity(normalizedTaskId, summary.candidates);
  validateSelectedCandidate(summary.selected, summary.candidates.length);

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

  const comparableCandidateCount = countComparableCandidates(summary.candidates);

  if (summary.comparableCandidateCount !== comparableCandidateCount) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.comparableCandidateCount to match the count derived from summary.candidates."
    );
  }
}

function validateCandidateEntries(
  candidates: readonly unknown[]
): void {
  for (let index = 0; index < candidates.length; index += 1) {
    if (!hasOwnIndex(candidates, index) || !isRecord(candidates[index])) {
      throw new ValidationError(
        "Attempt promotion decision summary requires summary.candidates entries to be objects."
      );
    }
  }
}

function validateCanonicalCandidateIdentity(
  taskId: AttemptPromotionExplanationSummary["taskId"],
  candidates: readonly AttemptPromotionExplanationCandidate[]
): void {
  validateDownstreamIdentityIngress(
    candidates.map((candidate) => ({
      taskId,
      attemptId: candidate.attemptId,
      runtime: candidate.runtime
    })),
    {
      required:
        "Attempt promotion decision summary requires summary.taskId together with candidate.attemptId and candidate.runtime to be non-empty strings when candidates are present.",
      singleTask:
        "Attempt promotion decision summary requires summary.candidates to remain within summary.taskId.",
      unique:
        "Attempt promotion decision summary requires summary.candidates to use unique (taskId, attemptId, runtime) identities."
    }
  );
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

  if (typeof candidate.hasComparablePayload !== "boolean") {
    throw new ValidationError(
      "Attempt promotion decision summary requires candidate.hasComparablePayload to be a boolean."
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

function validateSelectedCandidate(
  selected: AttemptPromotionExplanationSummary["selected"],
  candidateCount: number
): void {
  if (selected === undefined) {
    return;
  }

  if (!isRecord(selected)) {
    throw new ValidationError(
      candidateCount === 0
        ? "Attempt promotion decision summary requires summary.selected to be undefined when candidates are empty."
        : "Attempt promotion decision summary requires summary.selected to be an object when candidates are present."
    );
  }
}

function deriveSelectedIdentity(
  taskId: AttemptPromotionExplanationSummary["taskId"],
  candidate: AttemptPromotionExplanationCandidate | undefined
): AttemptSelectedIdentity | undefined {
  const normalizedTaskId = normalizeComparableString(taskId);
  const normalizedAttemptId = normalizeComparableString(candidate?.attemptId);
  const normalizedRuntime = normalizeComparableString(candidate?.runtime);

  if (
    normalizedTaskId === undefined ||
    normalizedAttemptId === undefined ||
    normalizedRuntime === undefined
  ) {
    return undefined;
  }

  return {
    taskId: normalizedTaskId,
    attemptId: normalizedAttemptId,
    runtime: normalizedRuntime
  };
}

function validateSelectedIdentity(
  taskId: AttemptPromotionExplanationSummary["taskId"],
  selectedIdentity: AttemptPromotionExplanationSummary["selectedIdentity"],
  candidate: AttemptPromotionExplanationCandidate | undefined
): void {
  if (selectedIdentity === undefined) {
    if (candidate === undefined) {
      return;
    }

    throw new ValidationError(
      "Attempt promotion decision summary requires summary.selectedIdentity to be defined when candidates are present."
    );
  }

  if (!isRecord(selectedIdentity)) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.selectedIdentity to be an object when provided."
    );
  }

  const normalizedTaskId = validateNonEmptyString(
    selectedIdentity.taskId,
    "summary.selectedIdentity.taskId"
  );
  const normalizedAttemptId = validateNonEmptyString(
    selectedIdentity.attemptId,
    "summary.selectedIdentity.attemptId"
  );
  const normalizedRuntime = validateNonEmptyString(
    selectedIdentity.runtime,
    "summary.selectedIdentity.runtime"
  );

  if (
    taskId === undefined ||
    candidate === undefined ||
    normalizedTaskId !== normalizeComparableString(taskId) ||
    normalizedAttemptId !== normalizeComparableString(candidate.attemptId) ||
    normalizedRuntime !== normalizeComparableString(candidate.runtime)
  ) {
    throw new ValidationError(
      "Attempt promotion decision summary requires summary.selectedIdentity to match the first candidate."
    );
  }
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
  const {
    hasRequiredSkipped,
    hasRequiredFailure,
    hasRequiredPending
  } = deriveBlockingCheckFlags(selected);

  if (
    hasRequiredFailure ||
    hasRequiredSkipped ||
    (selected.blockingRequiredCheckNames.length > 0 && !hasRequiredPending)
  ) {
    blockingReasons.push("required_checks_failed");
  }

  if (hasRequiredPending) {
    blockingReasons.push("required_checks_pending");
  }

  if (blockingReasons.length === 0) {
    blockingReasons.push("verification_incomplete");
  }

  return blockingReasons;
}

function deriveCanonicalExplanationCode(
  candidate: AttemptPromotionExplanationCandidate,
  index: number
): AttemptPromotionExplanationCode {
  if (index === 0) {
    return "selected";
  }

  if (candidate.recommendedForPromotion) {
    return "promotion_ready";
  }

  const {
    hasRequiredSkipped,
    hasRequiredFailure,
    hasRequiredPending
  } = deriveBlockingCheckFlags(candidate);

  if (
    hasRequiredFailure ||
    hasRequiredSkipped ||
    (candidate.blockingRequiredCheckNames.length > 0 && !hasRequiredPending)
  ) {
    return "required_checks_failed";
  }

  if (hasRequiredPending) {
    return "required_checks_pending";
  }

  return "verification_incomplete";
}

function deriveBlockingCheckFlags(
  candidate: AttemptPromotionExplanationCandidate
): {
  hasRequiredSkipped: boolean;
  hasRequiredFailure: boolean;
  hasRequiredPending: boolean;
} {
  return {
    hasRequiredSkipped: candidate.blockingRequiredCheckNames.some((name) =>
      candidate.skippedCheckNames.includes(name)
    ),
    hasRequiredFailure: candidate.blockingRequiredCheckNames.some((name) =>
      candidate.failedOrErrorCheckNames.includes(name)
    ),
    hasRequiredPending: candidate.blockingRequiredCheckNames.some((name) =>
      candidate.pendingCheckNames.includes(name)
    )
  };
}

function countPromotionReadyCandidates(
  candidates: readonly AttemptPromotionExplanationCandidate[]
): number {
  return candidates.filter((candidate) => candidate.recommendedForPromotion)
    .length;
}

function countComparableCandidates(
  candidates: readonly AttemptPromotionExplanationCandidate[]
): number {
  return candidates.filter((candidate) => candidate.hasComparablePayload).length;
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
    left.hasComparablePayload === right.hasComparablePayload &&
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
    stringArraysEqual(left.pendingCheckNames, right.pendingCheckNames) &&
    stringArraysEqual(left.skippedCheckNames, right.skippedCheckNames)
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
    hasComparablePayload: candidate.hasComparablePayload,
    isSelected: candidate.isSelected,
    recommendedForPromotion: candidate.recommendedForPromotion,
    explanationCode: candidate.explanationCode,
    blockingRequiredCheckNames: [...candidate.blockingRequiredCheckNames],
    failedOrErrorCheckNames: [...candidate.failedOrErrorCheckNames],
    pendingCheckNames: [...candidate.pendingCheckNames],
    skippedCheckNames: [...candidate.skippedCheckNames]
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

function normalizeOptionalTaskId(
  value: AttemptPromotionExplanationSummary["taskId"]
): AttemptPromotionExplanationSummary["taskId"] {
  return value === undefined ? undefined : value.trim();
}

function normalizeComparableString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : undefined;
}

function validateNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Attempt promotion decision summary requires ${fieldName} to be a non-empty string.`
    );
  }

  return value.trim();
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
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
