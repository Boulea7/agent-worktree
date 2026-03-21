import { deriveExecutionSessionContext } from "./runtime-state-context.js";
import { deriveExecutionSessionCloseReadiness } from "./runtime-state-close-readiness.js";
import type {
  ExecutionSessionCloseCandidate,
  ExecutionSessionCloseCandidateInput
} from "./types.js";

export function deriveExecutionSessionCloseCandidate(
  input: ExecutionSessionCloseCandidateInput
): ExecutionSessionCloseCandidate | undefined {
  const context = deriveExecutionSessionContext({
    view: input.view,
    selector: input.selector
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
