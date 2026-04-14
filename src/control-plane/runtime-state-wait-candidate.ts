import { ValidationError } from "../core/errors.js";
import { deriveExecutionSessionCandidateContext } from "./runtime-state-candidate-context.js";
import { deriveExecutionSessionWaitReadiness } from "./runtime-state-readiness.js";
import type {
  ExecutionSessionWaitCandidate,
  ExecutionSessionWaitCandidateInput
} from "./types.js";

export function deriveExecutionSessionWaitCandidate(
  input: ExecutionSessionWaitCandidateInput
): ExecutionSessionWaitCandidate | undefined {
  const context = deriveExecutionSessionCandidateContext(input, {
    input: "Execution session wait candidate input must be an object.",
    selector: "Execution session wait candidate requires selector to be an object.",
    view: "Execution session wait candidate requires view to be an object."
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
