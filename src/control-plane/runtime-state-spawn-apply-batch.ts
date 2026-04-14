import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { applyExecutionSessionSpawn } from "./runtime-state-spawn-apply.js";
import type {
  ExecutionSessionSpawnApply,
  ExecutionSessionSpawnApplyBatch,
  ExecutionSessionSpawnApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionSpawnBatch(
  input: ExecutionSessionSpawnApplyBatchInput
): Promise<ExecutionSessionSpawnApplyBatch> {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionSpawnApplyBatchInput>(
    input,
    "Execution session spawn apply batch input must be an object."
  );
  const itemsValue = readRequiredBatchWrapperProperty(
    normalizedInput,
    "items",
    "Execution session spawn apply batch requires items to be an array."
  );
  const items = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnApplyBatchInput["items"][number]
  >(
    itemsValue,
    "Execution session spawn apply batch requires items to be an array.",
    "Execution session spawn apply batch requires items entries to be objects."
  );
  const invokeSpawn = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnApplyBatchInput["invokeSpawn"]
  >(
    normalizedInput,
    "invokeSpawn",
    "Execution session spawn apply batch requires invokeSpawn to be a function."
  );
  if (typeof invokeSpawn !== "function") {
    throw new ValidationError(
      "Execution session spawn apply batch requires invokeSpawn to be a function."
    );
  }
  const results: ExecutionSessionSpawnApply[] = [];

  for (const item of items) {
    results.push(
      await applyExecutionSessionSpawn({
        childAttemptId: item.childAttemptId,
        request: item.request,
        invokeSpawn
      })
    );
  }

  return {
    results
  };
}
