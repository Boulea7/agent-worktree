import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptHandoffDecisionBlockingReason,
  AttemptHandoffFinalizationRequestSummary,
  AttemptHandoffFinalizationTargetSummary
} from "./types.js";
import {
  attemptHandoffFinalizationRequestBasis,
  deriveCanonicalAttemptHandoffDecisionBlockingReasons
} from "./handoff-finalization-request-summary-shared.js";

const ATTEMPT_HANDOFF_FINALIZATION_BASIS = "handoff_decision_summary" as const;
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);
const validBlockingReasons =
  new Set<AttemptHandoffDecisionBlockingReason>([
    "no_results",
    "handoff_unsupported"
  ]);

export function deriveAttemptHandoffFinalizationRequestSummary(
  summary: AttemptHandoffFinalizationTargetSummary | undefined
): AttemptHandoffFinalizationRequestSummary | undefined {
  if (summary === undefined) {
    return undefined;
  }

  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary to be an object."
    );
  }

  validateSummaryBasis(summary);
  validateSummaryConsistency(summary);

  if (!summary.canFinalizeHandoff) {
    return undefined;
  }

  return {
    requestBasis: attemptHandoffFinalizationRequestBasis,
    resultCount: summary.resultCount,
    invokedResultCount: summary.invokedResultCount,
    blockedResultCount: summary.blockedResultCount,
    blockingReasons: [...summary.blockingReasons],
    canFinalizeHandoff: summary.canFinalizeHandoff,
    requests: summary.targets.map((target) => {
      validateTaskId(target.taskId);
      validateNonEmptyString(target.attemptId, "target.attemptId");
      validateNonEmptyString(target.runtime, "target.runtime");
      validateAttemptStatus(target.status);
      validateAttemptSourceKind(target.sourceKind);

      return {
        taskId: normalizeTaskId(target.taskId),
        attemptId: normalizeNonEmptyString(target.attemptId, "target.attemptId"),
        runtime: normalizeNonEmptyString(target.runtime, "target.runtime"),
        status: target.status,
        sourceKind: target.sourceKind
      };
    })
  };
}

function validateSummaryBasis(summary: AttemptHandoffFinalizationTargetSummary): void {
  if (summary.finalizationBasis !== ATTEMPT_HANDOFF_FINALIZATION_BASIS) {
    throw new ValidationError(
      'Attempt handoff finalization request summary requires summary.finalizationBasis to be "handoff_decision_summary".'
    );
  }
}

function validateSummaryConsistency(
  summary: AttemptHandoffFinalizationTargetSummary
): void {
  validateNonNegativeInteger(summary.resultCount, "summary.resultCount");
  validateNonNegativeInteger(
    summary.invokedResultCount,
    "summary.invokedResultCount"
  );
  validateNonNegativeInteger(
    summary.blockedResultCount,
    "summary.blockedResultCount"
  );
  validateBoolean(summary.canFinalizeHandoff, "summary.canFinalizeHandoff");
  validateBlockingReasons(summary.blockingReasons);

  if (!Array.isArray(summary.targets)) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.targets to be an array."
    );
  }

  validateTargets(summary.targets);

  if (summary.canFinalizeHandoff && summary.targets.length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.targets to be non-empty when summary.canFinalizeHandoff is true."
    );
  }

  if (summary.invokedResultCount !== summary.targets.length) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.invokedResultCount to match summary.targets.length."
    );
  }

  if (
    summary.blockedResultCount + summary.invokedResultCount !==
    summary.resultCount
  ) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.resultCount to equal summary.invokedResultCount plus summary.blockedResultCount."
    );
  }

  const canonicalBlockingReasons =
    deriveCanonicalAttemptHandoffDecisionBlockingReasons(
      summary.resultCount,
      summary.invokedResultCount
    );

  if (
    !blockingReasonArraysEqual(
      summary.blockingReasons,
      canonicalBlockingReasons
    )
  ) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.blockingReasons to match the canonical blocker derivation from summary result counts."
    );
  }

  if (summary.canFinalizeHandoff !== (summary.blockingReasons.length === 0)) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.canFinalizeHandoff to match whether summary.blockingReasons is empty."
    );
  }

  if (!summary.canFinalizeHandoff && summary.targets.length > 0) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.targets to be empty when summary.canFinalizeHandoff is false."
    );
  }
}

function validateTaskId(value: unknown): void {
  normalizeTaskId(value);
}

function validateNonNegativeInteger(value: unknown, fieldName: string): void {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new ValidationError(
      `Attempt handoff finalization request summary requires ${fieldName} to be a non-negative integer.`
    );
  }
}

function validateBoolean(value: unknown, fieldName: string): void {
  if (typeof value !== "boolean") {
    throw new ValidationError(
      `Attempt handoff finalization request summary requires ${fieldName} to be a boolean.`
    );
  }
}

function validateBlockingReasons(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.blockingReasons to be an array."
    );
  }

  for (let index = 0; index < value.length; index += 1) {
    if (
      !hasOwnIndex(value, index) ||
      typeof value[index] !== "string" ||
      !validBlockingReasons.has(
        value[index] as AttemptHandoffDecisionBlockingReason
      )
    ) {
      throw new ValidationError(
        "Attempt handoff finalization request summary requires summary.blockingReasons to use the existing handoff decision blocker vocabulary."
      );
    }
  }
}

function validateTargets(
  value: readonly unknown[]
): asserts value is AttemptHandoffFinalizationTargetSummary["targets"] {
  for (let index = 0; index < value.length; index += 1) {
    if (!hasOwnIndex(value, index) || !isRecord(value[index])) {
      throw new ValidationError(
        "Attempt handoff finalization request summary requires summary.targets entries to be objects."
      );
    }
  }
}

function blockingReasonArraysEqual(
  left: readonly AttemptHandoffDecisionBlockingReason[],
  right: readonly AttemptHandoffDecisionBlockingReason[]
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function validateNonEmptyString(value: unknown, fieldName: string): void {
  normalizeNonEmptyString(value, fieldName);
}

function normalizeTaskId(value: unknown): string {
  return normalizeNonEmptyString(value, "target.taskId");
}

function normalizeNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Attempt handoff finalization request summary requires ${fieldName} to be a non-empty string.`
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      `Attempt handoff finalization request summary requires ${fieldName} to be a non-empty string.`
    );
  }

  return normalized;
}

function validateAttemptStatus(value: unknown): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires target.status to use the existing attempt status vocabulary."
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
      "Attempt handoff finalization request summary requires target.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
