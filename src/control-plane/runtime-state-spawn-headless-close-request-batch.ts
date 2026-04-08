import { ValidationError } from "../core/errors.js";
import { normalizeHeadlessTargetBatchWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { deriveExecutionSessionSpawnHeadlessCloseRequest } from "./runtime-state-spawn-headless-close-request.js";
import type {
  ExecutionSessionSpawnHeadlessCloseRequest,
  ExecutionSessionSpawnHeadlessCloseRequestBatch,
  ExecutionSessionSpawnHeadlessCloseRequestBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseRequestBatch(
  input: ExecutionSessionSpawnHeadlessCloseRequestBatchInput
): ExecutionSessionSpawnHeadlessCloseRequestBatch {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session spawn headless close request batch input must be an object."
    );
  }

  const headlessCloseTargetBatch = normalizeHeadlessCloseTargetBatch(
    input.headlessCloseTargetBatch
  );
  const results: ExecutionSessionSpawnHeadlessCloseRequest[] = [];

  for (const headlessCloseTarget of headlessCloseTargetBatch.results) {
    results.push(
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget
      })
    );
  }

  return {
    headlessCloseTargetBatch,
    results
  };
}

function normalizeHeadlessCloseTargetBatch(
  value: ExecutionSessionSpawnHeadlessCloseRequestBatchInput["headlessCloseTargetBatch"]
) {
  return normalizeHeadlessTargetBatchWrapper(value, {
    context: "Execution session spawn headless close request batch",
    wrapperKey: "headlessCloseTargetBatch"
  });
}
