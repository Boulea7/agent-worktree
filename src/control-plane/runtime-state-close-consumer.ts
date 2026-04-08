import { ValidationError } from "../core/errors.js";
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
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session close consumer input must be an object."
    );
  }

  if (
    typeof input.request !== "object" ||
    input.request === null ||
    Array.isArray(input.request)
  ) {
    throw new ValidationError(
      "Execution session close consumer requires request to be an object."
    );
  }

  const request = normalizeExecutionSessionCloseRequest(input.request);

  return {
    request,
    readiness: deriveExecutionSessionCloseConsumerReadiness({
      request,
      ...(input.resolveSessionLifecycleCapability === undefined
        ? {}
        : {
            resolveSessionLifecycleCapability:
              input.resolveSessionLifecycleCapability
          })
    })
  };
}
