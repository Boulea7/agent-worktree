import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { deriveExecutionSessionSpawnHeadlessCloseRequest } from "./runtime-state-spawn-headless-close-request.js";
import type {
  ExecutionSessionSpawnHeadlessCloseRequest,
  ExecutionSessionSpawnHeadlessCloseRequestBatch,
  ExecutionSessionSpawnHeadlessCloseRequestBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseRequestBatch(
  input: ExecutionSessionSpawnHeadlessCloseRequestBatchInput
): ExecutionSessionSpawnHeadlessCloseRequestBatch {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessCloseRequestBatchInput>(
      input,
      "Execution session spawn headless close request batch input must be an object."
    );

  const headlessCloseTargetBatch = normalizeHeadlessCloseTargetBatch(
    readRequiredBatchWrapperProperty<
      ExecutionSessionSpawnHeadlessCloseRequestBatchInput["headlessCloseTargetBatch"]
    >(
      normalizedInput,
      "headlessCloseTargetBatch",
      "Execution session spawn headless close request batch requires a headlessCloseTargetBatch wrapper."
    )
  );
  const headlessCloseTargets = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessCloseRequestBatch["headlessCloseTargetBatch"]["results"][number]
  >(
    headlessCloseTargetBatch.results,
    "Execution session spawn headless close request batch requires headlessCloseTargetBatch.results to be an array.",
    "Execution session spawn headless close request batch requires headlessCloseTargetBatch.results entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessCloseRequest[] = [];

  for (const headlessCloseTarget of headlessCloseTargets) {
    results.push(
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget
      })
    );
  }

  return {
    headlessCloseTargetBatch,
    results
  };
}

function normalizeHeadlessCloseTargetBatch(
  value: ExecutionSessionSpawnHeadlessCloseRequestBatchInput["headlessCloseTargetBatch"]
) {
  return normalizeHeadlessTargetBatchWrapper(value, {
    context: "Execution session spawn headless close request batch",
    wrapperKey: "headlessCloseTargetBatch",
    companionKey: "headlessCloseCandidateBatch"
  });
}
