import { adapterSupportsCapability } from "../adapters/catalog.js";
import type {
  ExecutionSessionCloseConsumerBlockingReason,
  ExecutionSessionCloseConsumerReadiness,
  ExecutionSessionCloseConsumerReadinessInput
} from "./types.js";

export function deriveExecutionSessionCloseConsumerReadiness(
  input: ExecutionSessionCloseConsumerReadinessInput
): ExecutionSessionCloseConsumerReadiness {
  const sessionLifecycleSupported = resolveSessionLifecycleCapability(input);
  const blockingReasons: ExecutionSessionCloseConsumerBlockingReason[] = [];

  if (!sessionLifecycleSupported) {
    blockingReasons.push("session_lifecycle_unsupported");
  }

  return {
    blockingReasons,
    canConsumeClose: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0,
    sessionLifecycleSupported
  };
}

function resolveSessionLifecycleCapability(
  input: ExecutionSessionCloseConsumerReadinessInput
): boolean {
  if (input.resolveSessionLifecycleCapability !== undefined) {
    return input.resolveSessionLifecycleCapability(input.request.runtime);
  }

  try {
    return adapterSupportsCapability(input.request.runtime, "sessionLifecycle");
  } catch {
    return false;
  }
}
