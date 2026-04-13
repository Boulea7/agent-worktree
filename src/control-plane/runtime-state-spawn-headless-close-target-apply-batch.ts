import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { ValidationError } from "../core/errors.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { applyExecutionSessionSpawnHeadlessCloseTarget } from "./runtime-state-spawn-headless-close-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessCloseTargetApply,
  ExecutionSessionSpawnHeadlessCloseTargetApplyBatch,
  ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessCloseTargetBatch(
  input: ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput
): Promise<ExecutionSessionSpawnHeadlessCloseTargetApplyBatch> {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput>(
      input,
      "Execution session spawn headless close target apply batch input must be an object."
    );

  const headlessCloseTargetBatch = normalizeHeadlessCloseTargetBatch(
    readRequiredBatchWrapperProperty<
      ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput["headlessCloseTargetBatch"]
    >(
      normalizedInput,
      "headlessCloseTargetBatch",
      "Execution session spawn headless close target apply batch requires a headlessCloseTargetBatch wrapper."
    )
  );
  const invokeClose = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput["invokeClose"]
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
      ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput["resolveSessionLifecycleCapability"]
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
  const headlessCloseTargets = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessCloseTargetApplyBatch["headlessCloseTargetBatch"]["results"][number]
  >(
    headlessCloseTargetBatch.results,
    "Execution session spawn headless close target apply batch requires headlessCloseTargetBatch.results to be an array.",
    "Execution session spawn headless close target apply batch requires headlessCloseTargetBatch.results entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessCloseTargetApply[] = [];

  for (const headlessCloseTarget of headlessCloseTargets) {
    results.push(
      await applyExecutionSessionSpawnHeadlessCloseTarget({
        headlessCloseTarget,
        invokeClose,
        ...(resolveSessionLifecycleCapability === undefined
          ? {}
          : { resolveSessionLifecycleCapability })
      })
    );
  }

  return {
    headlessCloseTargetBatch,
    results
  };
}

function normalizeHeadlessCloseTargetBatch(
  value: ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput["headlessCloseTargetBatch"]
) {
  return normalizeHeadlessTargetBatchWrapper(value, {
    context: "Execution session spawn headless close target apply batch",
    wrapperKey: "headlessCloseTargetBatch",
    companionKey: "headlessCloseCandidateBatch"
  });
}
