import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import type {
  ExecutionSessionSpawnConsume,
  ExecutionSessionSpawnConsumeInput
} from "./types.js";
import { normalizeExecutionSessionSpawnRequest } from "./runtime-state-spawn-request.js";

export async function consumeExecutionSessionSpawn(
  input: ExecutionSessionSpawnConsumeInput
): Promise<ExecutionSessionSpawnConsume> {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionSpawnConsumeInput>(
    input,
    "Execution session spawn consume input must be an object."
  );
  const requestValue = readRequiredBatchWrapperProperty(
    normalizedInput,
    "request",
    "Execution session spawn consume requires request to be an object."
  );
  if (
    typeof requestValue !== "object" ||
    requestValue === null ||
    Array.isArray(requestValue)
  ) {
    throw new ValidationError(
      "Execution session spawn consume requires request to be an object."
    );
  }
  const invokeSpawn = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnConsumeInput["invokeSpawn"]
  >(
    normalizedInput,
    "invokeSpawn",
    "Execution session spawn consume requires invokeSpawn to be a function."
  );
  if (typeof invokeSpawn !== "function") {
    throw new ValidationError(
      "Execution session spawn consume requires invokeSpawn to be a function."
    );
  }
  const request = normalizeExecutionSessionSpawnRequest(
    requestValue as ExecutionSessionSpawnConsumeInput["request"]
  );

  await invokeSpawn(request);

  return {
    request,
    invoked: true
  };
}
