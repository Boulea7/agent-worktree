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
  const normalizedBatch = normalizeHeadlessContextBatchWrapper(
    input.headlessContextBatch,
    {
      context: "Execution session spawn headless wait candidate batch",
      wrapperKey: "headlessContextBatch"
    }
  );
  const results: ExecutionSessionSpawnHeadlessWaitCandidate[] = [];

  for (const headlessContext of normalizedBatch.results) {
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
