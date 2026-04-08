import { ValidationError } from "../core/errors.js";
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
  return normalizeHeadlessTargetWrapper(value, {
    context: "Execution session spawn headless close request",
    nestedKey: "headlessCloseCandidate",
    wrapperKey: "headlessCloseTarget"
  });
}
