import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionWaitTarget } from "./runtime-state-wait-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessWaitTargetApply,
  ExecutionSessionSpawnHeadlessWaitTarget,
  ExecutionSessionSpawnHeadlessWaitTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessWaitTarget(
  input: ExecutionSessionSpawnHeadlessWaitTargetApplyInput
): Promise<ExecutionSessionSpawnHeadlessWaitTargetApply> {
  const headlessWaitTarget = normalizeHeadlessWaitTarget(input.headlessWaitTarget);

  if (headlessWaitTarget.target === undefined) {
    return {
      headlessWaitTarget
    };
  }

  const apply = await applyExecutionSessionWaitTarget({
    target: headlessWaitTarget.target,
    invokeWait: input.invokeWait,
    ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
    ...(input.resolveSessionLifecycleCapability === undefined
      ? {}
      : {
          resolveSessionLifecycleCapability:
            input.resolveSessionLifecycleCapability
        })
  });

  return {
    headlessWaitTarget,
    apply
  };
}

function normalizeHeadlessWaitTarget(
  value: ExecutionSessionSpawnHeadlessWaitTarget
): ExecutionSessionSpawnHeadlessWaitTarget {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("headlessWaitCandidate" in value)
  ) {
    throw new ValidationError(
      "Execution session spawn headless wait target apply requires a headlessWaitTarget wrapper."
    );
  }

  if (
    typeof value.headlessWaitCandidate !== "object" ||
    value.headlessWaitCandidate === null ||
    Array.isArray(value.headlessWaitCandidate)
  ) {
    throw new ValidationError(
      "Execution session spawn headless wait target apply requires headlessWaitTarget.headlessWaitCandidate to be an object."
    );
  }

  return value;
}
