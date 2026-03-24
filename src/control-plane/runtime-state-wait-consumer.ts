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
  return {
    request: input.request,
    readiness: deriveExecutionSessionWaitConsumerReadiness({
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
