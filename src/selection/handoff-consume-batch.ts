import { ValidationError } from "../core/errors.js";
import { consumeAttemptHandoff } from "./handoff-consume.js";
import type {
  AttemptHandoffConsume,
  AttemptHandoffConsumeBatch,
  AttemptHandoffConsumeBatchInput
} from "./types.js";

export async function consumeAttemptHandoffBatch(
  input: AttemptHandoffConsumeBatchInput
): Promise<AttemptHandoffConsumeBatch> {
  validateInput(input);
  const { consumers, invokeHandoff } = input;
  const results: AttemptHandoffConsume[] = [];

  for (let index = 0; index < consumers.length; index += 1) {
    if (
      !Object.prototype.hasOwnProperty.call(consumers, index) ||
      !isRecord(consumers[index])
    ) {
      throw new ValidationError(
        "Attempt handoff consume batch requires consumers entries to be objects."
      );
    }

    const consumer = consumers[index] as AttemptHandoffConsumeBatchInput["consumers"][number];
    results.push(
      await consumeAttemptHandoff({
        consumer,
        invokeHandoff
      })
    );
  }

  return {
    results
  };
}

function validateInput(value: unknown): void {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Attempt handoff consume batch input must be an object."
    );
  }

  if (!Array.isArray(value.consumers)) {
    throw new ValidationError(
      "Attempt handoff consume batch requires consumers to be an array."
    );
  }

  if (typeof value.invokeHandoff !== "function") {
    throw new ValidationError(
      "Attempt handoff consume batch requires invokeHandoff to be a function."
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
