import { normalizeHeadlessViewBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { deriveExecutionSessionSpawnHeadlessContext } from "./runtime-state-spawn-headless-context.js";
import type {
  ExecutionSessionSpawnHeadlessContext,
  ExecutionSessionSpawnHeadlessContextBatch,
  ExecutionSessionSpawnHeadlessContextBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessContextBatch(
  input: ExecutionSessionSpawnHeadlessContextBatchInput
): ExecutionSessionSpawnHeadlessContextBatch {
  const normalizedBatch = normalizeHeadlessViewBatchWrapper(input.headlessViewBatch, {
    context: "Execution session spawn headless context batch",
    wrapperKey: "headlessViewBatch"
  });
  const results: ExecutionSessionSpawnHeadlessContext[] = [];

  for (const headlessRecord of normalizedBatch.headlessRecordBatch.results) {
    results.push(
      deriveExecutionSessionSpawnHeadlessContext({
        headlessView: {
          ...(normalizedBatch.descendantCoverage === undefined
            ? {}
            : { descendantCoverage: normalizedBatch.descendantCoverage }),
          headlessRecord,
          view: normalizedBatch.view
        }
      })
    );
  }

  return {
    headlessViewBatch: normalizedBatch,
    results
  };
}
