import { ValidationError } from "../core/errors.js";
import { consumeExecutionSessionClose } from "./runtime-state-close-consume.js";
import type {
  ExecutionSessionCloseConsumeBatch,
  ExecutionSessionCloseConsumeBatchInput
} from "./types.js";

export async function consumeExecutionSessionCloseBatch(
  input: ExecutionSessionCloseConsumeBatchInput
): Promise<ExecutionSessionCloseConsumeBatch> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session close consume batch input must be an object."
    );
  }

  const { consumers, invokeClose } = input;

  if (!Array.isArray(consumers)) {
    throw new ValidationError(
      "Execution session close consume batch requires consumers to be an array."
    );
  }

  const results = [];

  for (const consumer of consumers) {
    results.push(
      await consumeExecutionSessionClose({
        consumer,
        invokeClose
      })
    );
  }

  return {
    results
  };
}
