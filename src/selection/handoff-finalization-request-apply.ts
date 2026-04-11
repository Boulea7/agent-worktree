import { ValidationError } from "../core/errors.js";
import { applyAttemptHandoffFinalizationBatch } from "./handoff-finalization-apply-batch.js";
import type {
  AttemptHandoffFinalizationApplyBatch,
  AttemptHandoffFinalizationRequest,
  AttemptHandoffFinalizationRequestSummaryApplyInput
} from "./types.js";
import { normalizeHandoffFinalizationCapability } from "./handoff-finalization-capability-shared.js";
import { validateAttemptHandoffFinalizationRequestSummaryForApply } from "./handoff-finalization-request-summary-shared.js";

export async function applyAttemptHandoffFinalizationRequestSummary(
  input: AttemptHandoffFinalizationRequestSummaryApplyInput
): Promise<AttemptHandoffFinalizationApplyBatch | undefined> {
  validateInput(input);

  if (input.summary === undefined) {
    return undefined;
  }

  validateAttemptHandoffFinalizationRequestSummaryForApply(input.summary);

  if (!input.summary.canFinalizeHandoff) {
    return undefined;
  }

  ensureUniformHandoffFinalizationCapability(
    input.summary.requests,
    input.resolveHandoffFinalizationCapability
  );

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

function validateInput(value: unknown): void {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Attempt handoff finalization request apply input must be an object."
    );
  }

  if (typeof value.invokeHandoffFinalization !== "function") {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires invokeHandoffFinalization to be a function."
    );
  }

  if (
    value.resolveHandoffFinalizationCapability !== undefined &&
    typeof value.resolveHandoffFinalizationCapability !== "function"
  ) {
    throw new ValidationError(
      "Attempt handoff finalization request apply requires resolveHandoffFinalizationCapability to be a function when provided."
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
