import { deriveExecutionSessionSpawnHeadlessWaitTarget } from "./runtime-state-spawn-headless-wait-target.js";
import type {
  ExecutionSessionSpawnHeadlessWaitTarget,
  ExecutionSessionSpawnHeadlessWaitTargetBatch,
  ExecutionSessionSpawnHeadlessWaitTargetBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitTargetBatch(
  input: ExecutionSessionSpawnHeadlessWaitTargetBatchInput
): ExecutionSessionSpawnHeadlessWaitTargetBatch {
  const results: ExecutionSessionSpawnHeadlessWaitTarget[] = [];

  for (const headlessWaitCandidate of input.headlessWaitCandidateBatch.results) {
    results.push(
      deriveExecutionSessionSpawnHeadlessWaitTarget({
        headlessWaitCandidate
      })
    );
  }

  return {
    headlessWaitCandidateBatch: input.headlessWaitCandidateBatch,
    results
  };
}
