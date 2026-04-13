import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
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
  const requestsInput = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseApplyBatchInput["requests"]
  >(
    normalizedInput,
    "requests",
    "Execution session close apply batch requires requests to be an array."
  );
  const requests = normalizeBatchWrapperObjectItems<
    ExecutionSessionCloseApplyBatchInput["requests"][number]
  >(
    requestsInput,
    "Execution session close apply batch requires requests to be an array.",
    "Execution session close apply batch requires requests entries to be objects."
  );
  const invokeClose = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseApplyBatchInput["invokeClose"]
  >(
    normalizedInput,
    "invokeClose",
    "Execution session close apply requires invokeClose to be a function."
  );
  const resolveSessionLifecycleCapability = readOptionalBatchWrapperProperty<
    ExecutionSessionCloseApplyBatchInput["resolveSessionLifecycleCapability"]
  >(
    normalizedInput,
    "resolveSessionLifecycleCapability",
    "Execution session close consumer readiness requires resolveSessionLifecycleCapability to be a function when provided."
  );

  const results: ExecutionSessionCloseApply[] = [];

  for (const request of requests) {
    results.push(
      await applyExecutionSessionClose({
        request,
        invokeClose,
        ...(resolveSessionLifecycleCapability === undefined
          ? {}
          : {
              resolveSessionLifecycleCapability
            })
      })
    );
  }

  return {
    results
  };
}
