import { buildExecutionSessionView } from "./runtime-state-view.js";
import type {
  ExecutionSessionSpawnHeadlessViewBatch,
  ExecutionSessionSpawnHeadlessViewBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessViewBatch(
  input: ExecutionSessionSpawnHeadlessViewBatchInput
): ExecutionSessionSpawnHeadlessViewBatch {
  return {
    headlessRecordBatch: input.headlessRecordBatch,
    view: buildExecutionSessionView(
      input.headlessRecordBatch.results.map((result) => result.record)
    )
  };
}
