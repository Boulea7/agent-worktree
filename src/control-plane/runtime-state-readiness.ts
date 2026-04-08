import { ValidationError } from "../core/errors.js";
import { deriveExecutionSessionLifecycleDisposition } from "./runtime-state-lifecycle-disposition.js";
import type {
  ExecutionSessionWaitBlockingReason,
  ExecutionSessionWaitReadiness,
  ExecutionSessionWaitReadinessInput
} from "./types.js";

export function deriveExecutionSessionWaitReadiness(
  input: ExecutionSessionWaitReadinessInput
): ExecutionSessionWaitReadiness {
  if (!isRecord(input)) {
    throw new ValidationError(
      "Execution session wait readiness input must be an object."
    );
  }

  if (!isRecord(input.context)) {
    throw new ValidationError(
      "Execution session wait readiness requires context to be an object."
    );
  }

  if (!isRecord(input.context.record)) {
    throw new ValidationError(
      "Execution session wait readiness requires context.record to be an object."
    );
  }

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
