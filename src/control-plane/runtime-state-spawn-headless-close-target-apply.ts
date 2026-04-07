import { ValidationError } from "../core/errors.js";
import { applyExecutionSessionCloseTarget } from "./runtime-state-close-target-apply.js";
import type {
  ExecutionSessionSpawnHeadlessCloseTarget,
  ExecutionSessionSpawnHeadlessCloseTargetApply,
  ExecutionSessionSpawnHeadlessCloseTargetApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessCloseTarget(
  input: ExecutionSessionSpawnHeadlessCloseTargetApplyInput
): Promise<ExecutionSessionSpawnHeadlessCloseTargetApply> {
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
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("headlessCloseCandidate" in value)
  ) {
    throw new ValidationError(
      "Execution session spawn headless close target apply requires a headlessCloseTarget wrapper."
    );
  }

  if (
    typeof value.headlessCloseCandidate !== "object" ||
    value.headlessCloseCandidate === null ||
    Array.isArray(value.headlessCloseCandidate)
  ) {
    throw new ValidationError(
      "Execution session spawn headless close target apply requires headlessCloseTarget.headlessCloseCandidate to be an object."
    );
  }

  return value;
}
