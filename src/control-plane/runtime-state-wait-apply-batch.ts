import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionWait } from "./runtime-state-wait-apply.js";
import type {
  ExecutionSessionWaitApply,
  ExecutionSessionWaitApplyBatch,
  ExecutionSessionWaitApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionWaitBatch(
  input: ExecutionSessionWaitApplyBatchInput
): Promise<ExecutionSessionWaitApplyBatch> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session wait apply batch input must be an object."
    );
  }

  if (!Array.isArray(input.requests)) {
    throw new ValidationError(
      "Execution session wait apply batch requires requests to be an array."
    );
  }

  const results: ExecutionSessionWaitApply[] = [];

  for (const request of input.requests) {
    results.push(
      await applyExecutionSessionWait({
        request,
        invokeWait: input.invokeWait,
        ...(input.resolveSessionLifecycleCapability === undefined
          ? {}
          : {
              resolveSessionLifecycleCapability:
                input.resolveSessionLifecycleCapability
            })
      })
    );
  }

  return {
    results
  };
}
