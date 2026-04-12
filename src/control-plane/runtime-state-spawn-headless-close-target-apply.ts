import { ValidationError } from "../core/errors.js";
import { normalizeHeadlessTargetWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { applyExecutionSessionCloseTarget } from "./runtime-state-close-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessCloseTarget,
  ExecutionSessionSpawnHeadlessCloseTargetApply,
  ExecutionSessionSpawnHeadlessCloseTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessCloseTarget(
  input: ExecutionSessionSpawnHeadlessCloseTargetApplyInput
): Promise<ExecutionSessionSpawnHeadlessCloseTargetApply> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session spawn headless close target apply input must be an object."
    );
  }

  const headlessCloseTarget = normalizeHeadlessCloseTarget(
    input.headlessCloseTarget
  );

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

function normalizeHeadlessCloseTarget(
  value: ExecutionSessionSpawnHeadlessCloseTarget
): ExecutionSessionSpawnHeadlessCloseTarget {
  return normalizeHeadlessTargetWrapper(value, {
    context: "Execution session spawn headless close target apply",
    nestedKey: "headlessCloseCandidate",
    wrapperKey: "headlessCloseTarget"
  });
}
