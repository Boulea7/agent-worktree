import { ValidationError } from "../core/errors.js";
import { adapterSupportsCapability } from "../adapters/catalog.js";
import {
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeExecutionSessionCloseRequest } from "./runtime-state-close-request.js";
import type {
  ExecutionSessionCloseConsumerBlockingReason,
  ExecutionSessionCloseConsumerReadiness,
  ExecutionSessionCloseConsumerReadinessInput
} from "./types.js";

export function deriveExecutionSessionCloseConsumerReadiness(
  input: ExecutionSessionCloseConsumerReadinessInput
): ExecutionSessionCloseConsumerReadiness {
  validateCloseConsumerReadinessInput(input);
  const request = normalizeExecutionSessionCloseRequest(input.request);

  const sessionLifecycleSupported = resolveSessionLifecycleCapability(
    request,
    input.resolveSessionLifecycleCapability
  );
  const blockingReasons: ExecutionSessionCloseConsumerBlockingReason[] = [];

  if (!sessionLifecycleSupported) {
    blockingReasons.push("session_lifecycle_unsupported");
  }

  return {
    blockingReasons,
    canConsumeClose: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0,
    sessionLifecycleSupported
  };
}

function validateCloseConsumerReadinessInput(
  input: ExecutionSessionCloseConsumerReadinessInput
): void {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session close consumer readiness input must be an object."
    );
  }

  const request = readRequiredBatchWrapperProperty(
    input,
    "request",
    "Execution session close consumer readiness requires request to be an object."
  );

  if (typeof request !== "object" || request === null || Array.isArray(request)) {
    throw new ValidationError(
      "Execution session close consumer readiness requires request to be an object."
    );
  }

  const resolveSessionLifecycleCapability = readOptionalBatchWrapperProperty(
    input,
    "resolveSessionLifecycleCapability",
    "Execution session close consumer readiness requires resolveSessionLifecycleCapability to be a function when provided."
  );

  if (
    resolveSessionLifecycleCapability !== undefined &&
    typeof resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session close consumer readiness requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }
}

function resolveSessionLifecycleCapability(
  request: ExecutionSessionCloseConsumerReadinessInput["request"],
  resolveCapability:
    | ExecutionSessionCloseConsumerReadinessInput["resolveSessionLifecycleCapability"]
    | undefined
): boolean {
  if (resolveCapability !== undefined) {
    const supported = resolveCapability(request.runtime);

    if (typeof supported !== "boolean") {
      throw new ValidationError(
        "Execution session close consumer readiness requires resolveSessionLifecycleCapability to return a boolean."
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
