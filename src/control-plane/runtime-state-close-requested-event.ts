import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionCloseRequestedEvent,
  ExecutionSessionCloseRequestedEventInput
} from "./types.js";
import { normalizeExecutionSessionCloseRequest } from "./runtime-state-close-request.js";

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

  const request = normalizeExecutionSessionCloseRequest({
    attemptId: input.request.attemptId,
    runtime: input.request.runtime,
    sessionId: input.request.sessionId
  });

  return {
    attemptId: request.attemptId,
    runtime: request.runtime,
    sessionId: request.sessionId,
    lifecycleEventKind: "close_requested"
  };
}
