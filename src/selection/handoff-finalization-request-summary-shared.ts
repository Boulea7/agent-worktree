import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptHandoffDecisionBlockingReason,
  AttemptHandoffFinalizationRequestSummary
} from "./types.js";
import { validateDownstreamIdentityIngress } from "./downstream-identity-guardrails.js";
import {
  accessSelectionValue,
  rethrowSelectionAccessError,
  validateSelectionArray,
  validateSelectionObjectArrayEntries,
  validateSelectionObjectInput
} from "./entry-validation.js";

export const attemptHandoffFinalizationRequestBasis =
  "handoff_finalization_target_summary" as const;

const validAttemptHandoffDecisionBlockingReasons =
  new Set<AttemptHandoffDecisionBlockingReason>([
    "no_results",
    "handoff_unsupported"
  ]);
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function deriveCanonicalAttemptHandoffDecisionBlockingReasons(
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

export function validateAttemptHandoffFinalizationRequestSummaryForApply(
  summary: AttemptHandoffFinalizationRequestSummary
): void {
  try {
    validateSelectionObjectInput(
      summary,
      "Attempt handoff finalization request apply requires summary to be an object."
    );

    const normalizedSummary = normalizeSummary(summary);

    validateDownstreamIdentityIngress(normalizedSummary.requests, {
      required:
        "Attempt handoff finalization request apply requires summary.requests entries to use non-empty taskId, attemptId, and runtime strings.",
      singleTask:
        "Attempt handoff finalization request apply requires summary.requests from a single taskId.",
      unique:
        "Attempt handoff finalization request apply requires summary.requests to use unique (taskId, attemptId, runtime) identities."
    });

    if (
      normalizedSummary.canFinalizeHandoff &&
      normalizedSummary.requests.length === 0
    ) {
      throw new ValidationError(
        "Attempt handoff finalization request apply requires summary.requests to be non-empty when summary.canFinalizeHandoff is true."
      );
    }

    if (
      !normalizedSummary.canFinalizeHandoff &&
      normalizedSummary.requests.length > 0
    ) {
      throw new ValidationError(
        "Attempt handoff finalization request apply requires summary.requests to be empty when summary.canFinalizeHandoff is false."
      );
    }

    if (
      normalizedSummary.invokedResultCount !== normalizedSummary.requests.length
    ) {
      throw new ValidationError(
        "Attempt handoff finalization request apply requires summary.invokedResultCount to match summary.requests.length."
      );
    }

    if (
      normalizedSummary.blockedResultCount +
        normalizedSummary.invokedResultCount !==
      normalizedSummary.resultCount
    ) {
      throw new ValidationError(
        "Attempt handoff finalization request apply requires summary.resultCount to equal summary.invokedResultCount plus summary.blockedResultCount."
      );
    }

    const canonicalBlockingReasons =
      deriveCanonicalAttemptHandoffDecisionBlockingReasons(
        normalizedSummary.resultCount,
        normalizedSummary.invokedResultCount
      );

    if (
      !blockingReasonArraysEqual(
        normalizedSummary.blockingReasons,
        canonicalBlockingReasons
      )
    ) {
      throw new ValidationError(
        "Attempt handoff finalization request apply requires summary.blockingReasons to match the canonical blocker derivation from summary result counts."
      );
    }

    if (
      normalizedSummary.canFinalizeHandoff !==
      (normalizedSummary.blockingReasons.length === 0)
    ) {
      throw new ValidationError(
        "Attempt handoff finalization request apply requires summary.canFinalizeHandoff to match whether summary.blockingReasons is empty."
      );
    }
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt handoff finalization request apply requires summary to be a readable object."
    );
  }
}

