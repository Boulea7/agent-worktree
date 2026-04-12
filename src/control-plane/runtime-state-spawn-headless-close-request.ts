import { ValidationError } from "../core/errors.js";
import { readOptionalBatchWrapperProperty } from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessTargetWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { deriveExecutionSessionCloseRequest } from "./runtime-state-close-request.js";
import type {
  ExecutionSessionSpawnHeadlessCloseRequest,
  ExecutionSessionSpawnHeadlessCloseRequestInput,
  ExecutionSessionSpawnHeadlessCloseTarget
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseRequest(
  input: ExecutionSessionSpawnHeadlessCloseRequestInput
): ExecutionSessionSpawnHeadlessCloseRequest {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session spawn headless close request input must be an object."
    );
  }

  const headlessCloseTarget = normalizeHeadlessCloseTarget(
    input.headlessCloseTarget
  );
  const target =
    readOptionalBatchWrapperProperty<
      NonNullable<ExecutionSessionSpawnHeadlessCloseTarget["target"]>
    >(
      headlessCloseTarget,
      "target",
      "Execution session spawn headless close request requires headlessCloseTarget.target to be an object when provided."
    );

  if (target === undefined) {
    return {
      headlessCloseTarget
    };
  }

  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    throw new ValidationError(
      "Execution session spawn headless close request requires headlessCloseTarget.target to be an object when provided."
    );
  }

  return {
    headlessCloseTarget,
    request: deriveExecutionSessionCloseRequest({
      target
    })
  };
}

function normalizeHeadlessCloseTarget(
  value: ExecutionSessionSpawnHeadlessCloseTarget
): ExecutionSessionSpawnHeadlessCloseTarget {
  return normalizeHeadlessTargetWrapper(value, {
    context: "Execution session spawn headless close request",
    nestedKey: "headlessCloseCandidate",
    wrapperKey: "headlessCloseTarget"
  });
}
