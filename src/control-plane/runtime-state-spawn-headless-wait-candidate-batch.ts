import { deriveExecutionSessionSpawnHeadlessWaitCandidate } from "./runtime-state-spawn-headless-wait-candidate.js";
import type {
  ExecutionSessionSpawnHeadlessWaitCandidate,
  ExecutionSessionSpawnHeadlessWaitCandidateBatch,
  ExecutionSessionSpawnHeadlessWaitCandidateBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitCandidateBatch(
  input: ExecutionSessionSpawnHeadlessWaitCandidateBatchInput
): ExecutionSessionSpawnHeadlessWaitCandidateBatch {
  const results: ExecutionSessionSpawnHeadlessWaitCandidate[] = [];

  for (const headlessContext of input.headlessContextBatch.results) {
    results.push(
      deriveExecutionSessionSpawnHeadlessWaitCandidate({
        headlessContext
      })
    );
  }

  return {
    headlessContextBatch: input.headlessContextBatch,
    results
  };
}
