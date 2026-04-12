import { consumeExecutionSessionClose } from "./runtime-state-close-consume.js";
import { deriveExecutionSessionCloseConsumer } from "./runtime-state-close-consumer.js";
import { normalizeExecutionSessionCloseRequest } from "./runtime-state-close-request.js";
import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionCloseApply,
  ExecutionSessionCloseApplyInput
} from "./types.js";

export async function applyExecutionSessionClose(
  input: ExecutionSessionCloseApplyInput
): Promise<ExecutionSessionCloseApply> {
  validateCloseApplyInput(input);
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

function validateCloseApplyInput(input: ExecutionSessionCloseApplyInput): void {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session close apply input must be an object."
    );
  }

  if (typeof input.invokeClose !== "function") {
    throw new ValidationError(
      "Execution session close apply requires invokeClose to be a function."
    );
  }

  if (
    input.resolveSessionLifecycleCapability !== undefined &&
    typeof input.resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session close apply requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }
}
