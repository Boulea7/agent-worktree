import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionWaitTarget } from "./runtime-state-wait-target-apply.js";
import type {
  ExecutionSessionWaitTargetApply,
  ExecutionSessionWaitTargetApplyBatch,
  ExecutionSessionWaitTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionWaitTargetBatch(
  input: ExecutionSessionWaitTargetApplyBatchInput
): Promise<ExecutionSessionWaitTargetApplyBatch> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session wait target apply batch input must be an object."
    );
  }

  if (!Array.isArray(input.targets)) {
    throw new ValidationError(
      "Execution session wait target apply batch requires targets to be an array."
    );
  }

  const results: ExecutionSessionWaitTargetApply[] = [];

  for (const target of input.targets) {
    results.push(
      await applyExecutionSessionWaitTarget({
        target,
        invokeWait: input.invokeWait,
        ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
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
