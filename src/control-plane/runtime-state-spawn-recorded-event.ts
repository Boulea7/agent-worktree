import type {
  ExecutionSessionSpawnRecordedEvent,
  ExecutionSessionSpawnRecordedEventInput
} from "./types.js";

export function deriveExecutionSessionSpawnRecordedEvent(
  input: ExecutionSessionSpawnRecordedEventInput
): ExecutionSessionSpawnRecordedEvent {
  return {
    attemptId: input.requestedEvent.attemptId,
    runtime: input.requestedEvent.runtime,
    sessionId: input.requestedEvent.sessionId,
    lifecycleEventKind: "spawn_recorded"
  };
}