function normalizeSummary(
  summary: Record<string, unknown>
): AttemptHandoffFinalizationRequestSummary {
  const requestBasis = accessSelectionValue(summary, "requestBasis");
  const resultCount = accessSelectionValue(summary, "resultCount");
  const invokedResultCount = accessSelectionValue(summary, "invokedResultCount");
  const blockedResultCount = accessSelectionValue(summary, "blockedResultCount");
  const canFinalizeHandoff = accessSelectionValue(summary, "canFinalizeHandoff");

  if (requestBasis !== attemptHandoffFinalizationRequestBasis) {
    throw new ValidationError(
      'Attempt handoff finalization request apply requires summary.requestBasis to be "handoff_finalization_target_summary".'
    );
  }

  validateNonNegativeInteger(resultCount, "summary.resultCount");
  validateNonNegativeInteger(
    invokedResultCount,
    "summary.invokedResultCount"
  );
  validateNonNegativeInteger(
    blockedResultCount,
    "summary.blockedResultCount"
  );
  validateBoolean(
    canFinalizeHandoff,
    "summary.canFinalizeHandoff"
  );
  const blockingReasons = normalizeBlockingReasons(
    accessSelectionValue(summary, "blockingReasons")
  );
  const requests = normalizeRequests(accessSelectionValue(summary, "requests"));

  return {
    requestBasis: attemptHandoffFinalizationRequestBasis,
    resultCount: resultCount as number,
    invokedResultCount: invokedResultCount as number,
    blockedResultCount: blockedResultCount as number,
    blockingReasons,
    canFinalizeHandoff: canFinalizeHandoff as boolean,
    requests
  };
}

function validateNonNegativeInteger(value: unknown, fieldName: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(
      `Attempt handoff finalization request apply requires ${fieldName} to be a non-negative integer.`
    );
  }
}

function validateBoolean(value: unknown, fieldName: string): void {
  if (typeof value !== "boolean") {
    throw new ValidationError(
      `Attempt handoff finalization request apply requires ${fieldName} to be a boolean.`
    );
  }
}

function normalizeBlockingReasons(
  value: unknown
): AttemptHandoffDecisionBlockingReason[] {
  validateSelectionArray(
    value,
    "Attempt handoff finalization request apply requires summary.blockingReasons to be an array."
  );

  const blockingReasons: AttemptHandoffDecisionBlockingReason[] = [];

  for (let index = 0; index < value.length; index += 1) {
    if (
      !hasOwnIndex(value, index) ||
      typeof value[index] !== "string" ||
      !validAttemptHandoffDecisionBlockingReasons.has(
        value[index] as AttemptHandoffDecisionBlockingReason
      )
    ) {
      throw new ValidationError(
        "Attempt handoff finalization request apply requires summary.blockingReasons to use the existing handoff decision blocker vocabulary."
      );
    }

    blockingReasons.push(
      value[index] as AttemptHandoffDecisionBlockingReason
    );
  }

  return blockingReasons;
}

function normalizeRequests(
  value: unknown
): AttemptHandoffFinalizationRequestSummary["requests"] {
  validateSelectionArray(
    value,
    "Attempt handoff finalization request apply requires summary.requests to be an array."
  );
  validateSelectionObjectArrayEntries(
    value,
    "Attempt handoff finalization request apply requires summary.requests entries to be objects."
  );

  const requests: AttemptHandoffFinalizationRequestSummary["requests"] = [];

  for (let index = 0; index < value.length; index += 1) {
    const request = value[index] as Record<string, unknown>;

    requests.push({
      taskId: normalizeRequestTaskId(accessSelectionValue(request, "taskId")),
      attemptId: normalizeRequestField(
        accessSelectionValue(request, "attemptId"),
        "attemptId"
      ),
      runtime: normalizeRequestField(
        accessSelectionValue(request, "runtime"),
        "runtime"
      ),
      status: normalizeAttemptStatus(accessSelectionValue(request, "status")),
      sourceKind: normalizeAttemptSourceKind(
        accessSelectionValue(request, "sourceKind")
      )
    });
  }

  return requests;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function normalizeRequestTaskId(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires summary.requests entries to use non-empty taskId strings."
    );
  }

  return value.trim();
}

function normalizeRequestField(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Attempt handoff finalization request apply requires summary.requests entries to use non-empty ${fieldName} strings.`
    );
  }

  return value.trim();
}

function normalizeAttemptStatus(value: unknown): AttemptStatus {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires summary.requests entries to use the existing attempt status vocabulary."
    );
  }

  return value as AttemptStatus;
}

function normalizeAttemptSourceKind(
  value: unknown
): AttemptSourceKind | undefined {
  if (
    value !== undefined &&
    (typeof value !== "string" ||
      !validAttemptSourceKinds.has(value as AttemptSourceKind))
  ) {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires summary.requests entries to use the existing attempt source-kind vocabulary when provided."
    );
  }

  return value as AttemptSourceKind | undefined;
}
