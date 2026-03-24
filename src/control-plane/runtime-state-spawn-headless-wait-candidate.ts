import { deriveExecutionSessionWaitReadiness } from "./runtime-state-readiness.js";
import type {
  ExecutionSessionSpawnHeadlessWaitCandidate,
  ExecutionSessionSpawnHeadlessWaitCandidateInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitCandidate(
  input: ExecutionSessionSpawnHeadlessWaitCandidateInput
): ExecutionSessionSpawnHeadlessWaitCandidate {
  const readiness = deriveExecutionSessionWaitReadiness({
    context: input.headlessContext.context
  });

  return {
    headlessContext: input.headlessContext,
    candidate: {
      context: input.headlessContext.context,
      readiness
    }
  };
}
