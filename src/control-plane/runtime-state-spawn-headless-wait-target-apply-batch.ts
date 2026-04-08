import { ValidationError } from "../core/errors.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { applyExecutionSessionSpawnHeadlessWaitTarget } from "./runtime-state-spawn-headless-wait-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessWaitTargetApply,
  ExecutionSessionSpawnHeadlessWaitTargetApplyBatch,
  ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessWaitTargetBatch(
  input: ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput
): Promise<ExecutionSessionSpawnHeadlessWaitTargetApplyBatch> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session spawn headless wait target apply batch input must be an object."
    );
  }

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
  return normalizeHeadlessTargetBatchWrapper(value, {
    context: "Execution session spawn headless wait target apply batch",
    wrapperKey: "headlessWaitTargetBatch"
  });
}
