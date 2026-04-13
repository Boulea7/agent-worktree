import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessTargetWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { applyExecutionSessionWaitTarget } from "./runtime-state-wait-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessWaitTargetApply,
  ExecutionSessionSpawnHeadlessWaitTarget,
  ExecutionSessionSpawnHeadlessWaitTargetApplyInput,
  ExecutionSessionWaitTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessWaitTarget(
  input: ExecutionSessionSpawnHeadlessWaitTargetApplyInput
): Promise<ExecutionSessionSpawnHeadlessWaitTargetApply> {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessWaitTargetApplyInput>(
      input,
      "Execution session spawn headless wait target apply input must be an object."
    );
  const headlessWaitTarget = normalizeHeadlessWaitTarget(
    readRequiredBatchWrapperProperty<
      ExecutionSessionSpawnHeadlessWaitTargetApplyInput["headlessWaitTarget"]
    >(
      normalizedInput,
      "headlessWaitTarget",
      "Execution session spawn headless wait target apply requires a headlessWaitTarget wrapper."
    )
  );
  const target =
    readOptionalBatchWrapperProperty<
      NonNullable<ExecutionSessionSpawnHeadlessWaitTarget["target"]>
    >(
      headlessWaitTarget,
      "target",
      "Execution session spawn headless wait target apply requires headlessWaitTarget.target to be an object when provided."
    );

  if (target === undefined) {
    return {
      headlessWaitTarget
    };
  }

  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    throw new ValidationError(
      "Execution session spawn headless wait target apply requires headlessWaitTarget.target to be an object when provided."
    );
  }

  const invokeWait = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessWaitTargetApplyInput["invokeWait"]
  >(
    normalizedInput,
    "invokeWait",
    "Execution session wait target apply requires invokeWait to be a function."
  );
  const timeoutMs = readOptionalBatchWrapperProperty<number>(
    normalizedInput,
    "timeoutMs",
    "Execution session wait request timeoutMs must be a finite integer greater than 0."
  );
  const resolveSessionLifecycleCapability =
    readOptionalBatchWrapperProperty<
      ExecutionSessionSpawnHeadlessWaitTargetApplyInput["resolveSessionLifecycleCapability"]
    >(
      normalizedInput,
      "resolveSessionLifecycleCapability",
      "Execution session wait target apply requires resolveSessionLifecycleCapability to be a function when provided."
    );

  const applyInput: ExecutionSessionWaitTargetApplyInput = {
    target,
    invokeWait,
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    ...(resolveSessionLifecycleCapability === undefined
      ? {}
      : { resolveSessionLifecycleCapability })
  };

  const apply = await applyExecutionSessionWaitTarget(applyInput);

  return {
    headlessWaitTarget,
    apply
  };
}

function normalizeHeadlessWaitTarget(
  value: ExecutionSessionSpawnHeadlessWaitTarget
): ExecutionSessionSpawnHeadlessWaitTarget {
  return normalizeHeadlessTargetWrapper(value, {
    context: "Execution session spawn headless wait target apply",
    nestedKey: "headlessWaitCandidate",
    wrapperKey: "headlessWaitTarget"
  });
}
