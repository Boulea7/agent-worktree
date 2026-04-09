import { ValidationError } from "../core/errors.js";
import type {
  AttemptHandoffFinalizationCloseoutDecisionSummary,
  AttemptHandoffFinalizationRequestSummaryApplyInput
} from "./types.js";
import { deriveAttemptHandoffFinalizationCloseoutSummary } from "./handoff-finalization-closeout-summary.js";
import { deriveAttemptHandoffFinalizationCloseoutDecisionSummary } from "./handoff-finalization-closeout-decision.js";

export async function applyAttemptHandoffFinalizationCloseoutDecisionSummary(
  input: AttemptHandoffFinalizationRequestSummaryApplyInput
): Promise<AttemptHandoffFinalizationCloseoutDecisionSummary | undefined> {
  validateInput(input);
  const closeoutSummary =
    await deriveAttemptHandoffFinalizationCloseoutSummary(input);

  return deriveAttemptHandoffFinalizationCloseoutDecisionSummary(
    closeoutSummary
  );
}

function validateInput(value: unknown): void {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision apply input must be an object."
    );
  }

  if (typeof value.invokeHandoffFinalization !== "function") {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision apply requires invokeHandoffFinalization to be a function."
    );
  }

  if (
    value.resolveHandoffFinalizationCapability !== undefined &&
    typeof value.resolveHandoffFinalizationCapability !== "function"
  ) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision apply requires resolveHandoffFinalizationCapability to be a function when provided."
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
