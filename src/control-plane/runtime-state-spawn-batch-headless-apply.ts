import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { applyExecutionSessionSpawnHeadlessInputBatch } from "./runtime-state-spawn-headless-apply-batch.js";
import type {
  ExecutionSessionSpawnBatchHeadlessApply,
  ExecutionSessionSpawnBatchHeadlessApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnBatchHeadlessApply(
  input: ExecutionSessionSpawnBatchHeadlessApplyInput
): Promise<ExecutionSessionSpawnBatchHeadlessApply> {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnBatchHeadlessApplyInput>(
      input,
      "Execution session spawn batch headless-apply input must be an object."
    );
  const headlessApplyItems = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnBatchHeadlessApplyInput["headlessApplyItems"]
  >(
    normalizedInput,
    "headlessApplyItems",
    "Execution session spawn batch headless-apply requires headlessApplyItems to be an object."
  );
  if (
    typeof headlessApplyItems !== "object" ||
    headlessApplyItems === null ||
    Array.isArray(headlessApplyItems)
  ) {
    throw new ValidationError(
      "Execution session spawn batch headless-apply requires headlessApplyItems to be an object."
    );
  }
  const invokeSpawn = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnBatchHeadlessApplyInput["invokeSpawn"]
  >(
    normalizedInput,
    "invokeSpawn",
    "Execution session spawn batch headless-apply requires invokeSpawn to be a function."
  );
  if (typeof invokeSpawn !== "function") {
    throw new ValidationError(
      "Execution session spawn batch headless-apply requires invokeSpawn to be a function."
    );
  }

  if (headlessApplyItems.items === undefined) {
    return {
      headlessApplyItems
    };
  }

  const apply = await applyExecutionSessionSpawnHeadlessInputBatch({
    items: headlessApplyItems.items,
    invokeSpawn
  });

  return {
    headlessApplyItems,
    apply
  };
}
