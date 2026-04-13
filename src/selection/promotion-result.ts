import { ValidationError } from "../core/errors.js";
import {
  attemptStatuses,
  type AttemptStatus
} from "../manifest/types.js";
import {
  compareAttemptVerificationCandidates
} from "../verification/compare.js";
import type {
  AttemptVerificationArtifactSummary,
  AttemptVerificationCounts,
  AttemptVerificationSummary
} from "../verification/types.js";
import {
  validatePromotionArtifactSummaryCheckNameLists
} from "./promotion-artifact-summary-guardrails.js";
import {
  validateDownstreamIdentityIngress
} from "./downstream-identity-guardrails.js";
import {
  normalizeSelectionObjectArrayEntry,
  readSelectionValue
} from "./entry-validation.js";
import { normalizePromotionAttemptSourceKind } from "./promotion-source-kind.js";
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
  if (!Array.isArray(candidates)) {
    throw new ValidationError(
      "Attempt promotion result requires candidates to be an array."
    );
  }

  const validatedCandidates = normalizePromotionCandidates(candidates);
  const firstCandidate = validatedCandidates[0];

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

  const taskId = firstCandidate.taskId;

  validateTaskBoundary(validatedCandidates, taskId);
  validateCanonicalCandidateIdentity(validatedCandidates);

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

function normalizePromotionCandidates(
  candidates: readonly AttemptPromotionCandidate[]
): AttemptPromotionCandidate[] {
  const validatedCandidates: AttemptPromotionCandidate[] = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = normalizeSelectionObjectArrayEntry<Record<string, unknown>>(
      candidates,
      index,
      "Attempt promotion result requires candidates entries to be objects."
    );

    validatedCandidates.push(normalizePromotionCandidate(candidate));
  }

  return validatedCandidates;
}

function compareAttemptPromotionCandidates(
  left: AttemptPromotionCandidate,
  right: AttemptPromotionCandidate
): number {
  return (
    compareAttemptVerificationCandidates(
      {
        attemptId: left.attemptId,
        summary: left.summary
      },
      {
        attemptId: right.attemptId,
        summary: right.summary
      }
    ) ||
    left.runtime.localeCompare(right.runtime) ||
    left.taskId.localeCompare(right.taskId)
  );
}

function normalizePromotionCandidate(
  candidate: Record<string, unknown>
): AttemptPromotionCandidate {
  const promotionBasis = readSelectionValue(
    candidate,
    "promotionBasis",
    'Attempt promotion result requires candidate.promotionBasis to be "verification_artifact_summary".'
  );

  if (promotionBasis !== ATTEMPT_PROMOTION_BASIS) {
    throw new ValidationError(
      'Attempt promotion result requires candidate.promotionBasis to be "verification_artifact_summary".'
    );
  }

  const attemptId = normalizeRequiredString(
    readSelectionValue(
      candidate,
      "attemptId",
      "Attempt promotion result requires candidate.attemptId to be a non-empty string."
    ),
    "candidate.attemptId"
  );
  const taskId = normalizeRequiredString(
    readSelectionValue(
      candidate,
      "taskId",
      "Attempt promotion result requires candidate.taskId to be a non-empty string."
    ),
    "candidate.taskId"
  );
  const runtime = normalizeRequiredString(
    readSelectionValue(
      candidate,
      "runtime",
      "Attempt promotion result requires candidate.runtime to be a non-empty string."
    ),
    "candidate.runtime"
  );
  const status = normalizeAttemptStatus(
    readSelectionValue(
      candidate,
      "status",
      "Attempt promotion result requires candidate.status to use the existing attempt status vocabulary."
    )
  );
  const sourceKind = normalizePromotionAttemptSourceKind(
    readSelectionValue(
      candidate,
      "sourceKind",
      "Attempt promotion result requires candidate.sourceKind to use the existing attempt source-kind vocabulary when provided."
    ),
    "Attempt promotion result requires candidate.sourceKind to use the existing attempt source-kind vocabulary when provided."
  );
  const artifactSummary = readSelectionValue(
    candidate,
    "artifactSummary",
    "Attempt promotion result requires candidate.artifactSummary to be an object."
  );
  const summary = readSelectionValue(
    candidate,
    "summary",
    "Attempt promotion result requires candidate.summary to match candidate.artifactSummary.summary."
  );
  const recommendedForPromotion = readSelectionValue(
    candidate,
    "recommendedForPromotion",
    "Attempt promotion result requires candidate.recommendedForPromotion to match candidate.summary.isSelectionReady."
  );

  if (!isRecord(artifactSummary)) {
    throw new ValidationError(
      "Attempt promotion result requires candidate.artifactSummary to be an object."
    );
  }

  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt promotion result requires candidate.summary to be an object."
    );
  }

  if (
    readSelectionValue(
      artifactSummary,
      "summaryBasis",
      'Attempt promotion result requires candidate.artifactSummary.summaryBasis to be "verification_execution".'
    ) !== VERIFICATION_ARTIFACT_SUMMARY_BASIS
  ) {
    throw new ValidationError(
      'Attempt promotion result requires candidate.artifactSummary.summaryBasis to be "verification_execution".'
    );
  }

  const normalizedArtifactSummary = normalizeArtifactSummary(
    artifactSummary
  );
  const normalizedSummary = normalizeVerificationSummary(
    summary,
    "Attempt promotion result requires candidate.summary to be an object."
  );

  validatePromotionArtifactSummaryCheckNameLists({
    artifactSummary: normalizedArtifactSummary,
    errorPrefix: "Attempt promotion result requires",
    summaryField: "candidate.artifactSummary"
  });
  const normalizedCandidate = {
    promotionBasis: ATTEMPT_PROMOTION_BASIS,
    attemptId,
    taskId,
    runtime,
    status,
    sourceKind,
    summary: normalizedSummary,
    artifactSummary: normalizedArtifactSummary,
    recommendedForPromotion:
      recommendedForPromotion as AttemptPromotionCandidate["recommendedForPromotion"]
  } satisfies AttemptPromotionCandidate;

  validateRecommendationConsistency(normalizedCandidate);
  validateSummaryConsistency(
    normalizedCandidate.summary,
    normalizedCandidate.artifactSummary.summary
  );

  return normalizedCandidate;
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

