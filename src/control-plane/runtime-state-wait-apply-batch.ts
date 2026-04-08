import {
  normalizeBatchWrapper,
  normalizeBatchWrapperItems
} from "./runtime-state-batch-wrapper-guards.js";
import { applyExecutionSessionWait } from "./runtime-state-wait-apply.js";
import type {
  ExecutionSessionWaitApply,
  ExecutionSessionWaitApplyBatch,
  ExecutionSessionWaitApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionWaitBatch(
  input: ExecutionSessionWaitApplyBatchInput
): Promise<ExecutionSessionWaitApplyBatch> {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionWaitApplyBatchInput>(
    input,
    "Execution session wait apply batch input must be an object."
  );
  const requests = normalizeBatchWrapperItems<
    ExecutionSessionWaitApplyBatchInput["requests"][number]
  >(
    normalizedInput.requests,
    "Execution session wait apply batch requires requests to be an array."
  );

  const results: ExecutionSessionWaitApply[] = [];

  for (const request of requests) {
    results.push(
      await applyExecutionSessionWait({
        request,
        invokeWait: normalizedInput.invokeWait,
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
