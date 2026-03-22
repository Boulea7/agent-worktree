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
  return {
    request: input.request,
    readiness: deriveExecutionSessionCloseConsumerReadiness({
      request: input.request,
      ...(input.resolveSessionLifecycleCapability === undefined
        ? {}
        : {
            resolveSessionLifecycleCapability:
              input.resolveSessionLifecycleCapability
          })
    })
  };
}
