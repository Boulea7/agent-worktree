import { deriveAttemptHandoffConsumer } from "./handoff-consumer.js";
import { consumeAttemptHandoff } from "./handoff-consume.js";
import {
  validateSelectionObjectInput,
  validateSelectionOptionalFunction,
  validateSelectionRequiredFunction
} from "./entry-validation.js";
import type {
  AttemptHandoffApply,
  AttemptHandoffApplyInput
} from "./types.js";

export async function applyAttemptHandoff(
  input: AttemptHandoffApplyInput
): Promise<AttemptHandoffApply | undefined> {
  validateSelectionObjectInput(input, "Attempt handoff apply input must be an object.");
  validateSelectionRequiredFunction(
    input.invokeHandoff,
    "Attempt handoff apply requires invokeHandoff to be a function."
  );
  validateSelectionOptionalFunction(
    input.resolveHandoffCapability,
    "Attempt handoff apply requires resolveHandoffCapability to be a function when provided."
  );

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
