import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readRequiredBatchWrapperProperty
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
  const consumersValue = readRequiredBatchWrapperProperty(
    normalizedInput,
    "consumers",
    "Execution session wait consume batch requires consumers to be an array."
  );
  const consumers = normalizeBatchWrapperObjectItems<
    ExecutionSessionWaitConsumeBatchInput["consumers"][number]
  >(
    consumersValue,
    "Execution session wait consume batch requires consumers to be an array.",
    "Execution session wait consume batch requires consumers entries to be objects."
  );
  const invokeWait = readRequiredBatchWrapperProperty(
    normalizedInput,
    "invokeWait",
    "Execution session wait consume requires invokeWait to be a function."
  );

  const results: ExecutionSessionWaitConsume[] = [];

  for (const consumer of consumers) {
    results.push(
      await consumeExecutionSessionWait({
        consumer,
        invokeWait: invokeWait as ExecutionSessionWaitConsumeBatchInput["invokeWait"]
      })
    );
  }

  return {
    results
  };
}
