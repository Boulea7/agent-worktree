import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionSpawnHeadlessInput } from "./runtime-state-spawn-headless-apply.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import type {
  ExecutionSessionSpawnHeadlessApply,
  ExecutionSessionSpawnHeadlessApplyBatch,
  ExecutionSessionSpawnHeadlessApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessInputBatch(
  input: ExecutionSessionSpawnHeadlessApplyBatchInput
): Promise<ExecutionSessionSpawnHeadlessApplyBatch> {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessApplyBatchInput>(
      input,
      "Execution session spawn headless apply batch input must be an object."
    );
  const items = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessApplyBatchInput["items"]
  >(
    normalizedInput,
    "items",
    "Execution session spawn headless apply batch requires items to be an array."
  );
  if (!Array.isArray(items)) {
    throw new ValidationError(
      "Execution session spawn headless apply batch requires items to be an array."
    );
  }
  const invokeSpawn = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessApplyBatchInput["invokeSpawn"]
  >(
    normalizedInput,
    "invokeSpawn",
    "Execution session spawn headless apply batch requires invokeSpawn to be a function."
  );
  if (typeof invokeSpawn !== "function") {
    throw new ValidationError(
      "Execution session spawn headless apply batch requires invokeSpawn to be a function."
    );
  }

  validateBatchItems(items);

  const results: ExecutionSessionSpawnHeadlessApply[] = [];

  for (const item of items) {
    results.push(
      await applyExecutionSessionSpawnHeadlessInput({
        childAttemptId: item.childAttemptId,
        request: item.request,
        get execution() {
          return item.execution;
        },
        invokeSpawn
      })
    );
  }

  return {
    results
  };
}

function validateBatchItems(items: readonly unknown[]): void {
  for (let index = 0; index < items.length; index += 1) {
    if (!hasOwnIndex(items, index) || !isRecord(items[index])) {
      throw new ValidationError(
        "Execution session spawn headless apply batch requires items entries to be objects."
      );
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}
