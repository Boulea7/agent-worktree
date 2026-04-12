import { ValidationError } from "../core/errors.js";
import { normalizeBatchWrapperObjectItems } from "./runtime-state-batch-wrapper-guards.js";
import { consumeExecutionSessionSpawn } from "./runtime-state-spawn-consume.js";
import type {
  ExecutionSessionSpawnConsumeBatch,
  ExecutionSessionSpawnConsumeBatchInput
} from "./types.js";

export async function consumeExecutionSessionSpawnBatch(
  input: ExecutionSessionSpawnConsumeBatchInput
): Promise<ExecutionSessionSpawnConsumeBatch> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session spawn consume batch input must be an object."
    );
  }

  if (!Array.isArray(input.requests)) {
    throw new ValidationError(
      "Execution session spawn consume batch requires requests to be an array."
    );
  }

  if (typeof input.invokeSpawn !== "function") {
    throw new ValidationError(
      "Execution session spawn consume batch requires invokeSpawn to be a function."
    );
  }

  const requests = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnConsumeBatchInput["requests"][number]
  >(
    input.requests,
    "Execution session spawn consume batch requires requests to be an array.",
    "Execution session spawn consume batch requires requests entries to be objects."
  );
  const { invokeSpawn } = input;
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
