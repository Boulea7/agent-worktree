import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionClose } from "./runtime-state-close-apply.js";
import { deriveExecutionSessionCloseRequest } from "./runtime-state-close-request.js";
import type {
  ExecutionSessionCloseTargetApply,
  ExecutionSessionCloseTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionCloseTarget(
  input: ExecutionSessionCloseTargetApplyInput
): Promise<ExecutionSessionCloseTargetApply> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session close target apply input must be an object."
    );
  }

  if (
    typeof input.target !== "object" ||
    input.target === null ||
    Array.isArray(input.target)
  ) {
    throw new ValidationError(
      "Execution session close target apply requires target to be an object."
    );
  }

  const request = deriveExecutionSessionCloseRequest({
    target: input.target
  });
  const apply = await applyExecutionSessionClose({
    request,
    invokeClose: input.invokeClose,
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
