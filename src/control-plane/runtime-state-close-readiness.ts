import { adapterSupportsCapability } from "../adapters/catalog.js";
import { deriveExecutionSessionLifecycleDisposition } from "./runtime-state-lifecycle-disposition.js";
import type {
  ExecutionSessionCloseBlockingReason,
  ExecutionSessionCloseReadiness,
  ExecutionSessionCloseReadinessInput
} from "./types.js";

export function deriveExecutionSessionCloseReadiness(
  input: ExecutionSessionCloseReadinessInput
): ExecutionSessionCloseReadiness {
  const disposition = deriveExecutionSessionLifecycleDisposition({
    context: input.context
  });
  const sessionLifecycleSupported = resolveSessionLifecycleCapability(input);
  const blockingReasons: ExecutionSessionCloseBlockingReason[] = [];

  if (!sessionLifecycleSupported) {
    blockingReasons.push("session_lifecycle_unsupported");
  }

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
    alreadyFinal: disposition.alreadyFinal,
    blockingReasons,
    canClose: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0,
    sessionLifecycleSupported,
    wouldAffectDescendants: disposition.wouldAffectDescendants
  };
}

function resolveSessionLifecycleCapability(
  input: ExecutionSessionCloseReadinessInput
): boolean {
  if (input.resolveSessionLifecycleCapability !== undefined) {
    return input.resolveSessionLifecycleCapability(input.context.record.runtime);
  }

  try {
    return adapterSupportsCapability(
      input.context.record.runtime,
      "sessionLifecycle"
    );
  } catch {
    return false;
  }
}
