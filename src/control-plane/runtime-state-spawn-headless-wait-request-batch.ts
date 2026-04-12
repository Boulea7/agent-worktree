import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapperObjectItems
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { deriveExecutionSessionSpawnHeadlessWaitRequest } from "./runtime-state-spawn-headless-wait-request.js";
import type {
  ExecutionSessionSpawnHeadlessWaitRequest,
  ExecutionSessionSpawnHeadlessWaitRequestBatch,
  ExecutionSessionSpawnHeadlessWaitRequestBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitRequestBatch(
  input: ExecutionSessionSpawnHeadlessWaitRequestBatchInput
): ExecutionSessionSpawnHeadlessWaitRequestBatch {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session spawn headless wait request batch input must be an object."
    );
  }

  const headlessWaitTargetBatch = normalizeHeadlessWaitTargetBatch(
    input.headlessWaitTargetBatch
  );
  const headlessWaitTargets = normalizeBatchWrapperObjectItems<
    ExecutionSessionSpawnHeadlessWaitRequestBatch["headlessWaitTargetBatch"]["results"][number]
  >(
    headlessWaitTargetBatch.results,
    "Execution session spawn headless wait request batch requires headlessWaitTargetBatch.results to be an array.",
    "Execution session spawn headless wait request batch requires headlessWaitTargetBatch.results entries to be objects."
  );
  const results: ExecutionSessionSpawnHeadlessWaitRequest[] = [];

  for (const headlessWaitTarget of headlessWaitTargets) {
    results.push(
      deriveExecutionSessionSpawnHeadlessWaitRequest({
        headlessWaitTarget,
        ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs })
      })
    );
  }

  return {
    headlessWaitTargetBatch,
    results
  };
}

function normalizeHeadlessWaitTargetBatch(
  value: ExecutionSessionSpawnHeadlessWaitRequestBatchInput["headlessWaitTargetBatch"]
) {
  return normalizeHeadlessTargetBatchWrapper(value, {
    context: "Execution session spawn headless wait request batch",
    wrapperKey: "headlessWaitTargetBatch",
    companionKey: "headlessWaitCandidateBatch"
  });
}
