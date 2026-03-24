import { deriveExecutionSessionSpawnHeadlessContext } from "./runtime-state-spawn-headless-context.js";
import type {
  ExecutionSessionSpawnHeadlessContext,
  ExecutionSessionSpawnHeadlessContextBatch,
  ExecutionSessionSpawnHeadlessContextBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessContextBatch(
  input: ExecutionSessionSpawnHeadlessContextBatchInput
): ExecutionSessionSpawnHeadlessContextBatch {
  const results: ExecutionSessionSpawnHeadlessContext[] = [];

  for (const headlessRecord of input.headlessViewBatch.headlessRecordBatch
    .results) {
    results.push(
      deriveExecutionSessionSpawnHeadlessContext({
        headlessView: {
          headlessRecord,
          view: input.headlessViewBatch.view
        }
      })
    );
  }

  return {
    headlessViewBatch: input.headlessViewBatch,
    results
  };
}
