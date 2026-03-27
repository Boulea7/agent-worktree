import { ValidationError } from "../core/errors.js";
import type {
  AttemptHandoffConsume,
  AttemptHandoffConsumerReadiness,
  AttemptHandoffConsumeInput
} from "./types.js";

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
  if (typeof value.handoffSupported !== "boolean") {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.handoffSupported to be a boolean."
    );
  }
}
