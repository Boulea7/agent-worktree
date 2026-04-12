import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapperObjectItems,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { buildExecutionSessionView } from "./runtime-state-view.js";
import type {
  ExecutionSessionRecord,
  ExecutionSessionSpawnHeadlessRecordBatch,
  ExecutionSessionSpawnHeadlessViewBatch,
  ExecutionSessionSpawnHeadlessViewBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessViewBatch(
  input: ExecutionSessionSpawnHeadlessViewBatchInput
): ExecutionSessionSpawnHeadlessViewBatch {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session spawn headless view batch requires a headlessRecordBatch wrapper."
    );
  }

  const headlessRecordBatch =
    readRequiredBatchWrapperProperty<ExecutionSessionSpawnHeadlessRecordBatch>(
      input,
      "headlessRecordBatch",
      "Execution session spawn headless view batch requires a headlessRecordBatch wrapper."
    );
  const normalizedBatch = normalizeHeadlessTargetBatchWrapper(
    headlessRecordBatch,
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
    let record: unknown;

    try {
      if (!Object.prototype.hasOwnProperty.call(result, "record")) {
        throw new ValidationError(
          "Execution session spawn headless view batch requires headlessRecordBatch.results entries to include record objects."
        );
      }

      record = result.record;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new ValidationError(
        "Execution session spawn headless view batch requires headlessRecordBatch.results entries to include record objects."
      );
    }

    if (typeof record !== "object" || record === null || Array.isArray(record)) {
      throw new ValidationError(
        "Execution session spawn headless view batch requires headlessRecordBatch.results entries to include record objects."
      );
    }
  }

  return normalizedResults;
}
