import { deriveExecutionSessionCloseTarget } from "./runtime-state-close-target.js";
import type {
  ExecutionSessionSpawnHeadlessCloseTarget,
  ExecutionSessionSpawnHeadlessCloseTargetInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseTarget(
  input: ExecutionSessionSpawnHeadlessCloseTargetInput
): ExecutionSessionSpawnHeadlessCloseTarget {
  const target = deriveExecutionSessionCloseTarget({
    candidate: input.headlessCloseCandidate.candidate
  });

  return {
    headlessCloseCandidate: input.headlessCloseCandidate,
    ...(target === undefined ? {} : { target })
  };
}
