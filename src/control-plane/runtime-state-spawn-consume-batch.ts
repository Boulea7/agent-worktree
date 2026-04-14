import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { consumeExecutionSessionSpawn } from "./runtime-state-spawn-consume.js";
import type {
  ExecutionSessionSpawnConsumeBatch,
  ExecutionSessionSpawnConsumeBatchInput
} from "./types.js";

export async function consumeExecutionSessionSpawnBatch(
  input: ExecutionSessionSpawnConsumeBatchInput
): Promise<ExecutionSessionSpawnConsumeBatch> {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnConsumeBatchInput>(
      input,
      "Execution session spawn consume batch input must be an object."
    );
  const requestsValue = readRequiredBatchWrapperProperty(
    normalizedInput,
    "requests",
    "Execution session spawn consume batch requires requests to be an array."
  );
  const invokeSpawn = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnConsumeBatchInput["invokeSpawn"]
  >(
    normalizedInput,
    "invokeSpawn",
    "Execution session spawn consume batch requires invokeSpawn to be a function."
  );
  if (typeof invokeSpawn !== "function") {
    throw new ValidationError(
      "Execution session spawn consume batch requires invokeSpawn to be a function."
    );
  }

  const requests = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnConsumeBatchInput["requests"][number]
  >(
    requestsValue,
    "Execution session spawn consume batch requires requests to be an array.",
    "Execution session spawn consume batch requires requests entries to be objects."
  );
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
