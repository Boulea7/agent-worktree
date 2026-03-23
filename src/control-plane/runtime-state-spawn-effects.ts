import { deriveExecutionSessionSpawnLineage } from "./runtime-state-spawn-lineage.js";
import { deriveExecutionSessionSpawnRecordedEvent } from "./runtime-state-spawn-recorded-event.js";
import { deriveExecutionSessionSpawnRequestedEvent } from "./runtime-state-spawn-requested-event.js";
import type {
  ExecutionSessionSpawnEffects,
  ExecutionSessionSpawnEffectsInput
} from "./types.js";

export function deriveExecutionSessionSpawnEffects(
  input: ExecutionSessionSpawnEffectsInput
): ExecutionSessionSpawnEffects {
  const lineage = deriveExecutionSessionSpawnLineage({
    childAttemptId: input.childAttemptId,
    request: input.request
  });
  const requestedEvent = deriveExecutionSessionSpawnRequestedEvent({
    request: input.request
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
