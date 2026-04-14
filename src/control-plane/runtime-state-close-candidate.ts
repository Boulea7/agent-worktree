import { ValidationError } from "../core/errors.js";
import { deriveExecutionSessionCandidateContext } from "./runtime-state-candidate-context.js";
import { deriveExecutionSessionCloseReadiness } from "./runtime-state-close-readiness.js";
import type {
  ExecutionSessionCloseCandidate,
  ExecutionSessionCloseCandidateInput
} from "./types.js";

export function deriveExecutionSessionCloseCandidate(
  input: ExecutionSessionCloseCandidateInput
): ExecutionSessionCloseCandidate | undefined {
  const context = deriveExecutionSessionCandidateContext(input, {
    input: "Execution session close candidate input must be an object.",
    selector: "Execution session close candidate requires selector to be an object.",
    view: "Execution session close candidate requires view to be an object."
  });

  if (context === undefined) {
    return undefined;
  }

  return {
    context,
    readiness: deriveExecutionSessionCloseReadiness({
      context,
      ...(input.resolveSessionLifecycleCapability === undefined
        ? {}
        : {
            resolveSessionLifecycleCapability:
              input.resolveSessionLifecycleCapability
          })
      })
  };
}
