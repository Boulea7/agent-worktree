import { applyExecutionSessionSpawnHeadlessCloseTarget } from "./runtime-state-spawn-headless-close-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessCloseTargetApply,
  ExecutionSessionSpawnHeadlessCloseTargetApplyBatch,
  ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessCloseTargetBatch(
  input: ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput
): Promise<ExecutionSessionSpawnHeadlessCloseTargetApplyBatch> {
  const results: ExecutionSessionSpawnHeadlessCloseTargetApply[] = [];

  for (const headlessCloseTarget of input.headlessCloseTargetBatch.results) {
    results.push(
      await applyExecutionSessionSpawnHeadlessCloseTarget({
        headlessCloseTarget,
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
    headlessCloseTargetBatch: input.headlessCloseTargetBatch,
    results
  };
}
