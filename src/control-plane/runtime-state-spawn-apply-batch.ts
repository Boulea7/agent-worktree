import { applyExecutionSessionSpawn } from "./runtime-state-spawn-apply.js";
import type {
  ExecutionSessionSpawnApply,
  ExecutionSessionSpawnApplyBatch,
  ExecutionSessionSpawnApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionSpawnBatch(
  input: ExecutionSessionSpawnApplyBatchInput
): Promise<ExecutionSessionSpawnApplyBatch> {
  const results: ExecutionSessionSpawnApply[] = [];

  for (const item of input.items) {
    results.push(
      await applyExecutionSessionSpawn({
        childAttemptId: item.childAttemptId,
        request: item.request,
        invokeSpawn: input.invokeSpawn
      })
    );
  }

  return {
    results
  };
}
