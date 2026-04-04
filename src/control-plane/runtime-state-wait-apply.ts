import { consumeExecutionSessionWait } from "./runtime-state-wait-consume.js";
import { deriveExecutionSessionWaitConsumer } from "./runtime-state-wait-consumer.js";
import { normalizeExecutionSessionWaitRequest } from "./runtime-state-wait-request.js";
import type {
  ExecutionSessionWaitApply,
  ExecutionSessionWaitApplyInput
} from "./types.js";

export async function applyExecutionSessionWait(
  input: ExecutionSessionWaitApplyInput
): Promise<ExecutionSessionWaitApply> {
  const request = normalizeExecutionSessionWaitRequest(input.request);
  const consumer = deriveExecutionSessionWaitConsumer({
    request,
    ...(input.resolveSessionLifecycleCapability === undefined
      ? {}
      : {
          resolveSessionLifecycleCapability:
            input.resolveSessionLifecycleCapability
        })
  });
  const consume = await consumeExecutionSessionWait({
    consumer,
    invokeWait: input.invokeWait
  });

  return {
    consumer,
    consume
  };
}
