import { ValidationError } from "../core/errors.js";
import {
  validateSelectionArray,
  validateSelectionObjectArrayEntries,
  validateSelectionObjectInput,
  validateSelectionOptionalFunction,
  validateSelectionRequiredFunction
} from "./entry-validation.js";
import { applyAttemptPromotionTarget } from "./promotion-target-apply.js";
import type {
  AttemptPromotionTargetApply,
  AttemptPromotionTargetApplyBatch,
  AttemptPromotionTargetApplyBatchInput
} from "./types.js";

export async function applyAttemptPromotionTargetBatch(
  input: AttemptPromotionTargetApplyBatchInput
): Promise<AttemptPromotionTargetApplyBatch> {
  validateSelectionObjectInput(
    input,
    "Attempt promotion target apply batch input must be an object."
  );
  validateSelectionArray(
    input.targets,
    "Attempt promotion target apply batch requires targets to be an array."
  );
  validateSelectionRequiredFunction(
    input.invokeHandoff,
    "Attempt promotion target apply batch requires invokeHandoff to be a function."
  );
  validateSelectionOptionalFunction(
    input.resolveHandoffCapability,
    "Attempt promotion target apply batch requires resolveHandoffCapability to be a function when provided."
  );
  validateSelectionObjectArrayEntries(
    input.targets,
    "Attempt promotion target apply batch requires targets entries to be objects."
  );

  const results: AttemptPromotionTargetApply[] = [];

  for (const target of input.targets) {
    const result = await applyAttemptPromotionTarget({
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
        "Attempt promotion target apply batch requires each target to produce a promotion target-apply result."
      );
    }

    results.push(result);
  }

  return {
    results
  };
}
