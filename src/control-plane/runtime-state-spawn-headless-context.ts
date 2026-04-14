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

function snapshotObject(
  value: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const snapshot = Object.create(Object.getPrototypeOf(value)) as Record<
    string,
    unknown
  >;

  const descriptors = Object.getOwnPropertyDescriptors(value);

  for (const key of Object.keys(overrides)) {
    delete descriptors[key];
  }

  Object.defineProperties(snapshot, descriptors);

  for (const [key, override] of Object.entries(overrides)) {
    Object.defineProperty(snapshot, key, {
      value: override,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }

  return snapshot;
}

export function deriveExecutionSessionSpawnHeadlessContext(
  input: ExecutionSessionSpawnHeadlessContextInput
): ExecutionSessionSpawnHeadlessContext {
  const headlessView = validateHeadlessContextInput(input);

  const normalizedHeadlessView =
    headlessView.descendantCoverage === undefined
      ? {
          ...headlessView,
          descendantCoverage: "incomplete" as const
        }
      : headlessView;
  const context = deriveExecutionSessionContext({
    selector: {
      attemptId: normalizedHeadlessView.headlessRecord.record.attemptId
    },
    view: normalizedHeadlessView.view
  });

  if (context === undefined) {
    throw new ValidationError(
      "Execution session spawn headless context requires a selected record."
    );
  }

  return {
    headlessView: normalizedHeadlessView,
    context
  };
}

function validateHeadlessContextInput(
  input: ExecutionSessionSpawnHeadlessContextInput
): ExecutionSessionSpawnHeadlessContextInput["headlessView"] {
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

  return snapshotObject(headlessView as unknown as Record<string, unknown>, {
    headlessRecord: snapshotObject(headlessRecordContainer, {
      record: record as Record<string, unknown>
    }),
    view: view as Record<string, unknown>
  }) as unknown as ExecutionSessionSpawnHeadlessContextInput["headlessView"];
}
