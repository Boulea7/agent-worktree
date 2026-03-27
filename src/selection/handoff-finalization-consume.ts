import { ValidationError } from "../core/errors.js";
import type {
  AttemptHandoffFinalizationConsume,
  AttemptHandoffFinalizationConsumeInput,
  AttemptHandoffFinalizationConsumerReadiness
} from "./types.js";

export async function consumeAttemptHandoffFinalization(
  input: AttemptHandoffFinalizationConsumeInput
): Promise<AttemptHandoffFinalizationConsume> {
  const { consumer, invokeHandoffFinalization } = input;
  validateReadiness(consumer.readiness);

  if (!consumer.readiness.canConsumeHandoffFinalization) {
    return {
      request: consumer.request,
      readiness: consumer.readiness,
      invoked: false
    };
  }

  await invokeHandoffFinalization(consumer.request);

  return {
    request: consumer.request,
    readiness: consumer.readiness,
    invoked: true
  };
}

function validateReadiness(
  value: AttemptHandoffFinalizationConsumerReadiness
): void {
  if (!Array.isArray(value.blockingReasons)) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.blockingReasons to be an array."
    );
  }

  if (typeof value.canConsumeHandoffFinalization !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.canConsumeHandoffFinalization to be a boolean."
    );
  }

  if (typeof value.hasBlockingReasons !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.hasBlockingReasons to be a boolean."
    );
  }

  if (typeof value.handoffFinalizationSupported !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.handoffFinalizationSupported to be a boolean."
    );
  }

  const hasBlockingReasons = value.blockingReasons.length > 0;

  if (value.canConsumeHandoffFinalization !== !hasBlockingReasons) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.canConsumeHandoffFinalization to match whether blockingReasons is empty."
    );
  }

  if (value.hasBlockingReasons !== hasBlockingReasons) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.hasBlockingReasons to match whether blockingReasons is non-empty."
    );
  }

  if (
    value.handoffFinalizationSupported !==
    value.canConsumeHandoffFinalization
  ) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.handoffFinalizationSupported to match consumer.readiness.canConsumeHandoffFinalization."
    );
  }
}
