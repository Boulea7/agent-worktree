import type {
  ExecutionSessionCloseConsume,
  ExecutionSessionCloseConsumeInput
} from "./types.js";

export async function consumeExecutionSessionClose(
  input: ExecutionSessionCloseConsumeInput
): Promise<ExecutionSessionCloseConsume> {
  const { consumer, invokeClose } = input;

  if (!consumer.readiness.canConsumeClose) {
    return {
      request: consumer.request,
      readiness: consumer.readiness,
      invoked: false
    };
  }

  await invokeClose(consumer.request);

  return {
    request: consumer.request,
    readiness: consumer.readiness,
    invoked: true
  };
}
