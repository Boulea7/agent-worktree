import { applyExecutionSessionSpawnHeadlessInput } from "./runtime-state-spawn-headless-apply.js";
import type {
  ExecutionSessionSpawnHeadlessApply,
  ExecutionSessionSpawnHeadlessApplyBatch,
  ExecutionSessionSpawnHeadlessApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessInputBatch(
  input: ExecutionSessionSpawnHeadlessApplyBatchInput
): Promise<ExecutionSessionSpawnHeadlessApplyBatch> {
  const results: ExecutionSessionSpawnHeadlessApply[] = [];

  for (const item of input.items) {
    results.push(
      await applyExecutionSessionSpawnHeadlessInput({
        childAttemptId: item.childAttemptId,
        request: item.request,
        get execution() {
          return item.execution;
        },
        invokeSpawn: input.invokeSpawn
      })
    );
  }

  return {
    results
  };
}
