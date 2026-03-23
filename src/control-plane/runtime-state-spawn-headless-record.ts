import { ValidationError } from "../core/errors.js";
import { deriveExecutionSessionRecord } from "./runtime-state.js";
import type {
  ExecutionSessionSpawnHeadlessRecord,
  ExecutionSessionSpawnHeadlessRecordInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessRecord(
  input: ExecutionSessionSpawnHeadlessRecordInput
): ExecutionSessionSpawnHeadlessRecord {
  const record = deriveExecutionSessionRecord({
    attempt: input.headlessExecute.headlessApply.headlessInput.attempt,
    result: input.headlessExecute.executionResult
  });

  if (record === undefined) {
    throw new ValidationError(
      "Execution session spawn headless record requires attempt lineage."
    );
  }

  return {
    headlessExecute: input.headlessExecute,
    record
  };
}
