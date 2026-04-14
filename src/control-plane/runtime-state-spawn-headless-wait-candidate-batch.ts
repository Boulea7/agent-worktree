import { normalizeBatchWrapper } from "./runtime-state-batch-wrapper-guards.js";
import {
  normalizeBatchWrapperObjectItems,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessContextBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { deriveExecutionSessionSpawnHeadlessWaitCandidate } from "./runtime-state-spawn-headless-wait-candidate.js";
import type {
  ExecutionSessionSpawnHeadlessWaitCandidate,
  ExecutionSessionSpawnHeadlessWaitCandidateBatch,
  ExecutionSessionSpawnHeadlessWaitCandidateBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitCandidateBatch(
  input: ExecutionSessionSpawnHeadlessWaitCandidateBatchInput
): ExecutionSessionSpawnHeadlessWaitCandidateBatch {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessWaitCandidateBatchInput>(
      input,
      "Execution session spawn headless wait candidate batch input must be an object."
    );
  const headlessContextBatch = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessWaitCandidateBatchInput["headlessContextBatch"]
  >(
    normalizedInput,
    "headlessContextBatch",
    "Execution session spawn headless wait candidate batch requires headlessContextBatch to include headlessViewBatch and results."
  );
  const normalizedBatch = normalizeHeadlessContextBatchWrapper(
    headlessContextBatch,
    {
      context: "Execution session spawn headless wait candidate batch",
      wrapperKey: "headlessContextBatch"
    }
  );
  const headlessContexts = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessWaitCandidateBatch["headlessContextBatch"]["results"][number]
  >(
    normalizedBatch.results,
    "Execution session spawn headless wait candidate batch requires headlessContextBatch.results to be an array.",
    "Execution session spawn headless wait candidate batch requires headlessContextBatch.results entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessWaitCandidate[] = [];

  for (const headlessContext of headlessContexts) {
    results.push(
      deriveExecutionSessionSpawnHeadlessWaitCandidate({
        headlessContext
      })
    );
  }

  return {
    headlessContextBatch: normalizedBatch,
    results
  };
}
