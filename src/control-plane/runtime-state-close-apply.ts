import { consumeExecutionSessionClose } from "./runtime-state-close-consume.js";
import { deriveExecutionSessionCloseConsumer } from "./runtime-state-close-consumer.js";
import {
  normalizeBatchWrapper,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeExecutionSessionCloseRequest } from "./runtime-state-close-request.js";
import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionCloseApply,
  ExecutionSessionCloseApplyInput
} from "./types.js";

export async function applyExecutionSessionClose(
  input: ExecutionSessionCloseApplyInput
): Promise<ExecutionSessionCloseApply> {
  const {
    invokeClose,
    request: requestInput,
    resolveSessionLifecycleCapability
  } = validateCloseApplyInput(input);
  const request = normalizeExecutionSessionCloseRequest(requestInput);
  const consumer = deriveExecutionSessionCloseConsumer({
    request,
    ...(resolveSessionLifecycleCapability === undefined
      ? {}
      : {
          resolveSessionLifecycleCapability
        })
  });
  const consume = await consumeExecutionSessionClose({
    consumer,
    invokeClose
  });

  return {
    consumer,
    consume
  };
}

function validateCloseApplyInput(input: ExecutionSessionCloseApplyInput): {
  invokeClose: ExecutionSessionCloseApplyInput["invokeClose"];
  request: ExecutionSessionCloseApplyInput["request"];
  resolveSessionLifecycleCapability:
    | ExecutionSessionCloseApplyInput["resolveSessionLifecycleCapability"]
    | undefined;
} {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionCloseApplyInput>(
    input,
    "Execution session close apply input must be an object."
  );
  const request = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseApplyInput["request"]
  >(
    normalizedInput,
    "request",
    "Execution session close consumer requires request to be an object."
  );
  const invokeClose = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseApplyInput["invokeClose"]
  >(
    normalizedInput,
    "invokeClose",
    "Execution session close apply requires invokeClose to be a function."
  );

  if (typeof invokeClose !== "function") {
    throw new ValidationError(
      "Execution session close apply requires invokeClose to be a function."
    );
  }

  const resolveSessionLifecycleCapability =
    readOptionalBatchWrapperProperty<
      ExecutionSessionCloseApplyInput["resolveSessionLifecycleCapability"]
    >(
      normalizedInput,
      "resolveSessionLifecycleCapability",
      "Execution session close apply requires resolveSessionLifecycleCapability to be a function when provided."
    );

  if (
    resolveSessionLifecycleCapability !== undefined &&
    typeof resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session close apply requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }

  return {
    invokeClose,
    request,
    resolveSessionLifecycleCapability
  };
}
