import {
  normalizeBatchWrapper,
  normalizeBatchWrapperItems
} from "./runtime-state-batch-wrapper-guards.js";
import { applyExecutionSessionWaitTarget } from "./runtime-state-wait-target-apply.js";
import type {
  ExecutionSessionWaitTargetApply,
  ExecutionSessionWaitTargetApplyBatch,
  ExecutionSessionWaitTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionWaitTargetBatch(
  input: ExecutionSessionWaitTargetApplyBatchInput
): Promise<ExecutionSessionWaitTargetApplyBatch> {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionWaitTargetApplyBatchInput>(
    input,
    "Execution session wait target apply batch input must be an object."
  );
  const targets = normalizeBatchWrapperItems<
    ExecutionSessionWaitTargetApplyBatchInput["targets"][number]
  >(
    normalizedInput.targets,
    "Execution session wait target apply batch requires targets to be an array."
  );

  const results: ExecutionSessionWaitTargetApply[] = [];

  for (const target of targets) {
    results.push(
      await applyExecutionSessionWaitTarget({
        target,
        invokeWait: normalizedInput.invokeWait,
        ...(normalizedInput.timeoutMs === undefined
          ? {}
          : { timeoutMs: normalizedInput.timeoutMs }),
        ...(normalizedInput.resolveSessionLifecycleCapability === undefined
          ? {}
          : {
              resolveSessionLifecycleCapability:
                normalizedInput.resolveSessionLifecycleCapability
            })
      })
    );
  }

  return {
    results
  };
}
