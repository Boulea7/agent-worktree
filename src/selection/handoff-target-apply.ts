import { ValidationError } from "../core/errors.js";
import { applyAttemptHandoff } from "./handoff-apply.js";
import { deriveAttemptHandoffRequest } from "./handoff-request.js";
import type {
  AttemptHandoffTargetApply,
  AttemptHandoffTargetApplyInput
} from "./types.js";

export async function applyAttemptHandoffTarget(
  input: AttemptHandoffTargetApplyInput
): Promise<AttemptHandoffTargetApply | undefined> {
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
