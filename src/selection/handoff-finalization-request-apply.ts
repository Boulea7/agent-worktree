import { ValidationError } from "../core/errors.js";
import { applyAttemptHandoffFinalizationBatch } from "./handoff-finalization-apply-batch.js";
import type {
  AttemptHandoffDecisionBlockingReason,
  AttemptHandoffFinalizationApplyBatch,
  AttemptHandoffFinalizationRequestSummary,
  AttemptHandoffFinalizationRequestSummaryApplyInput
} from "./types.js";

const ATTEMPT_HANDOFF_FINALIZATION_REQUEST_BASIS =
  "handoff_finalization_target_summary" as const;
const validBlockingReasons =
  new Set<AttemptHandoffDecisionBlockingReason>([
    "no_results",
    "handoff_unsupported"
  ]);

export async function applyAttemptHandoffFinalizationRequestSummary(
  input: AttemptHandoffFinalizationRequestSummaryApplyInput
): Promise<AttemptHandoffFinalizationApplyBatch | undefined> {
  if (input.summary === undefined) {
    return undefined;
  }

  validateSummary(input.summary);

  if (!input.summary.canFinalizeHandoff) {
    return undefined;
  }

  return applyAttemptHandoffFinalizationBatch({
    requests: input.summary.requests,
    invokeHandoffFinalization: input.invokeHandoffFinalization,
    ...(input.resolveHandoffFinalizationCapability === undefined
      ? {}
      : {
          resolveHandoffFinalizationCapability:
            input.resolveHandoffFinalizationCapability
        })
  });
}

function validateSummary(
  summary: AttemptHandoffFinalizationRequestSummary
): void {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires summary to be an object."
    );
  }

  if (summary.requestBasis !== ATTEMPT_HANDOFF_FINALIZATION_REQUEST_BASIS) {
    throw new ValidationError(
      'Attempt handoff finalization request apply requires summary.requestBasis to be "handoff_finalization_target_summary".'
    );
  }

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

  if (!Array.isArray(summary.requests)) {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires summary.requests to be an array."
    );
  }

  if (summary.canFinalizeHandoff && summary.requests.length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires summary.requests to be non-empty when summary.canFinalizeHandoff is true."
    );
  }

  if (!summary.canFinalizeHandoff && summary.requests.length > 0) {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires summary.requests to be empty when summary.canFinalizeHandoff is false."
    );
  }

  if (summary.invokedResultCount !== summary.requests.length) {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires summary.invokedResultCount to match summary.requests.length."
    );
  }

  if (
    summary.blockedResultCount + summary.invokedResultCount !==
    summary.resultCount
  ) {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires summary.resultCount to equal summary.invokedResultCount plus summary.blockedResultCount."
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
      "Attempt handoff finalization request apply requires summary.blockingReasons to match the canonical blocker derivation from summary result counts."
    );
  }

  if (summary.canFinalizeHandoff !== (summary.blockingReasons.length === 0)) {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires summary.canFinalizeHandoff to match whether summary.blockingReasons is empty."
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

function validateBlockingReasons(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires summary.blockingReasons to be an array."
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
      "Attempt handoff finalization request apply requires summary.blockingReasons to use the existing handoff decision blocker vocabulary."
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
