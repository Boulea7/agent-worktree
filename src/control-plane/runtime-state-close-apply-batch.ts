import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionClose } from "./runtime-state-close-apply.js";
import type {
  ExecutionSessionCloseApply,
  ExecutionSessionCloseApplyBatch,
  ExecutionSessionCloseApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionCloseBatch(
  input: ExecutionSessionCloseApplyBatchInput
): Promise<ExecutionSessionCloseApplyBatch> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session close apply batch input must be an object."
    );
  }

  if (!Array.isArray(input.requests)) {
    throw new ValidationError(
      "Execution session close apply batch requires requests to be an array."
    );
  }

  const results: ExecutionSessionCloseApply[] = [];

  for (const request of input.requests) {
    results.push(
      await applyExecutionSessionClose({
        request,
        invokeClose: input.invokeClose,
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
