import { applyExecutionSessionWaitTarget } from "./runtime-state-wait-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessWaitTargetApply,
  ExecutionSessionSpawnHeadlessWaitTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessWaitTarget(
  input: ExecutionSessionSpawnHeadlessWaitTargetApplyInput
): Promise<ExecutionSessionSpawnHeadlessWaitTargetApply> {
  const { headlessWaitTarget } = input;

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
