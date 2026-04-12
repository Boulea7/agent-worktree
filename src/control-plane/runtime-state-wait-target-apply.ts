import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionWait } from "./runtime-state-wait-apply.js";
import { deriveExecutionSessionWaitRequest } from "./runtime-state-wait-request.js";
import type {
  ExecutionSessionWaitTargetApply,
  ExecutionSessionWaitTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionWaitTarget(
  input: ExecutionSessionWaitTargetApplyInput
): Promise<ExecutionSessionWaitTargetApply> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session wait target apply input must be an object."
    );
  }

  if (
    typeof input.target !== "object" ||
    input.target === null ||
    Array.isArray(input.target)
  ) {
    throw new ValidationError(
      "Execution session wait target apply requires target to be an object."
    );
  }

  if (typeof input.invokeWait !== "function") {
    throw new ValidationError(
      "Execution session wait target apply requires invokeWait to be a function."
    );
  }

  if (
    input.resolveSessionLifecycleCapability !== undefined &&
    typeof input.resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session wait target apply requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }

  const request = deriveExecutionSessionWaitRequest({
    target: input.target,
    ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs })
  });
  const apply = await applyExecutionSessionWait({
    request,
    invokeWait: input.invokeWait,
    ...(input.resolveSessionLifecycleCapability === undefined
      ? {}
      : {
          resolveSessionLifecycleCapability:
            input.resolveSessionLifecycleCapability
        })
  });

  return {
    request,
    apply
  };
}
