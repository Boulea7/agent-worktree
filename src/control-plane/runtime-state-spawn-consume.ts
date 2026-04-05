import type {
  ExecutionSessionSpawnConsume,
  ExecutionSessionSpawnConsumeInput
} from "./types.js";
import { normalizeExecutionSessionSpawnRequest } from "./runtime-state-spawn-request.js";

export async function consumeExecutionSessionSpawn(
  input: ExecutionSessionSpawnConsumeInput
): Promise<ExecutionSessionSpawnConsume> {
  const request = normalizeExecutionSessionSpawnRequest(input.request);

  await input.invokeSpawn(request);

  return {
    request,
    invoked: true
  };
}
