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

const ATTEMPT_HANDOFF_FINALIZATION_BASIS = "handoff_decision_summary" as const;
const ATTEMPT_HANDOFF_FINALIZATION_REQUEST_BASIS =
  "handoff_finalization_target_summary" as const;
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
    requestBasis: ATTEMPT_HANDOFF_FINALIZATION_REQUEST_BASIS,
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
        taskId: target.taskId,
        attemptId: target.attemptId,
        runtime: target.runtime,
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

  if (summary.targets.some((target) => !isRecord(target))) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.targets entries to be objects."
    );
  }

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

  const canonicalBlockingReasons = deriveCanonicalBlockingReasons(
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

  if (summary.canFinalizeHandoff) {
    if (summary.targets.length === 0) {
      throw new ValidationError(
        "Attempt handoff finalization request summary requires summary.targets to be non-empty when summary.canFinalizeHandoff is true."
      );
    }
  } else if (summary.targets.length > 0) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.targets to be empty when summary.canFinalizeHandoff is false."
    );
  }
}

function validateTaskId(value: unknown): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires target.taskId to be a non-empty string."
    );
  }
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

  if (
    value.some(
      (reason) =>
        typeof reason !== "string" ||
        !validBlockingReasons.has(reason as AttemptHandoffDecisionBlockingReason)
    )
  ) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.blockingReasons to use the existing handoff decision blocker vocabulary."
    );
  }
}

function deriveCanonicalBlockingReasons(
  resultCount: number,
  invokedResultCount: number
): AttemptHandoffDecisionBlockingReason[] {
  if (resultCount === 0) {
    return ["no_results"];
  }

  if (invokedResultCount > 0) {
    return [];
  }

  return ["handoff_unsupported"];
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

function validateNonEmptyString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Attempt handoff finalization request summary requires ${fieldName} to be a non-empty string.`
    );
  }
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
