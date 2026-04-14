import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionWait } from "./runtime-state-wait-apply.js";
import {
  normalizeBatchWrapper,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { deriveExecutionSessionWaitRequest } from "./runtime-state-wait-request.js";
import type {
  ExecutionSessionWaitTargetApply,
  ExecutionSessionWaitTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionWaitTarget(
  input: ExecutionSessionWaitTargetApplyInput
): Promise<ExecutionSessionWaitTargetApply> {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionWaitTargetApplyInput>(
    input,
    "Execution session wait target apply input must be an object."
  );
  const target = readRequiredBatchWrapperProperty<
    ExecutionSessionWaitTargetApplyInput["target"]
  >(
    normalizedInput,
    "target",
    "Execution session wait target apply requires target to be an object."
  );
  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    throw new ValidationError(
      "Execution session wait target apply requires target to be an object."
    );
  }
  const invokeWait = readRequiredBatchWrapperProperty<
    ExecutionSessionWaitTargetApplyInput["invokeWait"]
  >(
    normalizedInput,
    "invokeWait",
    "Execution session wait target apply requires invokeWait to be a function."
  );
  if (typeof invokeWait !== "function") {
    throw new ValidationError(
      "Execution session wait target apply requires invokeWait to be a function."
    );
  }
  const resolveSessionLifecycleCapability = readOptionalBatchWrapperProperty<
    ExecutionSessionWaitTargetApplyInput["resolveSessionLifecycleCapability"]
  >(
    normalizedInput,
    "resolveSessionLifecycleCapability",
    "Execution session wait target apply requires resolveSessionLifecycleCapability to be a function when provided."
  );
  if (
    resolveSessionLifecycleCapability !== undefined &&
    typeof resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session wait target apply requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }
  const timeoutMs = readOptionalBatchWrapperProperty<
    ExecutionSessionWaitTargetApplyInput["timeoutMs"]
  >(
    normalizedInput,
    "timeoutMs",
    "Execution session wait target apply requires timeoutMs to be a finite integer greater than 0 when provided."
  );

  const request = deriveExecutionSessionWaitRequest({
    target,
    ...(timeoutMs === undefined ? {} : { timeoutMs })
  });
  const apply = await applyExecutionSessionWait({
    request,
    invokeWait,
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
