import { normalizeBatchWrapper } from "./runtime-state-batch-wrapper-guards.js";
import {
  normalizeBatchWrapperObjectItems,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessContextBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { deriveExecutionSessionSpawnHeadlessCloseCandidate } from "./runtime-state-spawn-headless-close-candidate.js";
import type {
  ExecutionSessionSpawnHeadlessCloseCandidate,
  ExecutionSessionSpawnHeadlessCloseCandidateBatch,
  ExecutionSessionSpawnHeadlessCloseCandidateBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseCandidateBatch(
  input: ExecutionSessionSpawnHeadlessCloseCandidateBatchInput
): ExecutionSessionSpawnHeadlessCloseCandidateBatch {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessCloseCandidateBatchInput>(
      input,
      "Execution session spawn headless close candidate batch input must be an object."
    );
  const headlessContextBatch = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessCloseCandidateBatchInput["headlessContextBatch"]
  >(
    normalizedInput,
    "headlessContextBatch",
    "Execution session spawn headless close candidate batch requires headlessContextBatch to include headlessViewBatch and results."
  );
  const resolveSessionLifecycleCapability = readOptionalBatchWrapperProperty<
    ExecutionSessionSpawnHeadlessCloseCandidateBatchInput["resolveSessionLifecycleCapability"]
  >(
    normalizedInput,
    "resolveSessionLifecycleCapability",
    "Execution session close consumer readiness requires resolveSessionLifecycleCapability to be a function when provided."
  );
  const normalizedBatch = normalizeHeadlessContextBatchWrapper(
    headlessContextBatch,
    {
      context: "Execution session spawn headless close candidate batch",
      wrapperKey: "headlessContextBatch"
    }
  );
  const headlessContexts = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessCloseCandidateBatch["headlessContextBatch"]["results"][number]
  >(
    normalizedBatch.results,
    "Execution session spawn headless close candidate batch requires headlessContextBatch.results to be an array.",
    "Execution session spawn headless close candidate batch requires headlessContextBatch.results entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessCloseCandidate[] = [];

  for (const headlessContext of headlessContexts) {
    results.push(
      deriveExecutionSessionSpawnHeadlessCloseCandidate({
        headlessContext,
        ...(resolveSessionLifecycleCapability === undefined
          ? {}
          : {
              resolveSessionLifecycleCapability
            })
      })
    );
  }

  return {
    headlessContextBatch: normalizedBatch,
    results
  };
}
