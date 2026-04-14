import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { consumeExecutionSessionSpawn } from "./runtime-state-spawn-consume.js";
import { deriveExecutionSessionSpawnEffects } from "./runtime-state-spawn-effects.js";
import { normalizeExecutionSessionSpawnRequest } from "./runtime-state-spawn-request.js";
import type {
  ExecutionSessionSpawnApply,
  ExecutionSessionSpawnApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawn(
  input: ExecutionSessionSpawnApplyInput
): Promise<ExecutionSessionSpawnApply> {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionSpawnApplyInput>(
    input,
    "Execution session spawn apply input must be an object."
  );
  const childAttemptId = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnApplyInput["childAttemptId"]
  >(
    normalizedInput,
    "childAttemptId",
    "Execution session spawn apply requires childAttemptId to be a non-empty string."
  );
  const requestValue = readRequiredBatchWrapperProperty(
    normalizedInput,
    "request",
    "Execution session spawn apply requires request to be an object."
  );
  if (
    typeof requestValue !== "object" ||
    requestValue === null ||
    Array.isArray(requestValue)
  ) {
    throw new ValidationError(
      "Execution session spawn apply requires request to be an object."
    );
  }
  const invokeSpawn = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnApplyInput["invokeSpawn"]
  >(
    normalizedInput,
    "invokeSpawn",
    "Execution session spawn apply requires invokeSpawn to be a function."
  );
  if (typeof invokeSpawn !== "function") {
    throw new ValidationError(
      "Execution session spawn apply requires invokeSpawn to be a function."
    );
  }
  const request = normalizeExecutionSessionSpawnRequest(
    requestValue as ExecutionSessionSpawnApplyInput["request"]
  );
  const effects = deriveExecutionSessionSpawnEffects({
    childAttemptId,
    request
  });
  const consume = await consumeExecutionSessionSpawn({
    request,
    invokeSpawn
  });

  return {
    consume,
    effects
  };
}
