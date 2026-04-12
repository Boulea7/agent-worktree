import { normalizeBatchWrapper } from "./runtime-state-batch-wrapper-guards.js";
import {
  normalizeBatchWrapperObjectItems
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessContextBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { deriveExecutionSessionSpawnHeadlessCloseCandidate } from "./runtime-state-spawn-headless-close-candidate.js";
import type {
  ExecutionSessionSpawnHeadlessCloseCandidate,
  ExecutionSessionSpawnHeadlessCloseCandidateBatch,
  ExecutionSessionSpawnHeadlessCloseCandidateBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseCandidateBatch(
  input: ExecutionSessionSpawnHeadlessCloseCandidateBatchInput
): ExecutionSessionSpawnHeadlessCloseCandidateBatch {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessCloseCandidateBatchInput>(
      input,
      "Execution session spawn headless close candidate batch input must be an object."
    );
  const normalizedBatch = normalizeHeadlessContextBatchWrapper(
    normalizedInput.headlessContextBatch,
    {
      context: "Execution session spawn headless close candidate batch",
      wrapperKey: "headlessContextBatch"
    }
  );
  const headlessContexts = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessCloseCandidateBatch["headlessContextBatch"]["results"][number]
  >(
    normalizedBatch.results,
    "Execution session spawn headless close candidate batch requires headlessContextBatch.results to be an array.",
    "Execution session spawn headless close candidate batch requires headlessContextBatch.results entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessCloseCandidate[] = [];

  for (const headlessContext of headlessContexts) {
    results.push(
      deriveExecutionSessionSpawnHeadlessCloseCandidate({
        headlessContext,
        ...(normalizedInput.resolveSessionLifecycleCapability === undefined
          ? {}
          : {
              resolveSessionLifecycleCapability:
                normalizedInput.resolveSessionLifecycleCapability
            })
      })
    );
  }

  return {
    headlessContextBatch: normalizedBatch,
    results
  };
}
