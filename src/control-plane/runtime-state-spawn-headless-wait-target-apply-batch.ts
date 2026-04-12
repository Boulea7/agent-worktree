import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { applyExecutionSessionSpawnHeadlessWaitTarget } from "./runtime-state-spawn-headless-wait-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessWaitTargetApply,
  ExecutionSessionSpawnHeadlessWaitTargetApplyBatch,
  ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessWaitTargetBatch(
  input: ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput
): Promise<ExecutionSessionSpawnHeadlessWaitTargetApplyBatch> {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput>(
      input,
      "Execution session spawn headless wait target apply batch input must be an object."
    );

  const headlessWaitTargetBatch = normalizeHeadlessWaitTargetBatch(
    readRequiredBatchWrapperProperty<
      ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput["headlessWaitTargetBatch"]
    >(
      normalizedInput,
      "headlessWaitTargetBatch",
      "Execution session spawn headless wait target apply batch requires a headlessWaitTargetBatch wrapper."
    )
  );
  const invokeWait = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput["invokeWait"]
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
      ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput["resolveSessionLifecycleCapability"]
    >(
      normalizedInput,
      "resolveSessionLifecycleCapability",
      "Execution session wait target apply requires resolveSessionLifecycleCapability to be a function when provided."
    );
  const headlessWaitTargets = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessWaitTargetApplyBatch["headlessWaitTargetBatch"]["results"][number]
  >(
    headlessWaitTargetBatch.results,
    "Execution session spawn headless wait target apply batch requires headlessWaitTargetBatch.results to be an array.",
    "Execution session spawn headless wait target apply batch requires headlessWaitTargetBatch.results entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessWaitTargetApply[] = [];

  for (const headlessWaitTarget of headlessWaitTargets) {
    results.push(
      await applyExecutionSessionSpawnHeadlessWaitTarget({
        headlessWaitTarget,
        invokeWait,
        ...(timeoutMs === undefined ? {} : { timeoutMs }),
        ...(resolveSessionLifecycleCapability === undefined
          ? {}
          : { resolveSessionLifecycleCapability })
      })
    );
  }

  return {
    headlessWaitTargetBatch,
    results
  };
}

function normalizeHeadlessWaitTargetBatch(
  value: ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput["headlessWaitTargetBatch"]
) {
  return normalizeHeadlessTargetBatchWrapper(value, {
    context: "Execution session spawn headless wait target apply batch",
    wrapperKey: "headlessWaitTargetBatch",
    companionKey: "headlessWaitCandidateBatch"
  });
}
