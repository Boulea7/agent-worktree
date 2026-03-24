import type {
  ExecutionSessionSpawnConsume,
  ExecutionSessionSpawnConsumeInput
} from "./types.js";

export async function consumeExecutionSessionSpawn(
  input: ExecutionSessionSpawnConsumeInput
): Promise<ExecutionSessionSpawnConsume> {
  const { request, invokeSpawn } = input;

  await invokeSpawn(request);

  return {
    request,
    invoked: true
  };
}
