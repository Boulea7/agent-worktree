import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeExecutionSessionCloseRequest } from "./runtime-state-close-request.js";
import type {
  ExecutionSessionCloseConsumerBlockingReason,
  ExecutionSessionCloseConsume,
  ExecutionSessionCloseConsumerReadiness,
  ExecutionSessionCloseConsumeInput
} from "./types.js";

const validBlockingReasons =
  new Set<ExecutionSessionCloseConsumerBlockingReason>([
    "session_lifecycle_unsupported"
  ]);

export async function consumeExecutionSessionClose(
  input: ExecutionSessionCloseConsumeInput
): Promise<ExecutionSessionCloseConsume> {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionCloseConsumeInput>(
    input,
    "Execution session close consume input must be an object."
  );
  const consumer = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseConsumeInput["consumer"]
  >(
    normalizedInput,
    "consumer",
    "Execution session close consume requires consumer to be an object."
  );
  const invokeClose = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseConsumeInput["invokeClose"]
  >(
    normalizedInput,
    "invokeClose",
    "Execution session close consume requires invokeClose to be a function."
  );
  const { readiness, request: requestInput } = validateConsumer(consumer);
  validateInvokeClose(invokeClose);
  const request = normalizeExecutionSessionCloseRequest(requestInput);
  validateReadiness(readiness);

  if (!readiness.canConsumeClose) {
    return {
      request,
      readiness,
      invoked: false
    };
  }

  await invokeClose(request);

  return {
    request,
    readiness,
    invoked: true
  };
}

function validateInvokeClose(value: unknown): void {
  if (typeof value !== "function") {
    throw new ValidationError(
      "Execution session close consume requires invokeClose to be a function."
    );
  }
}

function validateConsumer(value: unknown): {
  readiness: ExecutionSessionCloseConsumerReadiness;
  request: ExecutionSessionCloseConsumeInput["consumer"]["request"];
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session close consume requires consumer to be an object."
    );
  }

  const consumer = value as object;
  const readiness = readRequiredBatchWrapperProperty(
    consumer,
    "readiness",
    "Execution session close consume requires consumer.readiness to be an object."
  );

  if (
    typeof readiness !== "object" ||
    readiness === null ||
    Array.isArray(readiness)
  ) {
    throw new ValidationError(
      "Execution session close consume requires consumer.readiness to be an object."
    );
  }

  const request = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseConsumeInput["consumer"]["request"]
  >(
    consumer,
    "request",
    "Execution session close consume requires consumer.request to be an object."
  );

  return {
    readiness: readiness as ExecutionSessionCloseConsumerReadiness,
    request
  };
}

function validateReadiness(
  value: ExecutionSessionCloseConsumerReadiness
): void {
  let blockingReasons: unknown;

  try {
    blockingReasons = value.blockingReasons;
  } catch {
    throw new ValidationError(
      "Execution session close consume requires consumer.readiness.blockingReasons to be an array."
    );
  }

  if (!Array.isArray(blockingReasons)) {
    throw new ValidationError(
      "Execution session close consume requires consumer.readiness.blockingReasons to be an array."
    );
  }

  for (let index = 0; index < blockingReasons.length; index += 1) {
    let blockingReason: unknown;

    try {
      blockingReason = blockingReasons[index];
    } catch {
      throw new ValidationError(
        "Execution session close consume requires consumer.readiness.blockingReasons to use the existing close consumer blocker vocabulary."
      );
    }

    if (
      !hasOwnIndex(blockingReasons, index) ||
      typeof blockingReason !== "string" ||
      !validBlockingReasons.has(
        blockingReason as ExecutionSessionCloseConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        "Execution session close consume requires consumer.readiness.blockingReasons to use the existing close consumer blocker vocabulary."
      );
    }
  }

  let canConsumeClose: unknown;

  try {
    canConsumeClose = value.canConsumeClose;
  } catch {
    throw new ValidationError(
      "Execution session close consume requires consumer.readiness.canConsumeClose to be a boolean."
    );
  }

  if (typeof canConsumeClose !== "boolean") {
    throw new ValidationError(
      "Execution session close consume requires consumer.readiness.canConsumeClose to be a boolean."
    );
  }

  let hasBlockingReasons: unknown;

  try {
    hasBlockingReasons = value.hasBlockingReasons;
  } catch {
    throw new ValidationError(
      "Execution session close consume requires consumer.readiness.hasBlockingReasons to be a boolean."
    );
  }

  if (typeof hasBlockingReasons !== "boolean") {
    throw new ValidationError(
      "Execution session close consume requires consumer.readiness.hasBlockingReasons to be a boolean."
    );
  }

  let sessionLifecycleSupported: unknown;

  try {
    sessionLifecycleSupported = value.sessionLifecycleSupported;
  } catch {
    throw new ValidationError(
      "Execution session close consume requires consumer.readiness.sessionLifecycleSupported to be a boolean."
    );
  }

  if (typeof sessionLifecycleSupported !== "boolean") {
    throw new ValidationError(
      "Execution session close consume requires consumer.readiness.sessionLifecycleSupported to be a boolean."
    );
  }

  const derivedHasBlockingReasons = blockingReasons.length > 0;

  if (canConsumeClose !== !derivedHasBlockingReasons) {
    throw new ValidationError(
      "Execution session close consume requires consumer.readiness.canConsumeClose to match whether blockingReasons is empty."
    );
  }

  if (hasBlockingReasons !== derivedHasBlockingReasons) {
    throw new ValidationError(
      "Execution session close consume requires consumer.readiness.hasBlockingReasons to match whether blockingReasons is non-empty."
    );
  }

  if (sessionLifecycleSupported !== canConsumeClose) {
    throw new ValidationError(
      "Execution session close consume requires consumer.readiness.sessionLifecycleSupported to match consumer.readiness.canConsumeClose."
    );
  }
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}
