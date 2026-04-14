import { ValidationError } from "../core/errors.js";
import type {
  AttemptHandoffFinalizationCloseoutDecisionSummary,
  AttemptHandoffFinalizationRequestSummaryApplyInput
} from "./types.js";
import {
  normalizeSelectionOptionalFunctionProperty,
  normalizeSelectionRequiredFunctionProperty,
  validateSelectionObjectInput
} from "./entry-validation.js";
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
  validateSelectionObjectInput(
    value,
    "Attempt handoff finalization closeout decision apply input must be an object."
  );
  normalizeSelectionRequiredFunctionProperty(
    value,
    "invokeHandoffFinalization",
    "Attempt handoff finalization closeout decision apply requires invokeHandoffFinalization to be a function."
  );
  normalizeSelectionOptionalFunctionProperty(
    value,
    "resolveHandoffFinalizationCapability",
    "Attempt handoff finalization closeout decision apply requires resolveHandoffFinalizationCapability to be a function when provided."
  );
}
