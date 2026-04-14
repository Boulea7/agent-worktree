import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeExecutionSessionCloseRequest } from "./runtime-state-close-request.js";
import {
  deriveExecutionSessionCloseConsumerReadiness
} from "./runtime-state-close-consumer-readiness.js";
import type {
  ExecutionSessionCloseConsumer,
  ExecutionSessionCloseConsumerInput
} from "./types.js";

export function deriveExecutionSessionCloseConsumer(
  input: ExecutionSessionCloseConsumerInput
): ExecutionSessionCloseConsumer {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionCloseConsumerInput>(
    input,
    "Execution session close consumer input must be an object."
  );
  const requestInput = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseConsumerInput["request"]
  >(
    normalizedInput,
    "request",
    "Execution session close consumer requires request to be an object."
  );

  if (
    typeof requestInput !== "object" ||
    requestInput === null ||
    Array.isArray(requestInput)
  ) {
    throw new ValidationError(
      "Execution session close consumer requires request to be an object."
    );
  }

  const request = normalizeExecutionSessionCloseRequest(requestInput);
  const resolveSessionLifecycleCapability =
    readOptionalBatchWrapperProperty<
      ExecutionSessionCloseConsumerInput["resolveSessionLifecycleCapability"]
    >(
      normalizedInput,
      "resolveSessionLifecycleCapability",
      "Execution session close consumer readiness requires resolveSessionLifecycleCapability to be a function when provided."
    );

  return {
    request,
    readiness: deriveExecutionSessionCloseConsumerReadiness({
      request,
      ...(resolveSessionLifecycleCapability === undefined
        ? {}
        : {
            resolveSessionLifecycleCapability
          })
    })
  };
}
