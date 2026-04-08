import { ValidationError } from "../core/errors.js";
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
  return normalizeHeadlessTargetWrapper(value, {
    context: "Execution session spawn headless wait request",
    nestedKey: "headlessWaitCandidate",
    wrapperKey: "headlessWaitTarget"
  });
}
