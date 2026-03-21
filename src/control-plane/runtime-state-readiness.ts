import { deriveExecutionSessionLifecycleDisposition } from "./runtime-state-lifecycle-disposition.js";
import type {
  ExecutionSessionWaitBlockingReason,
  ExecutionSessionWaitReadiness,
  ExecutionSessionWaitReadinessInput
} from "./types.js";

export function deriveExecutionSessionWaitReadiness(
  input: ExecutionSessionWaitReadinessInput
): ExecutionSessionWaitReadiness {
  const disposition = deriveExecutionSessionLifecycleDisposition({
    context: input.context
  });
  const blockingReasons: ExecutionSessionWaitBlockingReason[] = [];

  if (disposition.alreadyFinal) {
    blockingReasons.push("lifecycle_terminal");
  }

  if (!disposition.hasKnownSession) {
    blockingReasons.push("session_unknown");
  }

  if (disposition.wouldAffectDescendants) {
    blockingReasons.push("child_attempts_present");
  }

  return {
    blockingReasons,
    canWait: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0
  };
}
