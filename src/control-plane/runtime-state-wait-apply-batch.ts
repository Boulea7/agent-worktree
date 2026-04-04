import { applyExecutionSessionWait } from "./runtime-state-wait-apply.js";
import type {
  ExecutionSessionWaitApply,
  ExecutionSessionWaitApplyBatch,
  ExecutionSessionWaitApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionWaitBatch(
  input: ExecutionSessionWaitApplyBatchInput
): Promise<ExecutionSessionWaitApplyBatch> {
  const results: ExecutionSessionWaitApply[] = [];

  for (const request of input.requests) {
    results.push(
      await applyExecutionSessionWait({
        request,
        invokeWait: input.invokeWait,
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
