import { ValidationError } from "../core/errors.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { buildExecutionSessionView } from "./runtime-state-view.js";
import type {
  ExecutionSessionSpawnHeadlessViewBatch,
  ExecutionSessionSpawnHeadlessViewBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessViewBatch(
  input: ExecutionSessionSpawnHeadlessViewBatchInput
): ExecutionSessionSpawnHeadlessViewBatch {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !("headlessRecordBatch" in input)
  ) {
    throw new ValidationError(
      "Execution session spawn headless view batch requires a headlessRecordBatch wrapper."
    );
  }

  const normalizedBatch = normalizeHeadlessTargetBatchWrapper(
    input.headlessRecordBatch,
    {
      context: "Execution session spawn headless view batch",
      wrapperKey: "headlessRecordBatch"
    }
  );

  return {
    descendantCoverage: "incomplete",
    headlessRecordBatch: normalizedBatch,
    view: buildExecutionSessionView(
      normalizedBatch.results.map((result) => result.record)
    )
  };
}
