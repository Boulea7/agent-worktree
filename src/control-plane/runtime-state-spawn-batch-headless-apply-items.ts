import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionSpawnBatchHeadlessApplyItems,
  ExecutionSessionSpawnBatchHeadlessApplyItemsInput,
  ExecutionSessionSpawnHeadlessApplyItem,
  ExecutionSessionSpawnHeadlessInputSeed
} from "./types.js";

export function deriveExecutionSessionSpawnBatchHeadlessApplyItems(
  input: ExecutionSessionSpawnBatchHeadlessApplyItemsInput
): ExecutionSessionSpawnBatchHeadlessApplyItems {
  const { batchItems } = input;

  if (batchItems.items === undefined) {
    return {
      batchItems
    };
  }

  const executions = normalizeExecutions(input.executions, batchItems.items.length);
  const items: ExecutionSessionSpawnHeadlessApplyItem[] = batchItems.items.map(
    (item, index) => ({
      childAttemptId: item.childAttemptId,
      request: cloneRequest(item.request),
      execution: cloneExecution(executions[index]!)
    })
  );

  return {
    batchItems,
    items
  };
}

function normalizeExecutions(
  value: readonly ExecutionSessionSpawnHeadlessInputSeed[],
  expectedLength: number
): readonly ExecutionSessionSpawnHeadlessInputSeed[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "Execution session spawn batch headless apply items executions must be an array."
    );
  }

  if (value.length !== expectedLength) {
    throw new ValidationError(
      "Execution session spawn batch headless apply items executions length must match batchItems.items length."
    );
  }

  return value;
}

function cloneRequest(
  request: ExecutionSessionSpawnHeadlessApplyItem["request"]
): ExecutionSessionSpawnHeadlessApplyItem["request"] {
  return {
    parentAttemptId: request.parentAttemptId,
    parentRuntime: request.parentRuntime,
    parentSessionId: request.parentSessionId,
    sourceKind: request.sourceKind,
    ...(request.inheritedGuardrails === undefined
      ? {}
      : {
          inheritedGuardrails: {
            ...request.inheritedGuardrails
          }
        })
  };
}

function cloneExecution(
  execution: ExecutionSessionSpawnHeadlessInputSeed
): ExecutionSessionSpawnHeadlessInputSeed {
  return {
    ...execution
  };
}
