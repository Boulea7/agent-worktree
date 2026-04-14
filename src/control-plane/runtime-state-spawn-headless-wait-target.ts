import { deriveExecutionSessionWaitTarget } from "./runtime-state-wait-target.js";
import { normalizeHeadlessTargetWrapper } from "./runtime-state-headless-wrapper-guards.js";
import type {
  ExecutionSessionSpawnHeadlessWaitTarget,
  ExecutionSessionSpawnHeadlessWaitTargetInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitTarget(
  input: ExecutionSessionSpawnHeadlessWaitTargetInput
): ExecutionSessionSpawnHeadlessWaitTarget {
  const normalizedInput = normalizeHeadlessTargetWrapper(input, {
    context: "Execution session spawn headless wait target",
    nestedKey: "headlessWaitCandidate",
    wrapperKey: "headlessWaitCandidate"
  });
  const target = deriveExecutionSessionWaitTarget({
    candidate: normalizedInput.headlessWaitCandidate.candidate
  });

  return {
    headlessWaitCandidate: normalizedInput.headlessWaitCandidate,
    ...(target === undefined ? {} : { target })
  };
}
