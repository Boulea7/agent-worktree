import type {
  ExecutionSessionSpawnRequestedEvent,
  ExecutionSessionSpawnRequestedEventInput
} from "./types.js";

export function deriveExecutionSessionSpawnRequestedEvent(
  input: ExecutionSessionSpawnRequestedEventInput
): ExecutionSessionSpawnRequestedEvent {
  return {
    attemptId: input.request.parentAttemptId,
    runtime: input.request.parentRuntime,
    sessionId: input.request.parentSessionId,
    lifecycleEventKind: "spawn_requested"
  };
}
