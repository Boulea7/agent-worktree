import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapperObjectItems
} from "./runtime-state-batch-wrapper-guards.js";
import { deriveExecutionSessionSpawnHeadlessWaitTarget } from "./runtime-state-spawn-headless-wait-target.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import type {
  ExecutionSessionSpawnHeadlessWaitTarget,
  ExecutionSessionSpawnHeadlessWaitTargetBatch,
  ExecutionSessionSpawnHeadlessWaitTargetBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitTargetBatch(
  input: ExecutionSessionSpawnHeadlessWaitTargetBatchInput
): ExecutionSessionSpawnHeadlessWaitTargetBatch {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !("headlessWaitCandidateBatch" in input)
  ) {
    throw new ValidationError(
      "Execution session spawn headless wait target batch requires a headlessWaitCandidateBatch wrapper."
    );
  }

  const normalizedBatch = normalizeHeadlessTargetBatchWrapper(
    input.headlessWaitCandidateBatch,
    {
      context: "Execution session spawn headless wait target batch",
      wrapperKey: "headlessWaitCandidateBatch",
      companionKey: "headlessContextBatch"
    }
  );
  const headlessWaitCandidates = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessWaitTargetBatch["headlessWaitCandidateBatch"]["results"][number]
  >(
    normalizedBatch.results,
    "Execution session spawn headless wait target batch requires headlessWaitCandidateBatch.results to be an array.",
    "Execution session spawn headless wait target batch requires headlessWaitCandidateBatch.results entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessWaitTarget[] = [];

  for (const headlessWaitCandidate of headlessWaitCandidates) {
    results.push(
      deriveExecutionSessionSpawnHeadlessWaitTarget({
        headlessWaitCandidate
      })
    );
  }

  return {
    headlessWaitCandidateBatch: normalizedBatch,
    results
  };
}
