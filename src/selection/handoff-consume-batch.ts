import { ValidationError } from "../core/errors.js";
import {
  normalizeSelectionArrayProperty,
  normalizeSelectionObjectArrayEntry,
  normalizeSelectionRequiredFunctionProperty
} from "./entry-validation.js";
import { consumeAttemptHandoff } from "./handoff-consume.js";
import type {
  AttemptHandoffConsume,
  AttemptHandoffConsumeBatch,
  AttemptHandoffConsumeBatchInput
} from "./types.js";

export async function consumeAttemptHandoffBatch(
  input: AttemptHandoffConsumeBatchInput
): Promise<AttemptHandoffConsumeBatch> {
  const { consumers, invokeHandoff } = validateInput(input);
  const results: AttemptHandoffConsume[] = [];

  for (let index = 0; index < consumers.length; index += 1) {
    const consumer = normalizeSelectionObjectArrayEntry<
      AttemptHandoffConsumeBatchInput["consumers"][number]
    >(
      consumers,
      index,
      "Attempt handoff consume batch requires consumers entries to be objects."
    );
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

function validateInput(
  value: unknown
): Pick<AttemptHandoffConsumeBatchInput, "consumers" | "invokeHandoff"> {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Attempt handoff consume batch input must be an object."
    );
  }

  return {
    consumers: normalizeSelectionArrayProperty(
      value,
      "consumers",
      "Attempt handoff consume batch requires consumers to be an array."
    ) as AttemptHandoffConsumeBatchInput["consumers"],
    invokeHandoff: normalizeSelectionRequiredFunctionProperty(
      value,
      "invokeHandoff",
      "Attempt handoff consume batch requires invokeHandoff to be a function."
    ) as AttemptHandoffConsumeBatchInput["invokeHandoff"]
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
