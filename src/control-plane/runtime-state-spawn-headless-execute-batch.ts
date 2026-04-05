import { executeExecutionSessionSpawnHeadless } from "./runtime-state-spawn-headless-execute.js";
import type {
  ExecutionSessionSpawnHeadlessExecute,
  ExecutionSessionSpawnHeadlessExecuteBatch,
  ExecutionSessionSpawnHeadlessExecuteBatchInput
} from "./types.js";

export async function executeExecutionSessionSpawnHeadlessBatch(
  input: ExecutionSessionSpawnHeadlessExecuteBatchInput
): Promise<ExecutionSessionSpawnHeadlessExecuteBatch> {
  const results: ExecutionSessionSpawnHeadlessExecute[] = [];

  for (const item of input.items) {
    results.push(
      await executeExecutionSessionSpawnHeadless({
        childAttemptId: item.childAttemptId,
        request: item.request,
        get execution() {
          return item.execution;
        },
        invokeSpawn: input.invokeSpawn,
        executeHeadless: input.executeHeadless
      })
    );
  }

  return {
    results
  };
}
