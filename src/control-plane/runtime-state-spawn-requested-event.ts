import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionSpawnRequestedEvent,
  ExecutionSessionSpawnRequestedEventInput
} from "./types.js";
import { normalizeExecutionSessionSpawnRequest } from "./runtime-state-spawn-request.js";

export function deriveExecutionSessionSpawnRequestedEvent(
  input: ExecutionSessionSpawnRequestedEventInput
): ExecutionSessionSpawnRequestedEvent {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session spawn requested event input must be an object."
    );
  }

  if (
    typeof input.request !== "object" ||
    input.request === null ||
    Array.isArray(input.request)
  ) {
    throw new ValidationError(
      "Execution session spawn requested event requires request to be an object."
    );
  }

  const request = normalizeExecutionSessionSpawnRequest(input.request);

  return {
    attemptId: request.parentAttemptId,
    runtime: request.parentRuntime,
    sessionId: request.parentSessionId,
    lifecycleEventKind: "spawn_requested"
  };
}
