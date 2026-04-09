import { ValidationError } from "../core/errors.js";
import { applyAttemptHandoff } from "./handoff-apply.js";
import {
  validateSelectionObjectInput,
  validateSelectionOptionalFunction,
  validateSelectionRequiredFunction
} from "./entry-validation.js";
import { deriveAttemptHandoffRequest } from "./handoff-request.js";
import type {
  AttemptHandoffTargetApply,
  AttemptHandoffTargetApplyInput
} from "./types.js";

export async function applyAttemptHandoffTarget(
  input: AttemptHandoffTargetApplyInput
): Promise<AttemptHandoffTargetApply | undefined> {
  validateSelectionObjectInput(
    input,
    "Attempt handoff target apply input must be an object."
  );
  validateSelectionRequiredFunction(
    input.invokeHandoff,
    "Attempt handoff target apply requires invokeHandoff to be a function."
  );
  validateSelectionOptionalFunction(
    input.resolveHandoffCapability,
    "Attempt handoff target apply requires resolveHandoffCapability to be a function when provided."
  );
  const request = deriveAttemptHandoffRequest(input.target);

  if (request === undefined) {
    return undefined;
  }

  const apply =
    input.resolveHandoffCapability === undefined
      ? await applyAttemptHandoff({
          request,
          invokeHandoff: input.invokeHandoff
        })
      : await applyAttemptHandoff({
          request,
          invokeHandoff: input.invokeHandoff,
          resolveHandoffCapability: input.resolveHandoffCapability
        });

  if (apply === undefined) {
    throw new ValidationError(
      "Attempt handoff target apply requires target to produce an apply result."
    );
  }

  return {
    request,
    apply
  };
}
