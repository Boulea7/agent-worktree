import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeHeadlessTargetWrapper } from "./runtime-state-headless-wrapper-guards.js";
import { deriveExecutionSessionWaitRequest } from "./runtime-state-wait-request.js";
import type {
  ExecutionSessionSpawnHeadlessWaitRequest,
  ExecutionSessionSpawnHeadlessWaitRequestInput,
  ExecutionSessionSpawnHeadlessWaitTarget
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitRequest(
  input: ExecutionSessionSpawnHeadlessWaitRequestInput
): ExecutionSessionSpawnHeadlessWaitRequest {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessWaitRequestInput>(
      input,
      "Execution session spawn headless wait request input must be an object."
    );
  const headlessWaitTarget = normalizeHeadlessWaitTarget(
    readRequiredBatchWrapperProperty<
      ExecutionSessionSpawnHeadlessWaitRequestInput["headlessWaitTarget"]
    >(
      normalizedInput,
      "headlessWaitTarget",
      "Execution session spawn headless wait request requires a headlessWaitTarget wrapper."
    )
  );
  const target =
    readOptionalBatchWrapperProperty<
      NonNullable<ExecutionSessionSpawnHeadlessWaitTarget["target"]>
    >(
      headlessWaitTarget,
      "target",
      "Execution session spawn headless wait request requires headlessWaitTarget.target to be an object when provided."
    );

  if (target === undefined) {
    return {
      headlessWaitTarget
    };
  }

  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    throw new ValidationError(
      "Execution session spawn headless wait request requires headlessWaitTarget.target to be an object when provided."
    );
  }

  const timeoutMs = readOptionalBatchWrapperProperty<number>(
    normalizedInput,
    "timeoutMs",
    "Execution session wait request timeoutMs must be a finite integer greater than 0."
  );

  return {
    headlessWaitTarget,
    request: deriveExecutionSessionWaitRequest({
      target,
      ...(timeoutMs === undefined ? {} : { timeoutMs })
    })
  };
}

function normalizeHeadlessWaitTarget(
  value: ExecutionSessionSpawnHeadlessWaitTarget
): ExecutionSessionSpawnHeadlessWaitTarget {
  return normalizeHeadlessTargetWrapper(value, {
    context: "Execution session spawn headless wait request",
    nestedKey: "headlessWaitCandidate",
    wrapperKey: "headlessWaitTarget"
  });
}
