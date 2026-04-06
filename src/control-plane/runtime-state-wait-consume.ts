import { ValidationError } from "../core/errors.js";
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
  const { consumer, invokeWait } = input;
  validateConsumer(consumer);
  const request = normalizeExecutionSessionWaitRequest(consumer.request);
  validateReadiness(consumer.readiness);

  if (!consumer.readiness.canConsumeWait) {
    return {
      request,
      readiness: consumer.readiness,
      invoked: false
    };
  }

  await invokeWait(request);

  return {
    request,
    readiness: consumer.readiness,
    invoked: true
  };
}

function validateConsumer(value: unknown): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session wait consume requires consumer to be an object."
    );
  }

  const consumer = value as {
    readiness?: unknown;
  };

  if (
    typeof consumer.readiness !== "object" ||
    consumer.readiness === null ||
    Array.isArray(consumer.readiness)
  ) {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness to be an object."
    );
  }
}

function validateReadiness(
  value: ExecutionSessionWaitConsumerReadiness
): void {
  if (!Array.isArray(value.blockingReasons)) {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.blockingReasons to be an array."
    );
  }

  for (let index = 0; index < value.blockingReasons.length; index += 1) {
    if (
      !hasOwnIndex(value.blockingReasons, index) ||
      typeof value.blockingReasons[index] !== "string" ||
      !validBlockingReasons.has(
        value.blockingReasons[index] as ExecutionSessionWaitConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        "Execution session wait consume requires consumer.readiness.blockingReasons to use the existing wait consumer blocker vocabulary."
      );
    }
  }

  if (typeof value.canConsumeWait !== "boolean") {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.canConsumeWait to be a boolean."
    );
  }

  if (typeof value.hasBlockingReasons !== "boolean") {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.hasBlockingReasons to be a boolean."
    );
  }

  if (typeof value.sessionLifecycleSupported !== "boolean") {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.sessionLifecycleSupported to be a boolean."
    );
  }

  const hasBlockingReasons = value.blockingReasons.length > 0;

  if (value.canConsumeWait !== !hasBlockingReasons) {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.canConsumeWait to match whether blockingReasons is empty."
    );
  }

  if (value.hasBlockingReasons !== hasBlockingReasons) {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.hasBlockingReasons to match whether blockingReasons is non-empty."
    );
  }

  if (value.sessionLifecycleSupported !== value.canConsumeWait) {
    throw new ValidationError(
      "Execution session wait consume requires consumer.readiness.sessionLifecycleSupported to match consumer.readiness.canConsumeWait."
    );
  }
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}
