import { applyExecutionSessionClose } from "./runtime-state-close-apply.js";
import type {
  ExecutionSessionCloseApply,
  ExecutionSessionCloseApplyBatch,
  ExecutionSessionCloseApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionCloseBatch(
  input: ExecutionSessionCloseApplyBatchInput
): Promise<ExecutionSessionCloseApplyBatch> {
  const results: ExecutionSessionCloseApply[] = [];

  for (const request of input.requests) {
    results.push(
      await applyExecutionSessionClose({
        request,
        invokeClose: input.invokeClose,
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
