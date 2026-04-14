import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { deriveExecutionSessionSpawnEffects } from "./runtime-state-spawn-effects.js";
import type {
  ExecutionSessionSpawnEffects,
  ExecutionSessionSpawnEffectsBatch,
  ExecutionSessionSpawnEffectsBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnEffectsBatch(
  input: ExecutionSessionSpawnEffectsBatchInput
): ExecutionSessionSpawnEffectsBatch {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnEffectsBatchInput>(
      input,
      "Execution session spawn effects batch input must be an object."
    );
  const itemsValue = readRequiredBatchWrapperProperty(
    normalizedInput,
    "items",
    "Execution session spawn effects batch requires items to be an array."
  );
  const items = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnEffectsBatchInput["items"][number]
  >(
    itemsValue,
    "Execution session spawn effects batch requires items to be an array.",
    "Execution session spawn effects batch requires items entries to be objects."
  );
  const results: ExecutionSessionSpawnEffects[] = [];

  for (const item of items) {
    results.push(deriveExecutionSessionSpawnEffects(item));
  }

  return {
    results
  };
}
