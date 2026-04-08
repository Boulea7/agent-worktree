import { ValidationError } from "../core/errors.js";
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
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session wait consumer input must be an object."
    );
  }

  if (
    typeof input.request !== "object" ||
    input.request === null ||
    Array.isArray(input.request)
  ) {
    throw new ValidationError(
      "Execution session wait consumer requires request to be an object."
    );
  }

  const request = normalizeExecutionSessionWaitRequest(input.request);

  return {
    request,
    readiness: deriveExecutionSessionWaitConsumerReadiness({
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
