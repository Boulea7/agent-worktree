import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems
} from "./runtime-state-batch-wrapper-guards.js";
import { ValidationError } from "../core/errors.js";
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
  if (typeof normalizedInput.invokeClose !== "function") {
    throw new ValidationError(
      "Execution session close target apply batch requires invokeClose to be a function."
    );
  }
  if (
    normalizedInput.resolveSessionLifecycleCapability !== undefined &&
    typeof normalizedInput.resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session close target apply batch requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }
  const targets = normalizeBatchWrapperObjectItems<
    ExecutionSessionCloseTargetApplyBatchInput["targets"][number]
  >(
    normalizedInput.targets,
    "Execution session close target apply batch requires targets to be an array.",
    "Execution session close target apply batch requires targets entries to be objects."
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
