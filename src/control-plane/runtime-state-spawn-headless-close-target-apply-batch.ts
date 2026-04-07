import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionSpawnHeadlessCloseTarget } from "./runtime-state-spawn-headless-close-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessCloseTargetApply,
  ExecutionSessionSpawnHeadlessCloseTargetApplyBatch,
  ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessCloseTargetBatch(
  input: ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput
): Promise<ExecutionSessionSpawnHeadlessCloseTargetApplyBatch> {
  const headlessCloseTargetBatch = normalizeHeadlessCloseTargetBatch(
    input.headlessCloseTargetBatch
  );
  const results: ExecutionSessionSpawnHeadlessCloseTargetApply[] = [];

  for (const headlessCloseTarget of headlessCloseTargetBatch.results) {
    results.push(
      await applyExecutionSessionSpawnHeadlessCloseTarget({
        headlessCloseTarget,
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
    headlessCloseTargetBatch,
    results
  };
}

function normalizeHeadlessCloseTargetBatch(
  value: ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput["headlessCloseTargetBatch"]
) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session spawn headless close target apply batch requires a headlessCloseTargetBatch wrapper."
    );
  }

  if (!Array.isArray(value.results)) {
    throw new ValidationError(
      "Execution session spawn headless close target apply batch requires headlessCloseTargetBatch.results to be an array."
    );
  }

  return value;
}
