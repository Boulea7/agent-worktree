import { deriveExecutionSessionSpawnHeadlessRecord } from "./runtime-state-spawn-headless-record.js";
import type {
  ExecutionSessionSpawnHeadlessRecord,
  ExecutionSessionSpawnHeadlessRecordBatch,
  ExecutionSessionSpawnHeadlessRecordBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessRecordBatch(
  input: ExecutionSessionSpawnHeadlessRecordBatchInput
): ExecutionSessionSpawnHeadlessRecordBatch {
  const results: ExecutionSessionSpawnHeadlessRecord[] = [];

  for (const item of input.items) {
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
