import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
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
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessContextBatchInput>(
      input,
      "Execution session spawn headless context batch input must be an object."
    );

  const headlessViewBatch = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessContextBatchInput["headlessViewBatch"]
  >(
    normalizedInput,
    "headlessViewBatch",
    "Execution session spawn headless context batch requires a headlessViewBatch wrapper."
  );
  const normalizedBatch = normalizeHeadlessViewBatchWrapper(headlessViewBatch, {
    context: "Execution session spawn headless context batch",
    wrapperKey: "headlessViewBatch"
  });
  const headlessRecords = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessContextBatch["headlessViewBatch"]["headlessRecordBatch"]["results"][number]
  >(
    normalizedBatch.headlessRecordBatch.results,
    "Execution session spawn headless context batch requires headlessViewBatch.headlessRecordBatch.results to be an array.",
    "Execution session spawn headless context batch requires headlessViewBatch.headlessRecordBatch.results entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessContext[] = [];

  for (const headlessRecord of headlessRecords) {
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
