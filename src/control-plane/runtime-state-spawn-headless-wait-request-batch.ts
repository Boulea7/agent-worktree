import { ValidationError } from "../core/errors.js";
import { deriveExecutionSessionSpawnHeadlessWaitRequest } from "./runtime-state-spawn-headless-wait-request.js";
import type {
  ExecutionSessionSpawnHeadlessWaitRequest,
  ExecutionSessionSpawnHeadlessWaitRequestBatch,
  ExecutionSessionSpawnHeadlessWaitRequestBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitRequestBatch(
  input: ExecutionSessionSpawnHeadlessWaitRequestBatchInput
): ExecutionSessionSpawnHeadlessWaitRequestBatch {
  const headlessWaitTargetBatch = normalizeHeadlessWaitTargetBatch(
    input.headlessWaitTargetBatch
  );
  const results: ExecutionSessionSpawnHeadlessWaitRequest[] = [];

  for (const headlessWaitTarget of headlessWaitTargetBatch.results) {
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
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session spawn headless wait request batch requires a headlessWaitTargetBatch wrapper."
    );
  }

  if (!Array.isArray(value.results)) {
    throw new ValidationError(
      "Execution session spawn headless wait request batch requires headlessWaitTargetBatch.results to be an array."
    );
  }

  return value;
}
