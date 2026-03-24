import { consumeExecutionSessionSpawn } from "./runtime-state-spawn-consume.js";
import type {
  ExecutionSessionSpawnConsumeBatch,
  ExecutionSessionSpawnConsumeBatchInput
} from "./types.js";

export async function consumeExecutionSessionSpawnBatch(
  input: ExecutionSessionSpawnConsumeBatchInput
): Promise<ExecutionSessionSpawnConsumeBatch> {
  const { requests, invokeSpawn } = input;
  const results = [];

  for (const request of requests) {
    results.push(
      await consumeExecutionSessionSpawn({
        request,
        invokeSpawn
      })
    );
  }

  return {
    results
  };
}
