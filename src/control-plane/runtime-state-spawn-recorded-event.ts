import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionSpawnRecordedEvent,
  ExecutionSessionSpawnRecordedEventInput
} from "./types.js";

export function deriveExecutionSessionSpawnRecordedEvent(
  input: ExecutionSessionSpawnRecordedEventInput
): ExecutionSessionSpawnRecordedEvent {
  const requestedEvent = normalizeRequestedEvent(input.requestedEvent);

  return {
    attemptId: requestedEvent.attemptId,
    runtime: requestedEvent.runtime,
    sessionId: requestedEvent.sessionId,
    lifecycleEventKind: "spawn_recorded"
  };
}

function normalizeRequestedEvent(
  value: ExecutionSessionSpawnRecordedEventInput["requestedEvent"]
) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session spawn recorded event requires requestedEvent to be an object."
    );
  }

  const attemptId = normalizeRequiredString(
    value.attemptId,
    "Execution session spawn recorded event requires requestedEvent.attemptId to be a non-empty string."
  );
  const runtime = normalizeRequiredString(
    value.runtime,
    "Execution session spawn recorded event requires requestedEvent.runtime to be a non-empty string."
  );
  const sessionId = normalizeRequiredString(
    value.sessionId,
    "Execution session spawn recorded event requires requestedEvent.sessionId to be a non-empty string."
  );

  if (value.lifecycleEventKind !== "spawn_requested") {
    throw new ValidationError(
      'Execution session spawn recorded event requires requestedEvent.lifecycleEventKind to be "spawn_requested".'
    );
  }

  return {
    attemptId,
    runtime,
    sessionId,
    lifecycleEventKind: "spawn_requested" as const
  };
}

function normalizeRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(message);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}
