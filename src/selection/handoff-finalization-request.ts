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
import {
  accessSelectionValue,
  rethrowSelectionAccessError
} from "./entry-validation.js";
import {
  validateDownstreamSingleTaskBoundary,
  validateDownstreamUniqueIdentity
} from "./downstream-identity-guardrails.js";

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

  try {
    validateSummaryBasis(summary);
    const normalizedSummary = validateSummaryConsistency(summary);

    if (!normalizedSummary.canFinalizeHandoff) {
      return undefined;
    }

    return {
      requestBasis: attemptHandoffFinalizationRequestBasis,
      resultCount: normalizedSummary.resultCount,
      invokedResultCount: normalizedSummary.invokedResultCount,
      blockedResultCount: normalizedSummary.blockedResultCount,
      blockingReasons: [...normalizedSummary.blockingReasons],
      canFinalizeHandoff: normalizedSummary.canFinalizeHandoff,
      requests: normalizedSummary.targets.map((target) => {
        validateTaskId(target.taskId);
        validateNonEmptyString(target.attemptId, "target.attemptId");
        validateNonEmptyString(target.runtime, "target.runtime");
        validateAttemptStatus(target.status);
        validateAttemptSourceKind(target.sourceKind);

        return {
          taskId: normalizeTaskId(target.taskId),
          attemptId: normalizeNonEmptyString(
            target.attemptId,
            "target.attemptId"
          ),
          runtime: normalizeNonEmptyString(target.runtime, "target.runtime"),
          status: target.status,
          sourceKind: target.sourceKind
        };
      })
    };
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt handoff finalization request summary requires summary to be a readable object."
    );
  }
}

function validateSummaryBasis(summary: AttemptHandoffFinalizationTargetSummary): void {
  if (
    accessSelectionValue(summary, "finalizationBasis") !==
    ATTEMPT_HANDOFF_FINALIZATION_BASIS
  ) {
    throw new ValidationError(
      'Attempt handoff finalization request summary requires summary.finalizationBasis to be "handoff_decision_summary".'
    );
  }
}

function validateSummaryConsistency(
  summary: AttemptHandoffFinalizationTargetSummary
): {
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  canFinalizeHandoff: boolean;
  blockingReasons: AttemptHandoffDecisionBlockingReason[];
  targets: Array<{
    taskId: string;
    attemptId: string;
    runtime: string;
    status: AttemptStatus;
    sourceKind: AttemptSourceKind | undefined;
  }>;
} {
  const resultCount = readNonNegativeInteger(summary, "resultCount");
  const invokedResultCount = readNonNegativeInteger(summary, "invokedResultCount");
  const blockedResultCount = readNonNegativeInteger(summary, "blockedResultCount");
  const canFinalizeHandoff = readBoolean(summary, "canFinalizeHandoff");
  const blockingReasons = normalizeBlockingReasons(
    accessSelectionValue(summary, "blockingReasons")
  );
  const targetsValue = accessSelectionValue(summary, "targets");

  if (!Array.isArray(targetsValue)) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.targets to be an array."
    );
  }

  const targets = normalizeTargets(targetsValue);
  validateDownstreamSingleTaskBoundary(
    targets,
    "Attempt handoff finalization request summary requires summary.targets from a single taskId."
  );
  validateDownstreamUniqueIdentity(
    targets,
    "Attempt handoff finalization request summary requires summary.targets to use unique (taskId, attemptId, runtime) identities."
  );

  if (canFinalizeHandoff && targets.length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.targets to be non-empty when summary.canFinalizeHandoff is true."
    );
  }

  if (invokedResultCount !== targets.length) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.invokedResultCount to match summary.targets.length."
    );
  }

  if (
    blockedResultCount + invokedResultCount !==
    resultCount
  ) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.resultCount to equal summary.invokedResultCount plus summary.blockedResultCount."
    );
  }

  const canonicalBlockingReasons =
    deriveCanonicalAttemptHandoffDecisionBlockingReasons(
      resultCount,
      invokedResultCount
    );

  if (
    !blockingReasonArraysEqual(
      blockingReasons,
      canonicalBlockingReasons
    )
  ) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.blockingReasons to match the canonical blocker derivation from summary result counts."
    );
  }

  if (canFinalizeHandoff !== (blockingReasons.length === 0)) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.canFinalizeHandoff to match whether summary.blockingReasons is empty."
    );
  }

  if (!canFinalizeHandoff && targets.length > 0) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.targets to be empty when summary.canFinalizeHandoff is false."
    );
  }

  return {
    resultCount,
    invokedResultCount,
    blockedResultCount,
    canFinalizeHandoff,
    blockingReasons,
    targets
  };
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

function readNonNegativeInteger(
  container: object,
  key: string
): number {
  const value = accessSelectionValue(container, key);
  validateNonNegativeInteger(value, `summary.${key}`);
  return value as number;
}

function readBoolean(
  container: object,
  key: string
): boolean {
  const value = accessSelectionValue(container, key);
  validateBoolean(value, `summary.${key}`);
  return value as boolean;
}

function normalizeBlockingReasons(
  value: unknown
): AttemptHandoffDecisionBlockingReason[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "Attempt handoff finalization request summary requires summary.blockingReasons to be an array."
    );
  }

  const blockingReasons: AttemptHandoffDecisionBlockingReason[] = [];
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

    blockingReasons.push(
      value[index] as AttemptHandoffDecisionBlockingReason
    );
  }

  return blockingReasons;
}

function normalizeTargets(value: readonly unknown[]): Array<{
  taskId: string;
  attemptId: string;
  runtime: string;
  status: AttemptStatus;
  sourceKind: AttemptSourceKind | undefined;
}> {
  const targets: Array<{
    taskId: string;
    attemptId: string;
    runtime: string;
    status: AttemptStatus;
    sourceKind: AttemptSourceKind | undefined;
  }> = [];

  for (let index = 0; index < value.length; index += 1) {
    if (!hasOwnIndex(value, index) || !isRecord(value[index])) {
      throw new ValidationError(
        "Attempt handoff finalization request summary requires summary.targets entries to be objects."
      );
    }

    const target = value[index] as Record<string, unknown>;
    const taskId = normalizeTaskId(accessSelectionValue(target, "taskId"));
    const attemptId = normalizeNonEmptyString(
      accessSelectionValue(target, "attemptId"),
      "target.attemptId"
    );
    const runtime = normalizeNonEmptyString(
      accessSelectionValue(target, "runtime"),
      "target.runtime"
    );
    const status = accessSelectionValue(target, "status");
    const sourceKind = accessSelectionValue(target, "sourceKind");
    validateAttemptStatus(status);
    validateAttemptSourceKind(sourceKind);

    targets.push({
      taskId,
      attemptId,
      runtime,
      status: status as AttemptStatus,
      sourceKind: sourceKind as AttemptSourceKind | undefined
    });
  }

  return targets;
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
