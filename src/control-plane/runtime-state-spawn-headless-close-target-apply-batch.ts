import { ValidationError } from "../core/errors.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { applyExecutionSessionSpawnHeadlessCloseTarget } from "./runtime-state-spawn-headless-close-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessCloseTargetApply,
  ExecutionSessionSpawnHeadlessCloseTargetApplyBatch,
  ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessCloseTargetBatch(
  input: ExecutionSessionSpawnHeadlessCloseTargetApplyBatchInput
): Promise<ExecutionSessionSpawnHeadlessCloseTargetApplyBatch> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session spawn headless close target apply batch input must be an object."
    );
  }

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
  return normalizeHeadlessTargetBatchWrapper(value, {
    context: "Execution session spawn headless close target apply batch",
    wrapperKey: "headlessCloseTargetBatch"
  });
}
