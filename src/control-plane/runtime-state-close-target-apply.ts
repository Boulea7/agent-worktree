import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionClose } from "./runtime-state-close-apply.js";
import {
  normalizeBatchWrapper,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { deriveExecutionSessionCloseRequest } from "./runtime-state-close-request.js";
import type {
  ExecutionSessionCloseTargetApply,
  ExecutionSessionCloseTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionCloseTarget(
  input: ExecutionSessionCloseTargetApplyInput
): Promise<ExecutionSessionCloseTargetApply> {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionCloseTargetApplyInput>(
    input,
    "Execution session close target apply input must be an object."
  );
  const target = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseTargetApplyInput["target"]
  >(
    normalizedInput,
    "target",
    "Execution session close target apply requires target to be an object."
  );
  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    throw new ValidationError(
      "Execution session close target apply requires target to be an object."
    );
  }
  const invokeClose = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseTargetApplyInput["invokeClose"]
  >(
    normalizedInput,
    "invokeClose",
    "Execution session close target apply requires invokeClose to be a function."
  );
  if (typeof invokeClose !== "function") {
    throw new ValidationError(
      "Execution session close target apply requires invokeClose to be a function."
    );
  }
  const resolveSessionLifecycleCapability = readOptionalBatchWrapperProperty<
    ExecutionSessionCloseTargetApplyInput["resolveSessionLifecycleCapability"]
  >(
    normalizedInput,
    "resolveSessionLifecycleCapability",
    "Execution session close target apply requires resolveSessionLifecycleCapability to be a function when provided."
  );
  if (
    resolveSessionLifecycleCapability !== undefined &&
    typeof resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session close target apply requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }

  const request = deriveExecutionSessionCloseRequest({
    target
  });
  const apply = await applyExecutionSessionClose({
    request,
    invokeClose,
    ...(resolveSessionLifecycleCapability === undefined
      ? {}
      : {
          resolveSessionLifecycleCapability
        })
  });

  return {
    request,
    apply
  };
}
