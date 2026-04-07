import { ValidationError } from "../core/errors.js";
import { deriveExecutionSessionWaitRequest } from "./runtime-state-wait-request.js";
import type {
  ExecutionSessionSpawnHeadlessWaitRequest,
  ExecutionSessionSpawnHeadlessWaitRequestInput,
  ExecutionSessionSpawnHeadlessWaitTarget
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitRequest(
  input: ExecutionSessionSpawnHeadlessWaitRequestInput
): ExecutionSessionSpawnHeadlessWaitRequest {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session spawn headless wait request input must be an object."
    );
  }

  const headlessWaitTarget = normalizeHeadlessWaitTarget(input.headlessWaitTarget);

  if (headlessWaitTarget.target === undefined) {
    return {
      headlessWaitTarget
    };
  }

  return {
    headlessWaitTarget,
    request: deriveExecutionSessionWaitRequest({
      target: headlessWaitTarget.target,
      ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs })
    })
  };
}

function normalizeHeadlessWaitTarget(
  value: ExecutionSessionSpawnHeadlessWaitTarget
): ExecutionSessionSpawnHeadlessWaitTarget {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("headlessWaitCandidate" in value)
  ) {
    throw new ValidationError(
      "Execution session spawn headless wait request requires a headlessWaitTarget wrapper."
    );
  }

  if (
    typeof value.headlessWaitCandidate !== "object" ||
    value.headlessWaitCandidate === null ||
    Array.isArray(value.headlessWaitCandidate)
  ) {
    throw new ValidationError(
      "Execution session spawn headless wait request requires headlessWaitTarget.headlessWaitCandidate to be an object."
    );
  }

  if (
    !("candidate" in value.headlessWaitCandidate) ||
    typeof value.headlessWaitCandidate.candidate !== "object" ||
    value.headlessWaitCandidate.candidate === null ||
    Array.isArray(value.headlessWaitCandidate.candidate) ||
    !("headlessContext" in value.headlessWaitCandidate) ||
    typeof value.headlessWaitCandidate.headlessContext !== "object" ||
    value.headlessWaitCandidate.headlessContext === null ||
    Array.isArray(value.headlessWaitCandidate.headlessContext)
  ) {
    throw new ValidationError(
      "Execution session spawn headless wait request requires headlessWaitTarget.headlessWaitCandidate to include candidate and headlessContext objects."
    );
  }

  return value;
}
