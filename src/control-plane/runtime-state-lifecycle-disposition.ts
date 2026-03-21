import type {
  ExecutionSessionLifecycleDisposition,
  ExecutionSessionLifecycleDispositionInput,
  SessionLifecycleState
} from "./types.js";

const terminalLifecycleStates = new Set<SessionLifecycleState>([
  "completed",
  "failed",
  "closed"
]);

export function deriveExecutionSessionLifecycleDisposition(
  input: ExecutionSessionLifecycleDispositionInput
): ExecutionSessionLifecycleDisposition {
  return {
    alreadyFinal: terminalLifecycleStates.has(input.context.record.lifecycleState),
    hasKnownSession: input.context.hasKnownSession,
    wouldAffectDescendants: input.context.hasChildren
  };
}
