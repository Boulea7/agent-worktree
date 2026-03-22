import type {
  ExecutionSessionWaitConsume,
  ExecutionSessionWaitConsumeInput
} from "./types.js";

export async function consumeExecutionSessionWait(
  input: ExecutionSessionWaitConsumeInput
): Promise<ExecutionSessionWaitConsume> {
  const { consumer, invokeWait } = input;

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
