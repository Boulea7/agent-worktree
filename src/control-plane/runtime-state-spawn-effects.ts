import { deriveExecutionSessionSpawnLineage } from "./runtime-state-spawn-lineage.js";
import { deriveExecutionSessionSpawnRecordedEvent } from "./runtime-state-spawn-recorded-event.js";
import { deriveExecutionSessionSpawnRequestedEvent } from "./runtime-state-spawn-requested-event.js";
import type {
  ExecutionSessionSpawnEffects,
  ExecutionSessionSpawnEffectsInput
} from "./types.js";
import { normalizeExecutionSessionSpawnRequest } from "./runtime-state-spawn-request.js";

export function deriveExecutionSessionSpawnEffects(
  input: ExecutionSessionSpawnEffectsInput
): ExecutionSessionSpawnEffects {
  const request = normalizeExecutionSessionSpawnRequest(input.request);
  const lineage = deriveExecutionSessionSpawnLineage({
    childAttemptId: input.childAttemptId,
    request
  });
  const requestedEvent = deriveExecutionSessionSpawnRequestedEvent({
    request
  });
  const recordedEvent = deriveExecutionSessionSpawnRecordedEvent({
    requestedEvent
  });

  return {
    lineage,
    requestedEvent,
    recordedEvent
  };
}
