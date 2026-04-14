import { ValidationError } from "../core/errors.js";
import { adapterSupportsCapability } from "../adapters/catalog.js";
import {
  normalizeBatchWrapper,
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
  const { request: requestInput, resolveSessionLifecycleCapability: capabilityResolver } =
    validateCloseConsumerReadinessInput(input);
  const request = normalizeExecutionSessionCloseRequest(requestInput);

  const sessionLifecycleSupported = resolveCloseSessionLifecycleCapability(
    request,
    capabilityResolver
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
): {
  request: ExecutionSessionCloseConsumerReadinessInput["request"];
  resolveSessionLifecycleCapability:
    | ExecutionSessionCloseConsumerReadinessInput["resolveSessionLifecycleCapability"]
    | undefined;
} {
  const normalizedInput =
    normalizeBatchWrapper<ExecutionSessionCloseConsumerReadinessInput>(
      input,
      "Execution session close consumer readiness input must be an object."
    );
  const request = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseConsumerReadinessInput["request"]
  >(
    normalizedInput,
    "request",
    "Execution session close consumer readiness requires request to be an object."
  );

  if (typeof request !== "object" || request === null || Array.isArray(request)) {
    throw new ValidationError(
      "Execution session close consumer readiness requires request to be an object."
    );
  }

  const resolveSessionLifecycleCapability = readOptionalBatchWrapperProperty<
    ExecutionSessionCloseConsumerReadinessInput["resolveSessionLifecycleCapability"]
  >(
    normalizedInput,
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

  return {
    request,
    resolveSessionLifecycleCapability
  };
}

function resolveCloseSessionLifecycleCapability(
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
