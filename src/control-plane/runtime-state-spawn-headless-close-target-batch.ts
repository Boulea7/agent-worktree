import { deriveExecutionSessionSpawnHeadlessCloseTarget } from "./runtime-state-spawn-headless-close-target.js";
import type {
  ExecutionSessionSpawnHeadlessCloseTarget,
  ExecutionSessionSpawnHeadlessCloseTargetBatch,
  ExecutionSessionSpawnHeadlessCloseTargetBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseTargetBatch(
  input: ExecutionSessionSpawnHeadlessCloseTargetBatchInput
): ExecutionSessionSpawnHeadlessCloseTargetBatch {
  const results: ExecutionSessionSpawnHeadlessCloseTarget[] = [];

  for (const headlessCloseCandidate of input.headlessCloseCandidateBatch.results) {
    results.push(
      deriveExecutionSessionSpawnHeadlessCloseTarget({
        headlessCloseCandidate
      })
    );
  }

  return {
    headlessCloseCandidateBatch: input.headlessCloseCandidateBatch,
    results
  };
}
