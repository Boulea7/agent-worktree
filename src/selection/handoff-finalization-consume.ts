import { ValidationError } from "../core/errors.js";
import type {
  AttemptHandoffFinalizationConsume,
  AttemptHandoffFinalizationConsumeInput,
  AttemptHandoffFinalizationConsumerBlockingReason,
  AttemptHandoffFinalizationConsumerReadiness
} from "./types.js";

const validBlockingReasons =
  new Set<AttemptHandoffFinalizationConsumerBlockingReason>([
    "handoff_finalization_unsupported"
  ]);

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

  for (let index = 0; index < value.blockingReasons.length; index += 1) {
    if (
      !hasOwnIndex(value.blockingReasons, index) ||
      typeof value.blockingReasons[index] !== "string" ||
      !validBlockingReasons.has(
        value.blockingReasons[index] as AttemptHandoffFinalizationConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        "Attempt handoff finalization consume requires consumer.readiness.blockingReasons to contain only known blocking reasons."
      );
    }
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

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}
