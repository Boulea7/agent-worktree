import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeExecutionSessionWaitRequest } from "./runtime-state-wait-request.js";
import type {
  ExecutionSessionWaitConsumerBlockingReason,
  ExecutionSessionWaitConsume,
  ExecutionSessionWaitConsumerReadiness,
  ExecutionSessionWaitConsumeInput
} from "./types.js";

const validBlockingReasons =
  new Set<ExecutionSessionWaitConsumerBlockingReason>([
    "session_lifecycle_unsupported"
  ]);

export async function consumeExecutionSessionWait(
  input: ExecutionSessionWaitConsumeInput
): Promise<ExecutionSessionWaitConsume> {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionWaitConsumeInput>(
    input,
    "Execution session wait consume input must be an object."
  );
  const consumer = readRequiredBatchWrapperProperty<
    ExecutionSessionWaitConsumeInput["consumer"]
  >(
    normalizedInput,
    "consumer",
    "Execution session wait consume requires consumer to be an object."
  );
  const invokeWait = readRequiredBatchWrapperProperty<
    ExecutionSessionWaitConsumeInput["invokeWait"]
  >(
    normalizedInput,
    "invokeWait",
    "Execution session wait consume requires invokeWait to be a function."
  );
  const { readiness, request: requestInput } = validateConsumer(consumer);
  validateInvokeWait(invokeWait);
  const request = normalizeExecutionSessionWaitRequest(requestInput);
  validateReadiness(readiness);

  if (!readiness.canConsumeWait) {
    return {
      request,
      readiness,
      invoked: false
    };
  }

  await invokeWait(request);

  return {
    request,
    readiness,
    invoked: true
  };
}

function validateInvokeWait(value: unknown): void {
  if (typeof value !== "function") {
    throw new ValidationError(
      "Execution session wait consume requires invokeWait to be a function."
    );
  }
}

function validateConsumer(value: unknown): {
  readiness: ExecutionSessionWaitConsumerReadiness;
  request: ExecutionSessionWaitConsumeInput["consumer"]["request"];
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session wait consume requires consumer to be an object."
    );
  }

  const consumer = value as object;
  const readiness = readRequiredBatchWrapperProperty(
    consumer,
    "readiness",
    "Execution session wait consume requires consumer.readiness to be an object."
  );

  if (
    typeof readiness !== "object" ||
    readiness === null ||
    Array.isArray(readiness)
  ) {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness to be an object."
    );
  }

  const request = readRequiredBatchWrapperProperty<
    ExecutionSessionWaitConsumeInput["consumer"]["request"]
  >(
    consumer,
    "request",
    "Execution session wait consume requires consumer.request to be an object."
  );

  return {
    readiness: readiness as ExecutionSessionWaitConsumerReadiness,
    request
  };
}

function validateReadiness(
  value: ExecutionSessionWaitConsumerReadiness
): void {
  let blockingReasons: unknown;

  try {
    blockingReasons = value.blockingReasons;
  } catch {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.blockingReasons to be an array."
    );
  }

  if (!Array.isArray(blockingReasons)) {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.blockingReasons to be an array."
    );
  }

  for (let index = 0; index < blockingReasons.length; index += 1) {
    let blockingReason: unknown;

    try {
      blockingReason = blockingReasons[index];
    } catch {
      throw new ValidationError(
        "Execution session wait consume requires consumer.readiness.blockingReasons to use the existing wait consumer blocker vocabulary."
      );
    }

    if (
      !hasOwnIndex(blockingReasons, index) ||
      typeof blockingReason !== "string" ||
      !validBlockingReasons.has(
        blockingReason as ExecutionSessionWaitConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        "Execution session wait consume requires consumer.readiness.blockingReasons to use the existing wait consumer blocker vocabulary."
      );
    }
  }

  let canConsumeWait: unknown;

  try {
    canConsumeWait = value.canConsumeWait;
  } catch {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.canConsumeWait to be a boolean."
    );
  }

  if (typeof canConsumeWait !== "boolean") {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.canConsumeWait to be a boolean."
    );
  }

  let hasBlockingReasons: unknown;

  try {
    hasBlockingReasons = value.hasBlockingReasons;
  } catch {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.hasBlockingReasons to be a boolean."
    );
  }

  if (typeof hasBlockingReasons !== "boolean") {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.hasBlockingReasons to be a boolean."
    );
  }

  let sessionLifecycleSupported: unknown;

  try {
    sessionLifecycleSupported = value.sessionLifecycleSupported;
  } catch {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.sessionLifecycleSupported to be a boolean."
    );
  }

  if (typeof sessionLifecycleSupported !== "boolean") {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.sessionLifecycleSupported to be a boolean."
    );
  }

  const derivedHasBlockingReasons = blockingReasons.length > 0;

  if (canConsumeWait !== !derivedHasBlockingReasons) {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.canConsumeWait to match whether blockingReasons is empty."
    );
  }

  if (hasBlockingReasons !== derivedHasBlockingReasons) {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.hasBlockingReasons to match whether blockingReasons is non-empty."
    );
  }

  if (sessionLifecycleSupported !== canConsumeWait) {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.sessionLifecycleSupported to match consumer.readiness.canConsumeWait."
    );
  }
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}
