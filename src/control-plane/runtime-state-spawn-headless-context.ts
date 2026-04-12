import { ValidationError } from "../core/errors.js";
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
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session spawn headless context input must be an object."
    );
  }

  if (
    typeof input.headlessView !== "object" ||
    input.headlessView === null ||
    Array.isArray(input.headlessView)
  ) {
    throw new ValidationError(
      "Execution session spawn headless context requires headlessView to be an object."
    );
  }

  if (
    typeof input.headlessView.headlessRecord !== "object" ||
    input.headlessView.headlessRecord === null ||
    Array.isArray(input.headlessView.headlessRecord)
  ) {
    throw new ValidationError(
      "Execution session spawn headless context requires headlessView.headlessRecord to be an object."
    );
  }

  if (
    typeof input.headlessView.headlessRecord.record !== "object" ||
    input.headlessView.headlessRecord.record === null ||
    Array.isArray(input.headlessView.headlessRecord.record)
  ) {
    throw new ValidationError(
      "Execution session spawn headless context requires headlessView.headlessRecord.record to be an object."
    );
  }

  if (
    typeof input.headlessView.view !== "object" ||
    input.headlessView.view === null ||
    Array.isArray(input.headlessView.view)
  ) {
    throw new ValidationError(
      "Execution session spawn headless context requires headlessView.view to be an object."
    );
  }
}
