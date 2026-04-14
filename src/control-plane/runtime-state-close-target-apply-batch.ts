import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
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
  const invokeClose = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseTargetApplyBatchInput["invokeClose"]
  >(
    normalizedInput,
    "invokeClose",
    "Execution session close target apply batch requires invokeClose to be a function."
  );
  if (typeof invokeClose !== "function") {
    throw new ValidationError(
      "Execution session close target apply batch requires invokeClose to be a function."
    );
  }
  const resolveSessionLifecycleCapability =
    readOptionalBatchWrapperProperty<
      ExecutionSessionCloseTargetApplyBatchInput["resolveSessionLifecycleCapability"]
    >(
      normalizedInput,
      "resolveSessionLifecycleCapability",
      "Execution session close target apply batch requires resolveSessionLifecycleCapability to be a function when provided."
    );
  if (
    resolveSessionLifecycleCapability !== undefined &&
    typeof resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session close target apply batch requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }
  const targetsValue = readRequiredBatchWrapperProperty(
    normalizedInput,
    "targets",
    "Execution session close target apply batch requires targets to be an array."
  );
  const targets = normalizeBatchWrapperObjectItems<
    ExecutionSessionCloseTargetApplyBatchInput["targets"][number]
  >(
    targetsValue,
    "Execution session close target apply batch requires targets to be an array.",
    "Execution session close target apply batch requires targets entries to be objects."
  );

  const results: ExecutionSessionCloseTargetApply[] = [];

  for (const target of targets) {
    results.push(
      await applyExecutionSessionCloseTarget({
        target,
        invokeClose,
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
