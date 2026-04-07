import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionCloseRequestedEvent,
  ExecutionSessionCloseRequestedEventInput
} from "./types.js";

export function deriveExecutionSessionCloseRequestedEvent(
  input: ExecutionSessionCloseRequestedEventInput
): ExecutionSessionCloseRequestedEvent {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session close requested event input must be an object."
    );
  }

  if (
    typeof input.request !== "object" ||
    input.request === null ||
    Array.isArray(input.request)
  ) {
    throw new ValidationError(
      "Execution session close requested event requires request to be an object."
    );
  }

  const attemptId = normalizeRequiredIdentifier(
    input.request.attemptId,
    "Execution session close requested event attemptId must be a non-empty string."
  );
  const runtime = normalizeRequiredIdentifier(
    input.request.runtime,
    "Execution session close requested event runtime must be a non-empty string."
  );
  const sessionId = normalizeRequiredIdentifier(
    input.request.sessionId,
    "Execution session close requested event sessionId must be a non-empty string."
  );

  return {
    attemptId,
    runtime,
    sessionId,
    lifecycleEventKind: "close_requested"
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
