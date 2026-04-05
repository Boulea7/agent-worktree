import { applyExecutionSessionWaitTarget } from "./runtime-state-wait-target-apply.js";
import type {
  ExecutionSessionWaitTargetApply,
  ExecutionSessionWaitTargetApplyBatch,
  ExecutionSessionWaitTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionWaitTargetBatch(
  input: ExecutionSessionWaitTargetApplyBatchInput
): Promise<ExecutionSessionWaitTargetApplyBatch> {
  const results: ExecutionSessionWaitTargetApply[] = [];

  for (const target of input.targets) {
    results.push(
      await applyExecutionSessionWaitTarget({
        target,
        invokeWait: input.invokeWait,
        ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
        ...(input.resolveSessionLifecycleCapability === undefined
          ? {}
          : {
              resolveSessionLifecycleCapability:
                input.resolveSessionLifecycleCapability
            })
      })
    );
  }

  return {
    results
  };
}
