import { deriveAttemptHandoffConsumer } from "./handoff-consumer.js";
import { consumeAttemptHandoff } from "./handoff-consume.js";
import type {
  AttemptHandoffApply,
  AttemptHandoffApplyInput
} from "./types.js";

export async function applyAttemptHandoff(
  input: AttemptHandoffApplyInput
): Promise<AttemptHandoffApply | undefined> {
  if (input.request === undefined) {
    return undefined;
  }

  const consumer =
    input.resolveHandoffCapability === undefined
      ? deriveAttemptHandoffConsumer({
          request: input.request
        })
      : deriveAttemptHandoffConsumer({
          request: input.request,
          resolveHandoffCapability: input.resolveHandoffCapability
        });

  if (consumer === undefined) {
    return undefined;
  }

  const consume = await consumeAttemptHandoff({
    consumer,
    invokeHandoff: input.invokeHandoff
  });

  return {
    consumer,
    consume
  };
}
