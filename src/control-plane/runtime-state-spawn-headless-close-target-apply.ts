import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessTargetWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { applyExecutionSessionCloseTarget } from "./runtime-state-close-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessCloseTarget,
  ExecutionSessionSpawnHeadlessCloseTargetApply,
  ExecutionSessionSpawnHeadlessCloseTargetApplyInput,
  ExecutionSessionCloseTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessCloseTarget(
  input: ExecutionSessionSpawnHeadlessCloseTargetApplyInput
): Promise<ExecutionSessionSpawnHeadlessCloseTargetApply> {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessCloseTargetApplyInput>(
      input,
      "Execution session spawn headless close target apply input must be an object."
    );
  const headlessCloseTarget = normalizeHeadlessCloseTarget(
    readRequiredBatchWrapperProperty<
      ExecutionSessionSpawnHeadlessCloseTargetApplyInput["headlessCloseTarget"]
    >(
      normalizedInput,
      "headlessCloseTarget",
      "Execution session spawn headless close target apply requires a headlessCloseTarget wrapper."
    )
  );
  const target =
    readOptionalBatchWrapperProperty<
      NonNullable<ExecutionSessionSpawnHeadlessCloseTarget["target"]>
    >(
      headlessCloseTarget,
      "target",
      "Execution session spawn headless close target apply requires headlessCloseTarget.target to be an object when provided."
    );
  const invokeClose = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessCloseTargetApplyInput["invokeClose"]
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
  const resolveSessionLifecycleCapability =
    readOptionalBatchWrapperProperty<
      ExecutionSessionSpawnHeadlessCloseTargetApplyInput["resolveSessionLifecycleCapability"]
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

  if (target === undefined) {
    return {
      headlessCloseTarget
    };
  }

  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    throw new ValidationError(
      "Execution session spawn headless close target apply requires headlessCloseTarget.target to be an object when provided."
    );
  }

  const applyInput: ExecutionSessionCloseTargetApplyInput = {
    target,
    invokeClose,
    ...(resolveSessionLifecycleCapability === undefined
      ? {}
      : { resolveSessionLifecycleCapability })
  };

  const apply = await applyExecutionSessionCloseTarget(applyInput);

  return {
    headlessCloseTarget,
    apply
  };
}

function normalizeHeadlessCloseTarget(
  value: ExecutionSessionSpawnHeadlessCloseTarget
): ExecutionSessionSpawnHeadlessCloseTarget {
  return normalizeHeadlessTargetWrapper(value, {
    context: "Execution session spawn headless close target apply",
    nestedKey: "headlessCloseCandidate",
    wrapperKey: "headlessCloseTarget"
  });
}
