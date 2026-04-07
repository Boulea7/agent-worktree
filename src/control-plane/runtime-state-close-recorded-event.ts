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

  if (input.requestedEvent.lifecycleEventKind !== "close_requested") {
    throw new ValidationError(
      'Execution session close recorded event requires requestedEvent.lifecycleEventKind to be "close_requested".'
    );
  }

  const attemptId = normalizeRequiredIdentifier(
    input.requestedEvent.attemptId,
    "Execution session close recorded event attemptId must be a non-empty string."
  );
  const runtime = normalizeRequiredIdentifier(
    input.requestedEvent.runtime,
    "Execution session close recorded event runtime must be a non-empty string."
  );
  const sessionId = normalizeRequiredIdentifier(
    input.requestedEvent.sessionId,
    "Execution session close recorded event sessionId must be a non-empty string."
  );

  return {
    attemptId,
    runtime,
    sessionId,
    lifecycleEventKind: "close_recorded"
  };
}

function normalizeRequiredIdentifier(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(message);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}
