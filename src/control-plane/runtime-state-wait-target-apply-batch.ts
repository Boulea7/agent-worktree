import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { ValidationError } from "../core/errors.js";
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
  const invokeWait = readRequiredBatchWrapperProperty<
    ExecutionSessionWaitTargetApplyBatchInput["invokeWait"]
  >(
    normalizedInput,
    "invokeWait",
    "Execution session wait target apply batch requires invokeWait to be a function."
  );
  if (typeof invokeWait !== "function") {
    throw new ValidationError(
      "Execution session wait target apply batch requires invokeWait to be a function."
    );
  }
  const resolveSessionLifecycleCapability =
    readOptionalBatchWrapperProperty<
      ExecutionSessionWaitTargetApplyBatchInput["resolveSessionLifecycleCapability"]
    >(
      normalizedInput,
      "resolveSessionLifecycleCapability",
      "Execution session wait target apply batch requires resolveSessionLifecycleCapability to be a function when provided."
    );
  if (
    resolveSessionLifecycleCapability !== undefined &&
    typeof resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session wait target apply batch requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }
  const targetsValue = readRequiredBatchWrapperProperty(
    normalizedInput,
    "targets",
    "Execution session wait target apply batch requires targets to be an array."
  );
  const targets = normalizeBatchWrapperObjectItems<
    ExecutionSessionWaitTargetApplyBatchInput["targets"][number]
  >(
    targetsValue,
    "Execution session wait target apply batch requires targets to be an array.",
    "Execution session wait target apply batch requires targets entries to be objects."
  );
  const timeoutMs = readOptionalBatchWrapperProperty<number>(
    normalizedInput,
    "timeoutMs",
    "Execution session wait request timeoutMs must be a finite integer greater than 0."
  );

  const results: ExecutionSessionWaitTargetApply[] = [];

  for (const target of targets) {
    results.push(
      await applyExecutionSessionWaitTarget({
        target,
        invokeWait,
        ...(timeoutMs === undefined ? {} : { timeoutMs }),
        ...(resolveSessionLifecycleCapability === undefined
          ? {}
          : {
              resolveSessionLifecycleCapability:
                resolveSessionLifecycleCapability
            })
      })
    );
  }

  return {
    results
  };
}
