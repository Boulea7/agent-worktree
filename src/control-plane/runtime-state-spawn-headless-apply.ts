import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { applyExecutionSessionSpawn } from "./runtime-state-spawn-apply.js";
import { deriveExecutionSessionSpawnEffects } from "./runtime-state-spawn-effects.js";
import { deriveExecutionSessionSpawnHeadlessInput } from "./runtime-state-spawn-headless-input.js";
import { normalizeExecutionSessionSpawnRequest } from "./runtime-state-spawn-request.js";
import type {
  ExecutionSessionSpawnHeadlessApply,
  ExecutionSessionSpawnHeadlessApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessInput(
  input: ExecutionSessionSpawnHeadlessApplyInput
): Promise<ExecutionSessionSpawnHeadlessApply> {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessApplyInput>(
      input,
      "Execution session spawn headless apply input must be an object."
    );
  const childAttemptId = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessApplyInput["childAttemptId"]
  >(
    normalizedInput,
    "childAttemptId",
    "Execution session spawn headless apply requires childAttemptId to be a non-empty string."
  );
  const requestValue = readRequiredBatchWrapperProperty(
    normalizedInput,
    "request",
    "Execution session spawn headless apply requires request to be an object."
  );
  if (
    typeof requestValue !== "object" ||
    requestValue === null ||
    Array.isArray(requestValue)
  ) {
    throw new ValidationError(
      "Execution session spawn headless apply requires request to be an object."
    );
  }
  if (!Object.prototype.hasOwnProperty.call(normalizedInput, "execution")) {
    throw new ValidationError(
      "Execution session spawn headless apply requires execution to be an object."
    );
  }
  const invokeSpawn = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessApplyInput["invokeSpawn"]
  >(
    normalizedInput,
    "invokeSpawn",
    "Execution session spawn headless apply requires invokeSpawn to be a function."
  );
  if (typeof invokeSpawn !== "function") {
    throw new ValidationError(
      "Execution session spawn headless apply requires invokeSpawn to be a function."
    );
  }
  const request = normalizeExecutionSessionSpawnRequest(
    requestValue as ExecutionSessionSpawnHeadlessApplyInput["request"]
  );
  const preflightEffects = deriveExecutionSessionSpawnEffects({
    childAttemptId,
    request
  });
  const headlessInput = deriveExecutionSessionSpawnHeadlessInput({
    effects: preflightEffects,
    get execution() {
      return normalizedInput.execution;
    }
  });
  const apply = await applyExecutionSessionSpawn({
    childAttemptId,
    request,
    invokeSpawn
  });

  return {
    apply,
    headlessInput
  };
}
