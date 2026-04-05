import { applyExecutionSessionClose } from "./runtime-state-close-apply.js";
import { deriveExecutionSessionCloseRequest } from "./runtime-state-close-request.js";
import type {
  ExecutionSessionCloseTargetApply,
  ExecutionSessionCloseTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionCloseTarget(
  input: ExecutionSessionCloseTargetApplyInput
): Promise<ExecutionSessionCloseTargetApply> {
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
