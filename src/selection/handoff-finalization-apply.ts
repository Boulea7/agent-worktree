import { deriveAttemptHandoffFinalizationConsumer } from "./handoff-finalization-consumer.js";
import { consumeAttemptHandoffFinalization } from "./handoff-finalization-consume.js";
import {
  validateSelectionObjectInput,
  validateSelectionOptionalFunction,
  validateSelectionRequiredFunction
} from "./entry-validation.js";
import type {
  AttemptHandoffFinalizationApply,
  AttemptHandoffFinalizationApplyInput
} from "./types.js";

export async function applyAttemptHandoffFinalization(
  input: AttemptHandoffFinalizationApplyInput
): Promise<AttemptHandoffFinalizationApply | undefined> {
  validateSelectionObjectInput(
    input,
    "Attempt handoff finalization apply input must be an object."
  );
  validateSelectionRequiredFunction(
    input.invokeHandoffFinalization,
    "Attempt handoff finalization apply requires invokeHandoffFinalization to be a function."
  );
  validateSelectionOptionalFunction(
    input.resolveHandoffFinalizationCapability,
    "Attempt handoff finalization apply requires resolveHandoffFinalizationCapability to be a function when provided."
  );

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
