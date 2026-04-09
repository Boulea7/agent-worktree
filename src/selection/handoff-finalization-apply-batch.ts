import { ValidationError } from "../core/errors.js";
import {
  validateSelectionArray,
  validateSelectionObjectArrayEntries,
  validateSelectionObjectInput,
  validateSelectionOptionalFunction,
  validateSelectionRequiredFunction
} from "./entry-validation.js";
import { applyAttemptHandoffFinalization } from "./handoff-finalization-apply.js";
import type {
  AttemptHandoffFinalizationApply,
  AttemptHandoffFinalizationApplyBatch,
  AttemptHandoffFinalizationApplyBatchInput
} from "./types.js";

export async function applyAttemptHandoffFinalizationBatch(
  input: AttemptHandoffFinalizationApplyBatchInput
): Promise<AttemptHandoffFinalizationApplyBatch> {
  validateSelectionObjectInput(
    input,
    "Attempt handoff finalization apply batch input must be an object."
  );
  validateSelectionArray(
    input.requests,
    "Attempt handoff finalization apply batch requires requests to be an array."
  );
  validateSelectionRequiredFunction(
    input.invokeHandoffFinalization,
    "Attempt handoff finalization apply batch requires invokeHandoffFinalization to be a function."
  );
  validateSelectionOptionalFunction(
    input.resolveHandoffFinalizationCapability,
    "Attempt handoff finalization apply batch requires resolveHandoffFinalizationCapability to be a function when provided."
  );
  validateSelectionObjectArrayEntries(
    input.requests,
    "Attempt handoff finalization apply batch requires requests entries to be objects."
  );

  const results: AttemptHandoffFinalizationApply[] = [];

  for (const request of input.requests) {
    const result = await applyAttemptHandoffFinalization({
      request,
      invokeHandoffFinalization: input.invokeHandoffFinalization,
      ...(input.resolveHandoffFinalizationCapability === undefined
        ? {}
        : {
            resolveHandoffFinalizationCapability:
              input.resolveHandoffFinalizationCapability
          })
    });

    if (result === undefined) {
      throw new ValidationError(
        "Attempt handoff finalization apply batch requires each request to produce an apply result."
      );
    }

    results.push(result);
  }

  return {
    results
  };
}
