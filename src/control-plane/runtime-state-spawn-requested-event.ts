import type {
  ExecutionSessionSpawnRequestedEvent,
  ExecutionSessionSpawnRequestedEventInput
} from "./types.js";
import { normalizeExecutionSessionSpawnRequest } from "./runtime-state-spawn-request.js";

export function deriveExecutionSessionSpawnRequestedEvent(
  input: ExecutionSessionSpawnRequestedEventInput
): ExecutionSessionSpawnRequestedEvent {
  const request = normalizeExecutionSessionSpawnRequest(input.request);

  return {
    attemptId: request.parentAttemptId,
    runtime: request.parentRuntime,
    sessionId: request.parentSessionId,
    lifecycleEventKind: "spawn_requested"
  };
}
