import { ValidationError } from "../core/errors.js";
import { deriveExecutionSessionContext } from "./runtime-state-context.js";
import type {
  ExecutionSessionSpawnHeadlessContext,
  ExecutionSessionSpawnHeadlessContextInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessContext(
  input: ExecutionSessionSpawnHeadlessContextInput
): ExecutionSessionSpawnHeadlessContext {
  const context = deriveExecutionSessionContext({
    selector: {
      attemptId: input.headlessView.headlessRecord.record.attemptId
    },
    view: input.headlessView.view
  });

  if (context === undefined) {
    throw new ValidationError(
      "Execution session spawn headless context requires a selected record."
    );
  }

  return {
    headlessView: input.headlessView,
    context
  };
}
