import { deriveExecutionSessionCloseTarget } from "./runtime-state-close-target.js";
import { normalizeHeadlessTargetWrapper } from "./runtime-state-headless-wrapper-guards.js";
import type {
  ExecutionSessionSpawnHeadlessCloseTarget,
  ExecutionSessionSpawnHeadlessCloseTargetInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseTarget(
  input: ExecutionSessionSpawnHeadlessCloseTargetInput
): ExecutionSessionSpawnHeadlessCloseTarget {
  const normalizedInput = normalizeHeadlessTargetWrapper(input, {
    context: "Execution session spawn headless close target",
    nestedKey: "headlessCloseCandidate",
    wrapperKey: "headlessCloseCandidate"
  });
  const target = deriveExecutionSessionCloseTarget({
    candidate: normalizedInput.headlessCloseCandidate.candidate
  });

  return {
    headlessCloseCandidate: normalizedInput.headlessCloseCandidate,
    ...(target === undefined ? {} : { target })
  };
}
