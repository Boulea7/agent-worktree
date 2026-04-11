import { ValidationError } from "../core/errors.js";
import { deriveExecutionSessionSpawnHeadlessCloseTarget } from "./runtime-state-spawn-headless-close-target.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import type {
  ExecutionSessionSpawnHeadlessCloseTarget,
  ExecutionSessionSpawnHeadlessCloseTargetBatch,
  ExecutionSessionSpawnHeadlessCloseTargetBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseTargetBatch(
  input: ExecutionSessionSpawnHeadlessCloseTargetBatchInput
): ExecutionSessionSpawnHeadlessCloseTargetBatch {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !("headlessCloseCandidateBatch" in input)
  ) {
    throw new ValidationError(
      "Execution session spawn headless close target batch requires a headlessCloseCandidateBatch wrapper."
    );
  }

  const normalizedBatch = normalizeHeadlessTargetBatchWrapper(
    input.headlessCloseCandidateBatch,
    {
    context: "Execution session spawn headless close target batch",
    wrapperKey: "headlessCloseCandidateBatch"
    }
  );
  const results: ExecutionSessionSpawnHeadlessCloseTarget[] = [];

  for (const headlessCloseCandidate of normalizedBatch.results) {
    results.push(
      deriveExecutionSessionSpawnHeadlessCloseTarget({
        headlessCloseCandidate
      })
    );
  }

  return {
    headlessCloseCandidateBatch: normalizedBatch,
    results
  };
}
