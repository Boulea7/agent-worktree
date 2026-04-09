import { ValidationError } from "../core/errors.js";
import { applyAttemptHandoffFinalizationBatch } from "./handoff-finalization-apply-batch.js";
import type {
  AttemptHandoffFinalizationApplyBatch,
  AttemptHandoffFinalizationRequestSummaryApplyInput
} from "./types.js";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
