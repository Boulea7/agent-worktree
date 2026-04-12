import { consumeExecutionSessionWait } from "./runtime-state-wait-consume.js";
import { deriveExecutionSessionWaitConsumer } from "./runtime-state-wait-consumer.js";
import { normalizeExecutionSessionWaitRequest } from "./runtime-state-wait-request.js";
import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionWaitApply,
  ExecutionSessionWaitApplyInput
} from "./types.js";

export async function applyExecutionSessionWait(
  input: ExecutionSessionWaitApplyInput
): Promise<ExecutionSessionWaitApply> {
  validateWaitApplyInput(input);
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

function validateWaitApplyInput(input: ExecutionSessionWaitApplyInput): void {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session wait apply input must be an object."
    );
  }

  if (typeof input.invokeWait !== "function") {
    throw new ValidationError(
      "Execution session wait apply requires invokeWait to be a function."
    );
  }

  if (
    input.resolveSessionLifecycleCapability !== undefined &&
    typeof input.resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session wait apply requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }
}
