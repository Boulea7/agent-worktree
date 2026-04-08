import {
  normalizeBatchWrapper,
  normalizeBatchWrapperItems
} from "./runtime-state-batch-wrapper-guards.js";
import { applyExecutionSessionClose } from "./runtime-state-close-apply.js";
import type {
  ExecutionSessionCloseApply,
  ExecutionSessionCloseApplyBatch,
  ExecutionSessionCloseApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionCloseBatch(
  input: ExecutionSessionCloseApplyBatchInput
): Promise<ExecutionSessionCloseApplyBatch> {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionCloseApplyBatchInput>(
    input,
    "Execution session close apply batch input must be an object."
  );
  const requests = normalizeBatchWrapperItems<
    ExecutionSessionCloseApplyBatchInput["requests"][number]
  >(
    normalizedInput.requests,
    "Execution session close apply batch requires requests to be an array."
  );

  const results: ExecutionSessionCloseApply[] = [];

  for (const request of requests) {
    results.push(
      await applyExecutionSessionClose({
        request,
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
