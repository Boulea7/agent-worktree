import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { applyExecutionSessionSpawnBatch } from "./runtime-state-spawn-apply-batch.js";
import type {
  ExecutionSessionSpawnBatchItemsApply,
  ExecutionSessionSpawnBatchItemsApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnBatchItems(
  input: ExecutionSessionSpawnBatchItemsApplyInput
): Promise<ExecutionSessionSpawnBatchItemsApply> {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnBatchItemsApplyInput>(
      input,
      "Execution session spawn batch-items apply input must be an object."
    );
  const batchItems = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnBatchItemsApplyInput["batchItems"]
  >(
    normalizedInput,
    "batchItems",
    "Execution session spawn batch-items apply requires batchItems to be an object."
  );
  if (
    typeof batchItems !== "object" ||
    batchItems === null ||
    Array.isArray(batchItems)
  ) {
    throw new ValidationError(
      "Execution session spawn batch-items apply requires batchItems to be an object."
    );
  }
  const invokeSpawn = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnBatchItemsApplyInput["invokeSpawn"]
  >(
    normalizedInput,
    "invokeSpawn",
    "Execution session spawn batch-items apply requires invokeSpawn to be a function."
  );
  if (typeof invokeSpawn !== "function") {
    throw new ValidationError(
      "Execution session spawn batch-items apply requires invokeSpawn to be a function."
    );
  }

  const hasOwnItems = Object.prototype.hasOwnProperty.call(batchItems, "items");

  if (!hasOwnItems || batchItems.items === undefined) {
    return {
      batchItems
    };
  }

  const apply = await applyExecutionSessionSpawnBatch({
    items: batchItems.items,
    invokeSpawn
  });

  return {
    batchItems,
    apply
  };
}
