import { consumeExecutionSessionSpawn } from "./runtime-state-spawn-consume.js";
import { deriveExecutionSessionSpawnEffects } from "./runtime-state-spawn-effects.js";
import { normalizeExecutionSessionSpawnRequest } from "./runtime-state-spawn-request.js";
import type {
  ExecutionSessionSpawnApply,
  ExecutionSessionSpawnApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawn(
  input: ExecutionSessionSpawnApplyInput
): Promise<ExecutionSessionSpawnApply> {
  const request = normalizeExecutionSessionSpawnRequest(input.request);
  const effects = deriveExecutionSessionSpawnEffects({
    childAttemptId: input.childAttemptId,
    request
  });
  const consume = await consumeExecutionSessionSpawn({
    request,
    invokeSpawn: input.invokeSpawn
  });

  return {
    consume,
    effects
  };
}
