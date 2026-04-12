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
  AttemptPromotionReport,
  AttemptSelectedIdentity
} from "./types.js";
import {
  rethrowSelectionAccessError
} from "./entry-validation.js";
import {
  validateDownstreamIdentityIngress
} from "./downstream-identity-guardrails.js";

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
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt promotion report requires summary to be an object."
    );
  }

  try {
    validateAuditBasis(summary);
    validateTaskId(summary.taskId);

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
      selectedIdentity: deriveSelectedIdentity(summary.taskId, candidates[0]),
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
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt promotion report requires summary to be a readable object."
    );
  }
}

function validateTaskId(value: unknown): void {
  if (
    value !== undefined &&
    (typeof value !== "string" || value.trim().length === 0)
  ) {
    throw new ValidationError(
      "Attempt promotion report requires summary.taskId to be a non-empty string when provided."
    );
  }
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
  if (!Array.isArray(summary.candidates)) {
    throw new ValidationError(
      "Attempt promotion report requires summary.candidates to be an array."
    );
  }

  validateCandidateEntries(summary.candidates);

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
    if (summary.selectedIdentity !== undefined) {
      throw new ValidationError(
        "Attempt promotion report requires summary.selectedIdentity to be undefined when candidates are empty."
      );
    }
  } else if (summary.selectedAttemptId !== summary.candidates[0]?.attemptId) {
    throw new ValidationError(
      "Attempt promotion report requires summary.selectedAttemptId to match the first candidate when candidates are present."
    );
  }

  summary.candidates.forEach(validatePromotionAuditCandidate);
  validateSelectedIdentity(
    summary.taskId,
    summary.selectedIdentity,
    summary.candidates[0]
  );
  validateCanonicalCandidateIdentity(summary.taskId, summary.candidates);

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

function validateCanonicalCandidateIdentity(
  taskId: AttemptPromotionAuditSummary["taskId"],
  candidates: readonly AttemptPromotionAuditCandidate[]
): void {
  validateDownstreamIdentityIngress(
    candidates.map((candidate) => ({
      taskId,
      attemptId: candidate.attemptId,
      runtime: candidate.runtime
    })),
    {
      required:
        "Attempt promotion report requires summary.taskId together with candidate.attemptId and candidate.runtime to be non-empty strings when candidates are present.",
      singleTask:
        "Attempt promotion report requires summary.candidates to remain within summary.taskId.",
      unique:
        "Attempt promotion report requires summary.candidates to use unique (taskId, attemptId, runtime) identities."
    }
  );
}

function validateCandidateEntries(
  candidates: readonly unknown[]
): void {
  for (let index = 0; index < candidates.length; index += 1) {
    if (!hasOwnIndex(candidates, index) || !isRecord(candidates[index])) {
      throw new ValidationError(
        "Attempt promotion report requires summary.candidates entries to be objects."
      );
    }
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

function deriveSelectedIdentity(
  taskId: AttemptPromotionAuditSummary["taskId"],
  candidate: AttemptPromotionAuditCandidate | undefined
): AttemptSelectedIdentity | undefined {
  if (candidate === undefined || taskId === undefined) {
    return undefined;
  }

  return {
    taskId,
    attemptId: candidate.attemptId,
    runtime: candidate.runtime
  };
}

function validateSelectedIdentity(
  taskId: AttemptPromotionAuditSummary["taskId"],
  selectedIdentity: AttemptPromotionAuditSummary["selectedIdentity"],
  candidate: AttemptPromotionAuditCandidate | undefined
): void {
  if (selectedIdentity === undefined) {
    return;
  }

  if (!isRecord(selectedIdentity)) {
    throw new ValidationError(
      "Attempt promotion report requires summary.selectedIdentity to be an object when provided."
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
    normalizedTaskId !== taskId ||
    normalizedAttemptId !== candidate.attemptId ||
    normalizedRuntime !== candidate.runtime
  ) {
    throw new ValidationError(
      "Attempt promotion report requires summary.selectedIdentity to match the first candidate."
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

function validateNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Attempt promotion report requires ${fieldName} to be a non-empty string.`
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

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}
