import { ValidationError } from "../core/errors.js";
import { consumeExecutionSessionWait } from "./runtime-state-wait-consume.js";
import type {
  ExecutionSessionWaitConsume,
  ExecutionSessionWaitConsumeBatch,
  ExecutionSessionWaitConsumeBatchInput
} from "./types.js";

export async function consumeExecutionSessionWaitBatch(
  input: ExecutionSessionWaitConsumeBatchInput
): Promise<ExecutionSessionWaitConsumeBatch> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session wait consume batch input must be an object."
    );
  }

  const { consumers, invokeWait } = input;

  if (!Array.isArray(consumers)) {
    throw new ValidationError(
      "Execution session wait consume batch requires consumers to be an array."
    );
  }

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
