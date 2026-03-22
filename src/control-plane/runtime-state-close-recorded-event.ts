import type {
  ExecutionSessionCloseRecordedEvent,
  ExecutionSessionCloseRecordedEventInput
} from "./types.js";

export function deriveExecutionSessionCloseRecordedEvent(
  input: ExecutionSessionCloseRecordedEventInput
): ExecutionSessionCloseRecordedEvent {
  return {
    attemptId: input.requestedEvent.attemptId,
    runtime: input.requestedEvent.runtime,
    sessionId: input.requestedEvent.sessionId,
    lifecycleEventKind: "close_recorded"
  };
}
