import { ValidationError } from "../core/errors.js";
import { normalizeHeadlessTargetWrapper } from "./runtime-state-headless-wrapper-guards.js";
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
  return normalizeHeadlessTargetWrapper(value, {
    context: "Execution session spawn headless wait target apply",
    nestedKey: "headlessWaitCandidate",
    wrapperKey: "headlessWaitTarget"
  });
}
