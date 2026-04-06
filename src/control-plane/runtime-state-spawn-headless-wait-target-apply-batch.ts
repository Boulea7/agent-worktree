import { applyExecutionSessionSpawnHeadlessWaitTarget } from "./runtime-state-spawn-headless-wait-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessWaitTargetApply,
  ExecutionSessionSpawnHeadlessWaitTargetApplyBatch,
  ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessWaitTargetBatch(
  input: ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput
): Promise<ExecutionSessionSpawnHeadlessWaitTargetApplyBatch> {
  const results: ExecutionSessionSpawnHeadlessWaitTargetApply[] = [];

  for (const headlessWaitTarget of input.headlessWaitTargetBatch.results) {
    results.push(
      await applyExecutionSessionSpawnHeadlessWaitTarget({
        headlessWaitTarget,
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
    headlessWaitTargetBatch: input.headlessWaitTargetBatch,
    results
  };
}
