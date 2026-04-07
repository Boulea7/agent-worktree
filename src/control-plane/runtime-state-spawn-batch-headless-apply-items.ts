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

  for (const execution of value) {
    normalizeExecutionSeed(execution);
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
    ...copyExecutionField(execution, "prompt"),
    ...copyExecutionField(execution, "cwd"),
    ...copyExecutionField(execution, "timeoutMs"),
    ...copyExecutionField(execution, "abortSignal")
  } as ExecutionSessionSpawnHeadlessInputSeed;
}

function normalizeExecutionSeed(
  value: ExecutionSessionSpawnHeadlessInputSeed
): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session spawn batch headless apply items executions entries must be objects."
    );
  }
}

function copyExecutionField<
  Key extends keyof ExecutionSessionSpawnHeadlessInputSeed
>(
  execution: ExecutionSessionSpawnHeadlessInputSeed,
  key: Key
): Partial<Pick<ExecutionSessionSpawnHeadlessInputSeed, Key>> {
  if (!Object.prototype.propertyIsEnumerable.call(execution, key)) {
    return {};
  }

  return {
    [key]: execution[key]
  } as Pick<ExecutionSessionSpawnHeadlessInputSeed, Key>;
}
