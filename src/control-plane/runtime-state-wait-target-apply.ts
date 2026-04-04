import { applyExecutionSessionWait } from "./runtime-state-wait-apply.js";
import { deriveExecutionSessionWaitRequest } from "./runtime-state-wait-request.js";
import type {
  ExecutionSessionWaitTargetApply,
  ExecutionSessionWaitTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionWaitTarget(
  input: ExecutionSessionWaitTargetApplyInput
): Promise<ExecutionSessionWaitTargetApply> {
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
