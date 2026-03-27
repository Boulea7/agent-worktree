import { deriveAttemptHandoffFinalizationConsumer } from "./handoff-finalization-consumer.js";
import { consumeAttemptHandoffFinalization } from "./handoff-finalization-consume.js";
import type {
  AttemptHandoffFinalizationApply,
  AttemptHandoffFinalizationApplyInput
} from "./types.js";

export async function applyAttemptHandoffFinalization(
  input: AttemptHandoffFinalizationApplyInput
): Promise<AttemptHandoffFinalizationApply | undefined> {
  if (input.request === undefined) {
    return undefined;
  }

  const consumer =
    input.resolveHandoffFinalizationCapability === undefined
      ? deriveAttemptHandoffFinalizationConsumer({
          request: input.request
        })
      : deriveAttemptHandoffFinalizationConsumer({
          request: input.request,
          resolveHandoffFinalizationCapability:
            input.resolveHandoffFinalizationCapability
        });

  if (consumer === undefined) {
    return undefined;
  }

  const consume = await consumeAttemptHandoffFinalization({
    consumer,
    invokeHandoffFinalization: input.invokeHandoffFinalization
  });

  return {
    consumer,
    consume
  };
}
