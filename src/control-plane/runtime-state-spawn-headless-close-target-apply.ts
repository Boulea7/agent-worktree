import { applyExecutionSessionCloseTarget } from "./runtime-state-close-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessCloseTargetApply,
  ExecutionSessionSpawnHeadlessCloseTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessCloseTarget(
  input: ExecutionSessionSpawnHeadlessCloseTargetApplyInput
): Promise<ExecutionSessionSpawnHeadlessCloseTargetApply> {
  const { headlessCloseTarget } = input;

  if (headlessCloseTarget.target === undefined) {
    return {
      headlessCloseTarget
    };
  }

  const apply = await applyExecutionSessionCloseTarget({
    target: headlessCloseTarget.target,
    invokeClose: input.invokeClose,
    ...(input.resolveSessionLifecycleCapability === undefined
      ? {}
      : {
          resolveSessionLifecycleCapability:
            input.resolveSessionLifecycleCapability
        })
  });

  return {
    headlessCloseTarget,
    apply
  };
}
