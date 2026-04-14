import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { consumeExecutionSessionClose } from "./runtime-state-close-consume.js";
import type {
  ExecutionSessionCloseConsume,
  ExecutionSessionCloseConsumeBatch,
  ExecutionSessionCloseConsumeBatchInput
} from "./types.js";

export async function consumeExecutionSessionCloseBatch(
  input: ExecutionSessionCloseConsumeBatchInput
): Promise<ExecutionSessionCloseConsumeBatch> {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionCloseConsumeBatchInput>(
    input,
    "Execution session close consume batch input must be an object."
  );
  const consumersValue = readRequiredBatchWrapperProperty(
    normalizedInput,
    "consumers",
    "Execution session close consume batch requires consumers to be an array."
  );
  const consumers = normalizeBatchWrapperObjectItems<
    ExecutionSessionCloseConsumeBatchInput["consumers"][number]
  >(
    consumersValue,
    "Execution session close consume batch requires consumers to be an array.",
    "Execution session close consume batch requires consumers entries to be objects."
  );
  const invokeClose = readRequiredBatchWrapperProperty(
    normalizedInput,
    "invokeClose",
    "Execution session close consume requires invokeClose to be a function."
  );

  const results: ExecutionSessionCloseConsume[] = [];

  for (const consumer of consumers) {
    results.push(
      await consumeExecutionSessionClose({
        consumer,
        invokeClose:
          invokeClose as ExecutionSessionCloseConsumeBatchInput["invokeClose"]
      })
    );
  }

  return {
    results
  };
}
