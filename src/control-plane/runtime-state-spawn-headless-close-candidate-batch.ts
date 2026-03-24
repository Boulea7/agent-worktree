import { deriveExecutionSessionSpawnHeadlessCloseCandidate } from "./runtime-state-spawn-headless-close-candidate.js";
import type {
  ExecutionSessionSpawnHeadlessCloseCandidate,
  ExecutionSessionSpawnHeadlessCloseCandidateBatch,
  ExecutionSessionSpawnHeadlessCloseCandidateBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseCandidateBatch(
  input: ExecutionSessionSpawnHeadlessCloseCandidateBatchInput
): ExecutionSessionSpawnHeadlessCloseCandidateBatch {
  const results: ExecutionSessionSpawnHeadlessCloseCandidate[] = [];

  for (const headlessContext of input.headlessContextBatch.results) {
    results.push(
      deriveExecutionSessionSpawnHeadlessCloseCandidate({
        headlessContext,
        ...(input.resolveSessionLifecycleCapability === undefined
          ? {}
          : {
              resolveSessionLifecycleCapability:
                input.resolveSessionLifecycleCapability
            })
      })
    );
  }

  return {
    headlessContextBatch: input.headlessContextBatch,
    results
  };
}
