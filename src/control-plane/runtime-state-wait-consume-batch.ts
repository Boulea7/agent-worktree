import { consumeExecutionSessionWait } from "./runtime-state-wait-consume.js";
import type {
  ExecutionSessionWaitConsume,
  ExecutionSessionWaitConsumeBatch,
  ExecutionSessionWaitConsumeBatchInput
} from "./types.js";

export async function consumeExecutionSessionWaitBatch(
  input: ExecutionSessionWaitConsumeBatchInput
): Promise<ExecutionSessionWaitConsumeBatch> {
  const { consumers, invokeWait } = input;
  const results: ExecutionSessionWaitConsume[] = [];

  for (const consumer of consumers) {
    results.push(
      await consumeExecutionSessionWait({
        consumer,
        invokeWait
      })
    );
  }

  return {
    results
  };
}
