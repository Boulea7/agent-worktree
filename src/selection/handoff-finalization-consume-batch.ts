import { ValidationError } from "../core/errors.js";
import {
  normalizeSelectionArrayProperty,
  normalizeSelectionObjectArrayEntry,
  normalizeSelectionRequiredFunctionProperty,
} from "./entry-validation.js";
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
  const results: AttemptHandoffFinalizationConsume[] = [];

  for (let index = 0; index < normalizedInput.consumers.length; index += 1) {
    const consumer = normalizeSelectionObjectArrayEntry<
      AttemptHandoffFinalizationConsumeBatchInput["consumers"][number]
    >(
      normalizedInput.consumers,
      index,
      "Attempt handoff finalization consume batch requires consumers entries to be objects."
    );
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
): Pick<
  AttemptHandoffFinalizationConsumeBatchInput,
  "consumers" | "invokeHandoffFinalization"
> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Attempt handoff finalization consume batch input must be an object."
    );
  }

  const normalizedValue = value as Record<string, unknown>;

  return {
    consumers: normalizeSelectionArrayProperty(
      normalizedValue,
      "consumers",
      "Attempt handoff finalization consume batch requires consumers to be an array."
    ) as AttemptHandoffFinalizationConsumeBatchInput["consumers"],
    invokeHandoffFinalization: normalizeSelectionRequiredFunctionProperty(
      normalizedValue,
      "invokeHandoffFinalization",
      "Attempt handoff finalization consume batch requires invokeHandoffFinalization to be a function."
    ) as AttemptHandoffFinalizationConsumeBatchInput["invokeHandoffFinalization"]
  };
}
