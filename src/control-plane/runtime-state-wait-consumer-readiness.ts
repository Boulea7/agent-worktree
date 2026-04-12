import { ValidationError } from "../core/errors.js";
import { adapterSupportsCapability } from "../adapters/catalog.js";
import {
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeExecutionSessionWaitRequest } from "./runtime-state-wait-request.js";
import type {
  ExecutionSessionWaitConsumerBlockingReason,
  ExecutionSessionWaitConsumerReadiness,
  ExecutionSessionWaitConsumerReadinessInput
} from "./types.js";

export function deriveExecutionSessionWaitConsumerReadiness(
  input: ExecutionSessionWaitConsumerReadinessInput
): ExecutionSessionWaitConsumerReadiness {
  validateWaitConsumerReadinessInput(input);
  const request = normalizeExecutionSessionWaitRequest(input.request);

  const sessionLifecycleSupported = resolveSessionLifecycleCapability(
    request,
    input.resolveSessionLifecycleCapability
  );
  const blockingReasons: ExecutionSessionWaitConsumerBlockingReason[] = [];

  if (!sessionLifecycleSupported) {
    blockingReasons.push("session_lifecycle_unsupported");
  }

  return {
    blockingReasons,
    canConsumeWait: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0,
    sessionLifecycleSupported
  };
}

function validateWaitConsumerReadinessInput(
  input: ExecutionSessionWaitConsumerReadinessInput
): void {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session wait consumer readiness input must be an object."
    );
  }

  const request = readRequiredBatchWrapperProperty(
    input,
    "request",
    "Execution session wait consumer readiness requires request to be an object."
  );

  if (typeof request !== "object" || request === null || Array.isArray(request)) {
    throw new ValidationError(
      "Execution session wait consumer readiness requires request to be an object."
    );
  }

  const resolveSessionLifecycleCapability = readOptionalBatchWrapperProperty(
    input,
    "resolveSessionLifecycleCapability",
    "Execution session wait consumer readiness requires resolveSessionLifecycleCapability to be a function when provided."
  );

  if (
    resolveSessionLifecycleCapability !== undefined &&
    typeof resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session wait consumer readiness requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }
}

function resolveSessionLifecycleCapability(
  request: ExecutionSessionWaitConsumerReadinessInput["request"],
  resolveCapability:
    | ExecutionSessionWaitConsumerReadinessInput["resolveSessionLifecycleCapability"]
    | undefined
): boolean {
  if (resolveCapability !== undefined) {
    const supported = resolveCapability(request.runtime);

    if (typeof supported !== "boolean") {
      throw new ValidationError(
        "Execution session wait consumer readiness requires resolveSessionLifecycleCapability to return a boolean."
      );
    }

    return supported;
  }

  try {
    return adapterSupportsCapability(request.runtime, "sessionLifecycle");
  } catch {
    return false;
  }
}
