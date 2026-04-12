import { ValidationError } from "../core/errors.js";
import { executeExecutionSessionSpawnHeadless } from "./runtime-state-spawn-headless-execute.js";
import type {
  ExecutionSessionSpawnHeadlessExecute,
  ExecutionSessionSpawnHeadlessExecuteBatch,
  ExecutionSessionSpawnHeadlessExecuteBatchInput
} from "./types.js";

export async function executeExecutionSessionSpawnHeadlessBatch(
  input: ExecutionSessionSpawnHeadlessExecuteBatchInput
): Promise<ExecutionSessionSpawnHeadlessExecuteBatch> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session spawn headless execute batch input must be an object."
    );
  }

  if (!Array.isArray(input.items)) {
    throw new ValidationError(
      "Execution session spawn headless execute batch requires items to be an array."
    );
  }

  if (typeof input.invokeSpawn !== "function") {
    throw new ValidationError(
      "Execution session spawn headless execute batch requires invokeSpawn to be a function."
    );
  }

  if (typeof input.executeHeadless !== "function") {
    throw new ValidationError(
      "Execution session spawn headless execute batch requires executeHeadless to be a function."
    );
  }

  validateBatchItems(input.items);

  const results: ExecutionSessionSpawnHeadlessExecute[] = [];

  for (const item of input.items) {
    results.push(
      await executeExecutionSessionSpawnHeadless({
        childAttemptId: item.childAttemptId,
        request: item.request,
        get execution() {
          return item.execution;
        },
        invokeSpawn: input.invokeSpawn,
        executeHeadless: input.executeHeadless
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
