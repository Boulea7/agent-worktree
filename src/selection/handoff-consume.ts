import type {
  AttemptHandoffConsume,
  AttemptHandoffConsumeInput
} from "./types.js";

export async function consumeAttemptHandoff(
  input: AttemptHandoffConsumeInput
): Promise<AttemptHandoffConsume> {
  const { consumer, invokeHandoff } = input;

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
