import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
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
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionSpawnHeadlessCloseRequestInput>(
      input,
      "Execution session spawn headless close request input must be an object."
    );
  const headlessCloseTarget = normalizeHeadlessCloseTarget(
    readRequiredBatchWrapperProperty<
      ExecutionSessionSpawnHeadlessCloseRequestInput["headlessCloseTarget"]
    >(
      normalizedInput,
      "headlessCloseTarget",
      "Execution session spawn headless close request requires a headlessCloseTarget wrapper."
    )
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
