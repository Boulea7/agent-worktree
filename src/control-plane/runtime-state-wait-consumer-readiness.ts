import { adapterSupportsCapability } from "../adapters/catalog.js";
import type {
  ExecutionSessionWaitConsumerBlockingReason,
  ExecutionSessionWaitConsumerReadiness,
  ExecutionSessionWaitConsumerReadinessInput
} from "./types.js";

export function deriveExecutionSessionWaitConsumerReadiness(
  input: ExecutionSessionWaitConsumerReadinessInput
): ExecutionSessionWaitConsumerReadiness {
  const sessionLifecycleSupported = resolveSessionLifecycleCapability(input);
  const blockingReasons: ExecutionSessionWaitConsumerBlockingReason[] = [];

  if (!sessionLifecycleSupported) {
    blockingReasons.push("session_lifecycle_unsupported");
  }

  return {
    blockingReasons,
    canConsumeWait: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0,
    sessionLifecycleSupported
  };
}

function resolveSessionLifecycleCapability(
  input: ExecutionSessionWaitConsumerReadinessInput
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
