import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems
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
  if (typeof normalizedInput.invokeWait !== "function") {
    throw new ValidationError(
      "Execution session wait target apply batch requires invokeWait to be a function."
    );
  }
  if (
    normalizedInput.resolveSessionLifecycleCapability !== undefined &&
    typeof normalizedInput.resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session wait target apply batch requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }
  const targets = normalizeBatchWrapperObjectItems<
    ExecutionSessionWaitTargetApplyBatchInput["targets"][number]
  >(
    normalizedInput.targets,
    "Execution session wait target apply batch requires targets to be an array.",
    "Execution session wait target apply batch requires targets entries to be objects."
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
