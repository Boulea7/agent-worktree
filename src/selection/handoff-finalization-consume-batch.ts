import { ValidationError } from "../core/errors.js";
import { consumeAttemptHandoffFinalization } from "./handoff-finalization-consume.js";
import type {
  AttemptHandoffFinalizationConsume,
  AttemptHandoffFinalizationConsumeBatch,
  AttemptHandoffFinalizationConsumeBatchInput
} from "./types.js";

export async function consumeAttemptHandoffFinalizationBatch(
  input: AttemptHandoffFinalizationConsumeBatchInput
): Promise<AttemptHandoffFinalizationConsumeBatch> {
  const normalizedInput = normalizeBatchInput(input);
  const consumers = normalizeConsumers(normalizedInput.consumers);
  const results: AttemptHandoffFinalizationConsume[] = [];

  for (const consumer of consumers) {
    results.push(
      await consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization: normalizedInput.invokeHandoffFinalization
      })
    );
  }

  return {
    results
  };
}

function normalizeBatchInput(
  value: unknown
): AttemptHandoffFinalizationConsumeBatchInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Attempt handoff finalization consume batch input must be an object."
    );
  }

  const normalizedValue = value as Record<string, unknown>;

  if (typeof normalizedValue.invokeHandoffFinalization !== "function") {
    throw new ValidationError(
      "Attempt handoff finalization consume batch requires invokeHandoffFinalization to be a function."
    );
  }

  return value as AttemptHandoffFinalizationConsumeBatchInput;
}

function normalizeConsumers(
  value: unknown
): AttemptHandoffFinalizationConsumeBatchInput["consumers"] {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "Attempt handoff finalization consume batch requires consumers to be an array."
    );
  }

  return value;
}
