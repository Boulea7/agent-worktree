import { deriveExecutionSessionContext } from "./runtime-state-context.js";
import { deriveExecutionSessionWaitReadiness } from "./runtime-state-readiness.js";
import type {
  ExecutionSessionWaitCandidate,
  ExecutionSessionWaitCandidateInput
} from "./types.js";

export function deriveExecutionSessionWaitCandidate(
  input: ExecutionSessionWaitCandidateInput
): ExecutionSessionWaitCandidate | undefined {
  const context = deriveExecutionSessionContext({
    view: input.view,
    selector: input.selector
  });

  if (context === undefined) {
    return undefined;
  }

  return {
    context,
    readiness: deriveExecutionSessionWaitReadiness({
      context
    })
  };
}
