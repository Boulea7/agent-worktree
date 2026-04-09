import { ValidationError } from "../core/errors.js";
import {
  validateSelectionArray,
  validateSelectionObjectArrayEntries,
  validateSelectionObjectInput,
  validateSelectionOptionalFunction,
  validateSelectionRequiredFunction
} from "./entry-validation.js";
import { applyAttemptHandoffTarget } from "./handoff-target-apply.js";
import type {
  AttemptHandoffTargetApply,
  AttemptHandoffTargetApplyBatch,
  AttemptHandoffTargetApplyBatchInput
} from "./types.js";

export async function applyAttemptHandoffTargetBatch(
  input: AttemptHandoffTargetApplyBatchInput
): Promise<AttemptHandoffTargetApplyBatch> {
  validateSelectionObjectInput(
    input,
    "Attempt handoff target apply batch input must be an object."
  );
  validateSelectionArray(
    input.targets,
    "Attempt handoff target apply batch requires targets to be an array."
  );
  validateSelectionRequiredFunction(
    input.invokeHandoff,
    "Attempt handoff target apply batch requires invokeHandoff to be a function."
  );
  validateSelectionOptionalFunction(
    input.resolveHandoffCapability,
    "Attempt handoff target apply batch requires resolveHandoffCapability to be a function when provided."
  );
  validateSelectionObjectArrayEntries(
    input.targets,
    "Attempt handoff target apply batch requires targets entries to be objects."
  );

  const results: AttemptHandoffTargetApply[] = [];

  for (const target of input.targets) {
    const result = await applyAttemptHandoffTarget({
      target,
      invokeHandoff: input.invokeHandoff,
      ...(input.resolveHandoffCapability === undefined
        ? {}
        : {
            resolveHandoffCapability: input.resolveHandoffCapability
          })
    });

    if (result === undefined) {
      throw new ValidationError(
        "Attempt handoff target apply batch requires each target to produce a target-apply result."
      );
    }

    results.push(result);
  }

  return {
    results
  };
}
