import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { deriveExecutionSessionSpawnHeadlessInput } from "./runtime-state-spawn-headless-input.js";
import type {
  ExecutionSessionSpawnHeadlessInput,
  ExecutionSessionSpawnHeadlessInputBatch,
  ExecutionSessionSpawnHeadlessInputBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessInputBatch(
  input: ExecutionSessionSpawnHeadlessInputBatchInput
): ExecutionSessionSpawnHeadlessInputBatch {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessInputBatchInput>(
      input,
      "Execution session spawn headless input batch input must be an object."
    );
  const itemsInput = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessInputBatchInput["items"]
  >(
    normalizedInput,
    "items",
    "Execution session spawn headless input batch requires items to be an array."
  );
  const items = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessInputBatchInput["items"][number]
  >(
    itemsInput,
    "Execution session spawn headless input batch requires items to be an array.",
    "Execution session spawn headless input batch requires items entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessInput[] = [];

  for (const item of items) {
    results.push(deriveExecutionSessionSpawnHeadlessInput(item));
  }

  return {
    results
  };
}
