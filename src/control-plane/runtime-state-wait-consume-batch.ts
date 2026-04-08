import {
  normalizeBatchWrapper,
  normalizeBatchWrapperItems
} from "./runtime-state-batch-wrapper-guards.js";
import { consumeExecutionSessionWait } from "./runtime-state-wait-consume.js";
import type {
  ExecutionSessionWaitConsume,
  ExecutionSessionWaitConsumeBatch,
  ExecutionSessionWaitConsumeBatchInput
} from "./types.js";

export async function consumeExecutionSessionWaitBatch(
  input: ExecutionSessionWaitConsumeBatchInput
): Promise<ExecutionSessionWaitConsumeBatch> {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionWaitConsumeBatchInput>(
    input,
    "Execution session wait consume batch input must be an object."
  );
  const consumers = normalizeBatchWrapperItems<
    ExecutionSessionWaitConsumeBatchInput["consumers"][number]
  >(
    normalizedInput.consumers,
    "Execution session wait consume batch requires consumers to be an array."
  );

  const results: ExecutionSessionWaitConsume[] = [];

  for (const consumer of consumers) {
    results.push(
      await consumeExecutionSessionWait({
        consumer,
        invokeWait: normalizedInput.invokeWait
      })
    );
  }

  return {
    results
  };
}
