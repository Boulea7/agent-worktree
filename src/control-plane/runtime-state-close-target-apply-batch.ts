import { applyExecutionSessionCloseTarget } from "./runtime-state-close-target-apply.js";
import type {
  ExecutionSessionCloseTargetApply,
  ExecutionSessionCloseTargetApplyBatch,
  ExecutionSessionCloseTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionCloseTargetBatch(
  input: ExecutionSessionCloseTargetApplyBatchInput
): Promise<ExecutionSessionCloseTargetApplyBatch> {
  const results: ExecutionSessionCloseTargetApply[] = [];

  for (const target of input.targets) {
    results.push(
      await applyExecutionSessionCloseTarget({
        target,
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
