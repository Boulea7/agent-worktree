import { consumeExecutionSessionClose } from "./runtime-state-close-consume.js";
import { deriveExecutionSessionCloseConsumer } from "./runtime-state-close-consumer.js";
import { normalizeExecutionSessionCloseRequest } from "./runtime-state-close-request.js";
import type {
  ExecutionSessionCloseApply,
  ExecutionSessionCloseApplyInput
} from "./types.js";

export async function applyExecutionSessionClose(
  input: ExecutionSessionCloseApplyInput
): Promise<ExecutionSessionCloseApply> {
  const request = normalizeExecutionSessionCloseRequest(input.request);
  const consumer = deriveExecutionSessionCloseConsumer({
    request,
    ...(input.resolveSessionLifecycleCapability === undefined
      ? {}
      : {
          resolveSessionLifecycleCapability:
            input.resolveSessionLifecycleCapability
        })
  });
  const consume = await consumeExecutionSessionClose({
    consumer,
    invokeClose: input.invokeClose
  });

  return {
    consumer,
    consume
  };
}
