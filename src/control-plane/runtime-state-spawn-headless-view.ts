import { buildExecutionSessionView } from "./runtime-state-view.js";
import type {
  ExecutionSessionSpawnHeadlessView,
  ExecutionSessionSpawnHeadlessViewInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessView(
  input: ExecutionSessionSpawnHeadlessViewInput
): ExecutionSessionSpawnHeadlessView {
  return {
    headlessRecord: input.headlessRecord,
    view: buildExecutionSessionView([input.headlessRecord.record])
  };
}
