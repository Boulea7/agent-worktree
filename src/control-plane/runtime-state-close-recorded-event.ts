import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionCloseRecordedEvent,
  ExecutionSessionCloseRecordedEventInput
} from "./types.js";

export function deriveExecutionSessionCloseRecordedEvent(
  input: ExecutionSessionCloseRecordedEventInput
): ExecutionSessionCloseRecordedEvent {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session close recorded event input must be an object."
    );
  }

  if (
    typeof input.requestedEvent !== "object" ||
    input.requestedEvent === null ||
    Array.isArray(input.requestedEvent)
  ) {
    throw new ValidationError(
      "Execution session close recorded event requires requestedEvent to be an object."
    );
  }

  return {
    attemptId: input.requestedEvent.attemptId,
    runtime: input.requestedEvent.runtime,
    sessionId: input.requestedEvent.sessionId,
    lifecycleEventKind: "close_recorded"
  };
}
