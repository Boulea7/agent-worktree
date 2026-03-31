import { ValidationError } from "../core/errors.js";
import type {
  AttemptHandoffConsume,
  AttemptHandoffConsumerBlockingReason,
  AttemptHandoffConsumerReadiness,
  AttemptHandoffConsumeInput
} from "./types.js";

const validBlockingReasons = new Set<AttemptHandoffConsumerBlockingReason>([
  "handoff_unsupported"
]);

export async function consumeAttemptHandoff(
  input: AttemptHandoffConsumeInput
): Promise<AttemptHandoffConsume> {
  const { consumer, invokeHandoff } = input;
  validateReadiness(consumer.readiness);

  if (!consumer.readiness.canConsumeHandoff) {
    return {
      request: consumer.request,
      readiness: consumer.readiness,
      invoked: false
    };
  }

  await invokeHandoff(consumer.request);

  return {
    request: consumer.request,
    readiness: consumer.readiness,
    invoked: true
  };
}

function validateReadiness(value: AttemptHandoffConsumerReadiness): void {
  if (!Array.isArray(value.blockingReasons)) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.blockingReasons to be an array."
    );
  }

  for (let index = 0; index < value.blockingReasons.length; index += 1) {
    if (
      !hasOwnIndex(value.blockingReasons, index) ||
      typeof value.blockingReasons[index] !== "string" ||
      !validBlockingReasons.has(
        value.blockingReasons[index] as AttemptHandoffConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        "Attempt handoff consume requires consumer.readiness.blockingReasons to use the existing handoff consumer blocker vocabulary."
      );
    }
  }

  if (typeof value.canConsumeHandoff !== "boolean") {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.canConsumeHandoff to be a boolean."
    );
  }

  if (typeof value.hasBlockingReasons !== "boolean") {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.hasBlockingReasons to be a boolean."
    );
  }

  if (typeof value.handoffSupported !== "boolean") {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.handoffSupported to be a boolean."
    );
  }

  const hasBlockingReasons = value.blockingReasons.length > 0;

  if (value.canConsumeHandoff !== !hasBlockingReasons) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.canConsumeHandoff to match whether blockingReasons is empty."
    );
  }

  if (value.hasBlockingReasons !== hasBlockingReasons) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.hasBlockingReasons to match whether blockingReasons is non-empty."
    );
  }

  if (value.handoffSupported !== value.canConsumeHandoff) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.handoffSupported to match consumer.readiness.canConsumeHandoff."
    );
  }
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}
