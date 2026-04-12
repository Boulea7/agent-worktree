import { ValidationError } from "../core/errors.js";
import { applyAttemptHandoffFinalizationBatch } from "./handoff-finalization-apply-batch.js";
import type {
  AttemptHandoffFinalizationApplyBatch,
  AttemptHandoffFinalizationRequest,
  AttemptHandoffFinalizationRequestSummaryApplyInput
} from "./types.js";
import {
  accessSelectionValue,
  rethrowSelectionAccessError,
  validateSelectionObjectInput
} from "./entry-validation.js";
import { normalizeHandoffFinalizationCapability } from "./handoff-finalization-capability-shared.js";
import { validateAttemptHandoffFinalizationRequestSummaryForApply } from "./handoff-finalization-request-summary-shared.js";

export async function applyAttemptHandoffFinalizationRequestSummary(
  input: AttemptHandoffFinalizationRequestSummaryApplyInput
): Promise<AttemptHandoffFinalizationApplyBatch | undefined> {
  try {
    validateSelectionObjectInput(
      input,
      "Attempt handoff finalization request apply input must be an object."
    );
    const summary = accessSelectionValue(input, "summary") as
      | AttemptHandoffFinalizationRequestSummaryApplyInput["summary"]
      | undefined;
    const invokeHandoffFinalization = normalizeRequiredFunction(
      accessSelectionValue(input, "invokeHandoffFinalization"),
      "Attempt handoff finalization request apply requires invokeHandoffFinalization to be a function."
    ) as AttemptHandoffFinalizationRequestSummaryApplyInput["invokeHandoffFinalization"];
    const resolveHandoffFinalizationCapability = normalizeOptionalFunction(
      accessSelectionValue(input, "resolveHandoffFinalizationCapability"),
      "Attempt handoff finalization request apply requires resolveHandoffFinalizationCapability to be a function when provided."
    ) as AttemptHandoffFinalizationRequestSummaryApplyInput["resolveHandoffFinalizationCapability"];

    if (summary === undefined) {
      return undefined;
    }

    validateAttemptHandoffFinalizationRequestSummaryForApply(summary);

    if (!summary.canFinalizeHandoff) {
      return undefined;
    }

    ensureUniformHandoffFinalizationCapability(
      summary.requests,
      resolveHandoffFinalizationCapability
    );

    return applyAttemptHandoffFinalizationBatch({
      requests: summary.requests,
      invokeHandoffFinalization,
      ...(resolveHandoffFinalizationCapability === undefined
        ? {}
        : {
            resolveHandoffFinalizationCapability
          })
    });
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt handoff finalization request apply input must be a readable object."
    );
  }
}

function ensureUniformHandoffFinalizationCapability(
  requests: readonly AttemptHandoffFinalizationRequest[],
  resolveHandoffFinalizationCapability:
    AttemptHandoffFinalizationRequestSummaryApplyInput["resolveHandoffFinalizationCapability"]
): void {
  if (resolveHandoffFinalizationCapability === undefined) {
    return;
  }

  let sawSupported = false;
  let sawUnsupported = false;

  for (const request of requests) {
    const supported = normalizeHandoffFinalizationCapability(
      resolveHandoffFinalizationCapability(request.runtime),
      "Attempt handoff finalization request apply"
    );

    if (supported) {
      sawSupported = true;
    } else {
      sawUnsupported = true;
    }

    if (sawSupported && sawUnsupported) {
      throw new ValidationError(
        "Attempt handoff finalization request apply requires summary.requests to resolve to a uniform capability decision before invocation."
      );
    }
  }
}

function normalizeRequiredFunction(
  value: unknown,
  message: string
): (...args: never[]) => unknown {
  if (typeof value !== "function") {
    throw new ValidationError(message);
  }

  return value as (...args: never[]) => unknown;
}

function normalizeOptionalFunction(
  value: unknown,
  message: string
): ((...args: never[]) => unknown) | undefined {
  if (value !== undefined && typeof value !== "function") {
    throw new ValidationError(message);
  }

  return value as ((...args: never[]) => unknown) | undefined;
}
