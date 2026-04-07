import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionCloseTarget } from "./runtime-state-close-target-apply.js";
import type {
  ExecutionSessionCloseTargetApply,
  ExecutionSessionCloseTargetApplyBatch,
  ExecutionSessionCloseTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionCloseTargetBatch(
  input: ExecutionSessionCloseTargetApplyBatchInput
): Promise<ExecutionSessionCloseTargetApplyBatch> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session close target apply batch input must be an object."
    );
  }

  if (!Array.isArray(input.targets)) {
    throw new ValidationError(
      "Execution session close target apply batch requires targets to be an array."
    );
  }

  const results: ExecutionSessionCloseTargetApply[] = [];

  for (const target of input.targets) {
    results.push(
      await applyExecutionSessionCloseTarget({
        target,
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
