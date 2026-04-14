import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { deriveExecutionSessionSpawnHeadlessWaitRequest } from "./runtime-state-spawn-headless-wait-request.js";
import type {
  ExecutionSessionSpawnHeadlessWaitRequest,
  ExecutionSessionSpawnHeadlessWaitRequestBatch,
  ExecutionSessionSpawnHeadlessWaitRequestBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitRequestBatch(
  input: ExecutionSessionSpawnHeadlessWaitRequestBatchInput
): ExecutionSessionSpawnHeadlessWaitRequestBatch {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessWaitRequestBatchInput>(
      input,
      "Execution session spawn headless wait request batch input must be an object."
    );

  const headlessWaitTargetBatch = normalizeHeadlessWaitTargetBatch(
    readRequiredBatchWrapperProperty<
      ExecutionSessionSpawnHeadlessWaitRequestBatchInput["headlessWaitTargetBatch"]
    >(
      normalizedInput,
      "headlessWaitTargetBatch",
      "Execution session spawn headless wait request batch requires a headlessWaitTargetBatch wrapper."
    )
  );
  const timeoutMs = readOptionalBatchWrapperProperty<number>(
    normalizedInput,
    "timeoutMs",
    "Execution session wait request timeoutMs must be a finite integer greater than 0."
  );
  const headlessWaitTargets = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessWaitRequestBatch["headlessWaitTargetBatch"]["results"][number]
  >(
    headlessWaitTargetBatch.results,
    "Execution session spawn headless wait request batch requires headlessWaitTargetBatch.results to be an array.",
    "Execution session spawn headless wait request batch requires headlessWaitTargetBatch.results entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessWaitRequest[] = [];

  for (const headlessWaitTarget of headlessWaitTargets) {
    results.push(
      deriveExecutionSessionSpawnHeadlessWaitRequest({
        headlessWaitTarget,
        ...(timeoutMs === undefined ? {} : { timeoutMs })
      })
    );
  }

  return {
    headlessWaitTargetBatch,
    results
  };
}

function normalizeHeadlessWaitTargetBatch(
  value: ExecutionSessionSpawnHeadlessWaitRequestBatchInput["headlessWaitTargetBatch"]
) {
  return normalizeHeadlessTargetBatchWrapper(value, {
    context: "Execution session spawn headless wait request batch",
    wrapperKey: "headlessWaitTargetBatch",
    companionKey: "headlessWaitCandidateBatch"
  });
}
