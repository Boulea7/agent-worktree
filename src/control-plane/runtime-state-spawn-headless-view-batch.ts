import { ValidationError } from "../core/errors.js";
import { normalizeBatchWrapperObjectItems } from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { buildExecutionSessionView } from "./runtime-state-view.js";
import type {
  ExecutionSessionRecord,
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
  const results = validateHeadlessRecordBatchResults(normalizedBatch.results);

  return {
    descendantCoverage: "incomplete",
    headlessRecordBatch: normalizedBatch,
    view: buildExecutionSessionView(results.map((result) => result.record))
  };
}

function validateHeadlessRecordBatchResults(
  results: readonly unknown[]
): { record: ExecutionSessionRecord }[] {
  const normalizedResults = normalizeBatchWrapperObjectItems<{
    record: ExecutionSessionRecord;
  }>(
    results,
    "Execution session spawn headless view batch requires headlessRecordBatch.results to be an array.",
    "Execution session spawn headless view batch requires headlessRecordBatch.results entries to include record objects."
  );

  for (let index = 0; index < normalizedResults.length; index += 1) {
    const result = normalizedResults[index]!;

    if (
      !Object.prototype.hasOwnProperty.call(result, "record") ||
      typeof result.record !== "object" ||
      result.record === null ||
      Array.isArray(result.record)
    ) {
      throw new ValidationError(
        "Execution session spawn headless view batch requires headlessRecordBatch.results entries to include record objects."
      );
    }
  }

  return normalizedResults;
}
