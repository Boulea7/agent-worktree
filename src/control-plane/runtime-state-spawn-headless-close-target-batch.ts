import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  normalizeBatchWrapperObjectItems,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
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
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessCloseTargetBatchInput>(
      input,
      "Execution session spawn headless close target batch requires a headlessCloseCandidateBatch wrapper."
    );
  const headlessCloseCandidateBatch = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessCloseTargetBatchInput["headlessCloseCandidateBatch"]
  >(
    normalizedInput,
    "headlessCloseCandidateBatch",
    "Execution session spawn headless close target batch requires a headlessCloseCandidateBatch wrapper."
  );

  const normalizedBatch = normalizeHeadlessTargetBatchWrapper(
    headlessCloseCandidateBatch,
    {
      context: "Execution session spawn headless close target batch",
      wrapperKey: "headlessCloseCandidateBatch",
      companionKey: "headlessContextBatch"
    }
  );
  const headlessCloseCandidates = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessCloseTargetBatch["headlessCloseCandidateBatch"]["results"][number]
  >(
    normalizedBatch.results,
    "Execution session spawn headless close target batch requires headlessCloseCandidateBatch.results to be an array.",
    "Execution session spawn headless close target batch requires headlessCloseCandidateBatch.results entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessCloseTarget[] = [];

  for (const headlessCloseCandidate of headlessCloseCandidates) {
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
