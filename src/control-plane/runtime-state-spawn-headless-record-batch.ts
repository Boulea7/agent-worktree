import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems
} from "./runtime-state-batch-wrapper-guards.js";
import { deriveExecutionSessionSpawnHeadlessRecord } from "./runtime-state-spawn-headless-record.js";
import type {
  ExecutionSessionSpawnHeadlessRecord,
  ExecutionSessionSpawnHeadlessRecordBatch,
  ExecutionSessionSpawnHeadlessRecordBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessRecordBatch(
  input: ExecutionSessionSpawnHeadlessRecordBatchInput
): ExecutionSessionSpawnHeadlessRecordBatch {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessRecordBatchInput>(
      input,
      "Execution session spawn headless record batch input must be an object."
    );
  const items = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessRecordBatchInput["items"][number]
  >(
    normalizedInput.items,
    "Execution session spawn headless record batch requires items to be an array.",
    "Execution session spawn headless record batch requires items entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessRecord[] = [];

  for (const item of items) {
    results.push(
      deriveExecutionSessionSpawnHeadlessRecord({
        headlessExecute: item
      })
    );
  }

  return {
    results
  };
}
