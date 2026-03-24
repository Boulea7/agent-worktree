import { deriveExecutionSessionWaitTarget } from "./runtime-state-wait-target.js";
import type {
  ExecutionSessionSpawnHeadlessWaitTarget,
  ExecutionSessionSpawnHeadlessWaitTargetInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitTarget(
  input: ExecutionSessionSpawnHeadlessWaitTargetInput
): ExecutionSessionSpawnHeadlessWaitTarget {
  const target = deriveExecutionSessionWaitTarget({
    candidate: input.headlessWaitCandidate.candidate
  });

  return {
    headlessWaitCandidate: input.headlessWaitCandidate,
    ...(target === undefined ? {} : { target })
  };
}
