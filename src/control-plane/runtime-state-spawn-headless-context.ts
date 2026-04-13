import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { deriveExecutionSessionContext } from "./runtime-state-context.js";
import type {
  ExecutionSessionSpawnHeadlessContext,
  ExecutionSessionSpawnHeadlessContextInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessContext(
  input: ExecutionSessionSpawnHeadlessContextInput
): ExecutionSessionSpawnHeadlessContext {
  validateHeadlessContextInput(input);

  const headlessView =
    input.headlessView.descendantCoverage === undefined
      ? {
          ...input.headlessView,
          descendantCoverage: "incomplete" as const
        }
      : input.headlessView;
  const context = deriveExecutionSessionContext({
    selector: {
      attemptId: headlessView.headlessRecord.record.attemptId
    },
    view: headlessView.view
  });

  if (context === undefined) {
    throw new ValidationError(
      "Execution session spawn headless context requires a selected record."
    );
  }

  return {
    headlessView,
    context
  };
}

function validateHeadlessContextInput(
  input: ExecutionSessionSpawnHeadlessContextInput
): void {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionSpawnHeadlessContextInput>(
    input,
    "Execution session spawn headless context input must be an object."
  );
  const headlessView = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessContextInput["headlessView"]
  >(
    normalizedInput,
    "headlessView",
    "Execution session spawn headless context requires headlessView to be an object."
  );

  if (typeof headlessView !== "object" || headlessView === null || Array.isArray(headlessView)) {
    throw new ValidationError(
      "Execution session spawn headless context requires headlessView to be an object."
    );
  }
  const headlessRecord = readRequiredBatchWrapperProperty(
    headlessView,
    "headlessRecord",
    "Execution session spawn headless context requires headlessView.headlessRecord to be an object."
  );

  if (typeof headlessRecord !== "object" || headlessRecord === null || Array.isArray(headlessRecord)) {
    throw new ValidationError(
      "Execution session spawn headless context requires headlessView.headlessRecord to be an object."
    );
  }
  const headlessRecordContainer = headlessRecord as Record<string, unknown>;
  const record = readRequiredBatchWrapperProperty(
    headlessRecordContainer,
    "record",
    "Execution session spawn headless context requires headlessView.headlessRecord.record to be an object."
  );

  if (typeof record !== "object" || record === null || Array.isArray(record)) {
    throw new ValidationError(
      "Execution session spawn headless context requires headlessView.headlessRecord.record to be an object."
    );
  }
  const view = readRequiredBatchWrapperProperty(
    headlessView,
    "view",
    "Execution session spawn headless context requires headlessView.view to be an object."
  );

  if (typeof view !== "object" || view === null || Array.isArray(view)) {
    throw new ValidationError(
      "Execution session spawn headless context requires headlessView.view to be an object."
    );
  }
}
