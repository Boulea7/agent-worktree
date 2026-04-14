import { ValidationError } from "../core/errors.js";
import { executeExecutionSessionSpawnHeadless } from "./runtime-state-spawn-headless-execute.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import type {
  ExecutionSessionSpawnHeadlessExecute,
  ExecutionSessionSpawnHeadlessExecuteBatch,
  ExecutionSessionSpawnHeadlessExecuteBatchInput
} from "./types.js";

export async function executeExecutionSessionSpawnHeadlessBatch(
  input: ExecutionSessionSpawnHeadlessExecuteBatchInput
): Promise<ExecutionSessionSpawnHeadlessExecuteBatch> {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessExecuteBatchInput>(
      input,
      "Execution session spawn headless execute batch input must be an object."
    );
  const items = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessExecuteBatchInput["items"]
  >(
    normalizedInput,
    "items",
    "Execution session spawn headless execute batch requires items to be an array."
  );
  if (!Array.isArray(items)) {
    throw new ValidationError(
      "Execution session spawn headless execute batch requires items to be an array."
    );
  }
  const invokeSpawn = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessExecuteBatchInput["invokeSpawn"]
  >(
    normalizedInput,
    "invokeSpawn",
    "Execution session spawn headless execute batch requires invokeSpawn to be a function."
  );
  if (typeof invokeSpawn !== "function") {
    throw new ValidationError(
      "Execution session spawn headless execute batch requires invokeSpawn to be a function."
    );
  }
  const executeHeadless = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessExecuteBatchInput["executeHeadless"]
  >(
    normalizedInput,
    "executeHeadless",
    "Execution session spawn headless execute batch requires executeHeadless to be a function."
  );
  if (typeof executeHeadless !== "function") {
    throw new ValidationError(
      "Execution session spawn headless execute batch requires executeHeadless to be a function."
    );
  }

  validateBatchItems(items);

  const results: ExecutionSessionSpawnHeadlessExecute[] = [];

  for (const item of items) {
    results.push(
      await executeExecutionSessionSpawnHeadless({
        childAttemptId: item.childAttemptId,
        request: item.request,
        get execution() {
          return item.execution;
        },
        invokeSpawn,
        executeHeadless
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
        "Execution session spawn headless execute batch requires items entries to be objects."
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
