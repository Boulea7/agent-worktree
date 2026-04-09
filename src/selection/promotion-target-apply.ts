import { ValidationError } from "../core/errors.js";
import {
  validateSelectionObjectInput,
  validateSelectionOptionalFunction,
  validateSelectionRequiredFunction
} from "./entry-validation.js";
import { deriveAttemptHandoffTarget } from "./handoff-target.js";
import { applyAttemptHandoffTarget } from "./handoff-target-apply.js";
import type {
  AttemptPromotionTargetApply,
  AttemptPromotionTargetApplyInput
} from "./types.js";

export async function applyAttemptPromotionTarget(
  input: AttemptPromotionTargetApplyInput
): Promise<AttemptPromotionTargetApply | undefined> {
  validateSelectionObjectInput(
    input,
    "Attempt promotion target apply input must be an object."
  );
  validateSelectionRequiredFunction(
    input.invokeHandoff,
    "Attempt promotion target apply requires invokeHandoff to be a function."
  );
  validateSelectionOptionalFunction(
    input.resolveHandoffCapability,
    "Attempt promotion target apply requires resolveHandoffCapability to be a function when provided."
  );
  const handoffTarget = deriveAttemptHandoffTarget(input.target);

  if (handoffTarget === undefined) {
    return undefined;
  }

  const targetApply =
    input.resolveHandoffCapability === undefined
      ? await applyAttemptHandoffTarget({
          target: handoffTarget,
          invokeHandoff: input.invokeHandoff
        })
      : await applyAttemptHandoffTarget({
          target: handoffTarget,
          invokeHandoff: input.invokeHandoff,
          resolveHandoffCapability: input.resolveHandoffCapability
        });

  if (targetApply === undefined) {
    throw new ValidationError(
      "Attempt promotion target apply requires target to produce a target-apply result."
    );
  }

  return {
    handoffTarget,
    targetApply
  };
}
