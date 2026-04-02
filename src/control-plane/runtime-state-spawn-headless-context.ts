import { ValidationError } from "../core/errors.js";
import { deriveExecutionSessionContext } from "./runtime-state-context.js";
import type {
  ExecutionSessionSpawnHeadlessContext,
  ExecutionSessionSpawnHeadlessContextInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessContext(
  input: ExecutionSessionSpawnHeadlessContextInput
): ExecutionSessionSpawnHeadlessContext {
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