function validateCanonicalCandidateIdentity(
  candidates: readonly AttemptPromotionCandidate[]
): void {
  validateDownstreamIdentityIngress(candidates, {
    required:
      "Attempt promotion result requires candidates entries to include non-empty taskId, attemptId, and runtime strings.",
    singleTask:
      "Attempt promotion result requires candidates from a single taskId.",
    unique:
      "Attempt promotion result requires candidates to use unique (taskId, attemptId, runtime) identities."
  });
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

function normalizeArtifactSummary(
  artifactSummary: Record<string, unknown>
): AttemptVerificationArtifactSummary {
  const summaryBasis = readSelectionValue(
    artifactSummary,
    "summaryBasis",
    "Attempt promotion result requires candidate.artifactSummary to be an object."
  );
  const summary = normalizeVerificationSummary(
    readSelectionValue(
      artifactSummary,
      "summary",
      "Attempt promotion result requires candidate.artifactSummary.summary to be an object."
    ),
    "Attempt promotion result requires candidate.artifactSummary.summary to be an object."
  );
  const checks = readSelectionValue(
    artifactSummary,
    "checks",
    "Attempt promotion result requires candidate.artifactSummary.checks to be an array."
  );
  const blockingRequiredCheckNames = readSelectionValue(
    artifactSummary,
    "blockingRequiredCheckNames",
    "Attempt promotion result requires candidate.artifactSummary.blockingRequiredCheckNames to match candidate.artifactSummary.checks."
  );
  const failedOrErrorCheckNames = readSelectionValue(
    artifactSummary,
    "failedOrErrorCheckNames",
    "Attempt promotion result requires candidate.artifactSummary.failedOrErrorCheckNames to match candidate.artifactSummary.checks."
  );
  const pendingCheckNames = readSelectionValue(
    artifactSummary,
    "pendingCheckNames",
    "Attempt promotion result requires candidate.artifactSummary.pendingCheckNames to match candidate.artifactSummary.checks."
  );
  const skippedCheckNames = readSelectionValue(
    artifactSummary,
    "skippedCheckNames",
    "Attempt promotion result requires candidate.artifactSummary.skippedCheckNames to match candidate.artifactSummary.checks."
  );
  const passedCheckNames = readSelectionValue(
    artifactSummary,
    "passedCheckNames",
    "Attempt promotion result requires candidate.artifactSummary.passedCheckNames to match candidate.artifactSummary.checks."
  );
  const recommendedForPromotion = readSelectionValue(
    artifactSummary,
    "recommendedForPromotion",
    "Attempt promotion result requires candidate.recommendedForPromotion to match candidate.artifactSummary.recommendedForPromotion."
  );

  return {
    summaryBasis: summaryBasis as AttemptVerificationArtifactSummary["summaryBasis"],
    summary,
    checks: checks as AttemptVerificationArtifactSummary["checks"],
    blockingRequiredCheckNames:
      blockingRequiredCheckNames as AttemptVerificationArtifactSummary["blockingRequiredCheckNames"],
    failedOrErrorCheckNames:
      failedOrErrorCheckNames as AttemptVerificationArtifactSummary["failedOrErrorCheckNames"],
    pendingCheckNames:
      pendingCheckNames as AttemptVerificationArtifactSummary["pendingCheckNames"],
    skippedCheckNames:
      skippedCheckNames as AttemptVerificationArtifactSummary["skippedCheckNames"],
    passedCheckNames:
      passedCheckNames as AttemptVerificationArtifactSummary["passedCheckNames"],
    recommendedForPromotion:
      recommendedForPromotion as AttemptVerificationArtifactSummary["recommendedForPromotion"]
  };
}

function normalizeVerificationSummary(
  summary: unknown,
  message: string
): AttemptVerificationSummary {
  if (!isRecord(summary)) {
    throw new ValidationError(message);
  }

  const counts = readSelectionValue(summary, "counts", message);

  if (!isRecord(counts)) {
    throw new ValidationError(message);
  }

  return {
    sourceState: readSelectionValue(summary, "sourceState", message) as string,
    overallOutcome: readSelectionValue(summary, "overallOutcome", message) as AttemptVerificationSummary["overallOutcome"],
    requiredOutcome: readSelectionValue(summary, "requiredOutcome", message) as AttemptVerificationSummary["requiredOutcome"],
    hasInvalidChecks: readSelectionValue(summary, "hasInvalidChecks", message) as boolean,
    hasComparablePayload: readSelectionValue(summary, "hasComparablePayload", message) as boolean,
    isSelectionReady: readSelectionValue(summary, "isSelectionReady", message) as boolean,
    counts: {
      total: readSelectionValue(counts, "total", message) as number,
      valid: readSelectionValue(counts, "valid", message) as number,
      invalid: readSelectionValue(counts, "invalid", message) as number,
      required: readSelectionValue(counts, "required", message) as number,
      optional: readSelectionValue(counts, "optional", message) as number,
      passed: readSelectionValue(counts, "passed", message) as number,
      failed: readSelectionValue(counts, "failed", message) as number,
      pending: readSelectionValue(counts, "pending", message) as number,
      skipped: readSelectionValue(counts, "skipped", message) as number,
      error: readSelectionValue(counts, "error", message) as number
    }
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
