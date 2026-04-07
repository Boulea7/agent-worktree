import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionSpawnHeadlessWaitTarget } from "./runtime-state-spawn-headless-wait-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessWaitTargetApply,
  ExecutionSessionSpawnHeadlessWaitTargetApplyBatch,
  ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessWaitTargetBatch(
  input: ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput
): Promise<ExecutionSessionSpawnHeadlessWaitTargetApplyBatch> {
  const headlessWaitTargetBatch = normalizeHeadlessWaitTargetBatch(
    input.headlessWaitTargetBatch
  );
  const results: ExecutionSessionSpawnHeadlessWaitTargetApply[] = [];

  for (const headlessWaitTarget of headlessWaitTargetBatch.results) {
    results.push(
      await applyExecutionSessionSpawnHeadlessWaitTarget({
        headlessWaitTarget,
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
    headlessWaitTargetBatch,
    results
  };
}

function normalizeHeadlessWaitTargetBatch(
  value: ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput["headlessWaitTargetBatch"]
) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session spawn headless wait target apply batch requires a headlessWaitTargetBatch wrapper."
    );
  }

  if (!Array.isArray(value.results)) {
    throw new ValidationError(
      "Execution session spawn headless wait target apply batch requires headlessWaitTargetBatch.results to be an array."
    );
  }

  return value;
}
