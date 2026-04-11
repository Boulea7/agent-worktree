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
  const normalizedBatch = normalizeHeadlessContextBatchWrapper(
    input.headlessContextBatch,
    {
      context: "Execution session spawn headless close candidate batch",
      wrapperKey: "headlessContextBatch"
    }
  );
  const results: ExecutionSessionSpawnHeadlessCloseCandidate[] = [];

  for (const headlessContext of normalizedBatch.results) {
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
    headlessContextBatch: normalizedBatch,
    results
  };
}
