import {
  normalizeBatchWrapper,
  normalizeBatchWrapperItems
} from "./runtime-state-batch-wrapper-guards.js";
import { applyExecutionSessionCloseTarget } from "./runtime-state-close-target-apply.js";
import type {
  ExecutionSessionCloseTargetApply,
  ExecutionSessionCloseTargetApplyBatch,
  ExecutionSessionCloseTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionCloseTargetBatch(
  input: ExecutionSessionCloseTargetApplyBatchInput
): Promise<ExecutionSessionCloseTargetApplyBatch> {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionCloseTargetApplyBatchInput>(
      input,
      "Execution session close target apply batch input must be an object."
    );
  const targets = normalizeBatchWrapperItems<
    ExecutionSessionCloseTargetApplyBatchInput["targets"][number]
  >(
    normalizedInput.targets,
    "Execution session close target apply batch requires targets to be an array."
  );

  const results: ExecutionSessionCloseTargetApply[] = [];

  for (const target of targets) {
    results.push(
      await applyExecutionSessionCloseTarget({
        target,
        invokeClose: normalizedInput.invokeClose,
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
