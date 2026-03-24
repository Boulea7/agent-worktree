import type {
  ExecutionSessionCloseRequestedEvent,
  ExecutionSessionCloseRequestedEventInput
} from "./types.js";

export function deriveExecutionSessionCloseRequestedEvent(
  input: ExecutionSessionCloseRequestedEventInput
): ExecutionSessionCloseRequestedEvent {
  return {
    attemptId: input.request.attemptId,
    runtime: input.request.runtime,
    sessionId: input.request.sessionId,
    lifecycleEventKind: "close_requested"
  };
}
