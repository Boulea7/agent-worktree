import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
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
  const requestsInput = readRequiredBatchWrapperProperty<
    ExecutionSessionWaitApplyBatchInput["requests"]
  >(
    normalizedInput,
    "requests",
    "Execution session wait apply batch requires requests to be an array."
  );
  const requests = normalizeBatchWrapperObjectItems<
    ExecutionSessionWaitApplyBatchInput["requests"][number]
  >(
    requestsInput,
    "Execution session wait apply batch requires requests to be an array.",
    "Execution session wait apply batch requires requests entries to be objects."
  );
  const invokeWait = readRequiredBatchWrapperProperty<
    ExecutionSessionWaitApplyBatchInput["invokeWait"]
  >(
    normalizedInput,
    "invokeWait",
    "Execution session wait apply requires invokeWait to be a function."
  );
  const resolveSessionLifecycleCapability = readOptionalBatchWrapperProperty<
    ExecutionSessionWaitApplyBatchInput["resolveSessionLifecycleCapability"]
  >(
    normalizedInput,
    "resolveSessionLifecycleCapability",
    "Execution session wait consumer readiness requires resolveSessionLifecycleCapability to be a function when provided."
  );

  const results: ExecutionSessionWaitApply[] = [];

  for (const request of requests) {
    results.push(
      await applyExecutionSessionWait({
        request,
        invokeWait,
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
