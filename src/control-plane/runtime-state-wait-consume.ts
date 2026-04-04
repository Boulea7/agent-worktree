import { ValidationError } from "../core/errors.js";
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
  validateReadiness(consumer.readiness);

  if (!consumer.readiness.canConsumeWait) {
    return {
      request: consumer.request,
      readiness: consumer.readiness,
      invoked: false
    };
  }

  await invokeWait(consumer.request);

  return {
    request: consumer.request,
    readiness: consumer.readiness,
    invoked: true
  };
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
