import { consumeExecutionSessionWait } from "./runtime-state-wait-consume.js";
import { deriveExecutionSessionWaitConsumer } from "./runtime-state-wait-consumer.js";
import {
  normalizeBatchWrapper,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeExecutionSessionWaitRequest } from "./runtime-state-wait-request.js";
import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionWaitApply,
  ExecutionSessionWaitApplyInput
} from "./types.js";

export async function applyExecutionSessionWait(
  input: ExecutionSessionWaitApplyInput
): Promise<ExecutionSessionWaitApply> {
  const {
    invokeWait,
    request: requestInput,
    resolveSessionLifecycleCapability
  } = validateWaitApplyInput(input);
  const request = normalizeExecutionSessionWaitRequest(requestInput);
  const consumer = deriveExecutionSessionWaitConsumer({
    request,
    ...(resolveSessionLifecycleCapability === undefined
      ? {}
      : {
          resolveSessionLifecycleCapability
        })
  });
  const consume = await consumeExecutionSessionWait({
    consumer,
    invokeWait
  });

  return {
    consumer,
    consume
  };
}

function validateWaitApplyInput(input: ExecutionSessionWaitApplyInput): {
  invokeWait: ExecutionSessionWaitApplyInput["invokeWait"];
  request: ExecutionSessionWaitApplyInput["request"];
  resolveSessionLifecycleCapability:
    | ExecutionSessionWaitApplyInput["resolveSessionLifecycleCapability"]
    | undefined;
} {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionWaitApplyInput>(
    input,
    "Execution session wait apply input must be an object."
  );
  const request = readRequiredBatchWrapperProperty<
    ExecutionSessionWaitApplyInput["request"]
  >(
    normalizedInput,
    "request",
    "Execution session wait consumer requires request to be an object."
  );
  const invokeWait = readRequiredBatchWrapperProperty<
    ExecutionSessionWaitApplyInput["invokeWait"]
  >(
    normalizedInput,
    "invokeWait",
    "Execution session wait apply requires invokeWait to be a function."
  );

  if (typeof invokeWait !== "function") {
    throw new ValidationError(
      "Execution session wait apply requires invokeWait to be a function."
    );
  }

  const resolveSessionLifecycleCapability =
    readOptionalBatchWrapperProperty<
      ExecutionSessionWaitApplyInput["resolveSessionLifecycleCapability"]
    >(
      normalizedInput,
      "resolveSessionLifecycleCapability",
      "Execution session wait apply requires resolveSessionLifecycleCapability to be a function when provided."
    );

  if (
    resolveSessionLifecycleCapability !== undefined &&
    typeof resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session wait apply requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }

  return {
    invokeWait,
    request,
    resolveSessionLifecycleCapability
  };
}
