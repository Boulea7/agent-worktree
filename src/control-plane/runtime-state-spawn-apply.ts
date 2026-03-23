import { consumeExecutionSessionSpawn } from "./runtime-state-spawn-consume.js";
import { deriveExecutionSessionSpawnEffects } from "./runtime-state-spawn-effects.js";
import type {
  ExecutionSessionSpawnApply,
  ExecutionSessionSpawnApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawn(
  input: ExecutionSessionSpawnApplyInput
): Promise<ExecutionSessionSpawnApply> {
  const consume = await consumeExecutionSessionSpawn({
    request: input.request,
    invokeSpawn: input.invokeSpawn
  });
  const effects = deriveExecutionSessionSpawnEffects({
    childAttemptId: input.childAttemptId,
    request: input.request
  });

  return {
    consume,
    effects
  };
}
