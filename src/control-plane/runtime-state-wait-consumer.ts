import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeExecutionSessionWaitRequest } from "./runtime-state-wait-request.js";
import {
  deriveExecutionSessionWaitConsumerReadiness
} from "./runtime-state-wait-consumer-readiness.js";
import type {
  ExecutionSessionWaitConsumer,
  ExecutionSessionWaitConsumerInput
} from "./types.js";

export function deriveExecutionSessionWaitConsumer(
  input: ExecutionSessionWaitConsumerInput
): ExecutionSessionWaitConsumer {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionWaitConsumerInput>(
    input,
    "Execution session wait consumer input must be an object."
  );
  const requestInput = readRequiredBatchWrapperProperty<
    ExecutionSessionWaitConsumerInput["request"]
  >(
    normalizedInput,
    "request",
    "Execution session wait consumer requires request to be an object."
  );

  if (
    typeof requestInput !== "object" ||
    requestInput === null ||
    Array.isArray(requestInput)
  ) {
    throw new ValidationError(
      "Execution session wait consumer requires request to be an object."
    );
  }

  const request = normalizeExecutionSessionWaitRequest(requestInput);
  const resolveSessionLifecycleCapability =
    readOptionalBatchWrapperProperty<
      ExecutionSessionWaitConsumerInput["resolveSessionLifecycleCapability"]
    >(
      normalizedInput,
      "resolveSessionLifecycleCapability",
      "Execution session wait consumer readiness requires resolveSessionLifecycleCapability to be a function when provided."
    );

  return {
    request,
    readiness: deriveExecutionSessionWaitConsumerReadiness({
      request,
      ...(resolveSessionLifecycleCapability === undefined
        ? {}
        : {
            resolveSessionLifecycleCapability
          })
    })
  };
}
