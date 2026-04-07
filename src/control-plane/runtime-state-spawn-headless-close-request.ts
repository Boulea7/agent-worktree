import { ValidationError } from "../core/errors.js";
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

  if (headlessCloseTarget.target === undefined) {
    return {
      headlessCloseTarget
    };
  }

  return {
    headlessCloseTarget,
    request: deriveExecutionSessionCloseRequest({
      target: headlessCloseTarget.target
    })
  };
}

function normalizeHeadlessCloseTarget(
  value: ExecutionSessionSpawnHeadlessCloseTarget
): ExecutionSessionSpawnHeadlessCloseTarget {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("headlessCloseCandidate" in value)
  ) {
    throw new ValidationError(
      "Execution session spawn headless close request requires a headlessCloseTarget wrapper."
    );
  }

  if (
    typeof value.headlessCloseCandidate !== "object" ||
    value.headlessCloseCandidate === null ||
    Array.isArray(value.headlessCloseCandidate)
  ) {
    throw new ValidationError(
      "Execution session spawn headless close request requires headlessCloseTarget.headlessCloseCandidate to be an object."
    );
  }

  if (
    !("candidate" in value.headlessCloseCandidate) ||
    typeof value.headlessCloseCandidate.candidate !== "object" ||
    value.headlessCloseCandidate.candidate === null ||
    Array.isArray(value.headlessCloseCandidate.candidate) ||
    !("headlessContext" in value.headlessCloseCandidate) ||
    typeof value.headlessCloseCandidate.headlessContext !== "object" ||
    value.headlessCloseCandidate.headlessContext === null ||
    Array.isArray(value.headlessCloseCandidate.headlessContext)
  ) {
    throw new ValidationError(
      "Execution session spawn headless close request requires headlessCloseTarget.headlessCloseCandidate to include candidate and headlessContext objects."
    );
  }

  return value;
}
