import { deriveExecutionSessionCloseReadiness } from "./runtime-state-close-readiness.js";
import type {
  ExecutionSessionSpawnHeadlessCloseCandidate,
  ExecutionSessionSpawnHeadlessCloseCandidateInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseCandidate(
  input: ExecutionSessionSpawnHeadlessCloseCandidateInput
): ExecutionSessionSpawnHeadlessCloseCandidate {
  const readiness = deriveExecutionSessionCloseReadiness({
    context: input.headlessContext.context,
    ...(input.resolveSessionLifecycleCapability === undefined
      ? {}
      : {
          resolveSessionLifecycleCapability:
            input.resolveSessionLifecycleCapability
        })
  });

  return {
    headlessContext: input.headlessContext,
    candidate: {
      context: input.headlessContext.context,
      readiness
    }
  };
}
