import { deriveAttemptHandoffConsumer } from "./handoff-consumer.js";
import { consumeAttemptHandoff } from "./handoff-consume.js";
import {
  readOwnedSelectionValue,
  rethrowSelectionAccessError,
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
  let request: AttemptHandoffApplyInput["request"];
  let invokeHandoff: AttemptHandoffApplyInput["invokeHandoff"];
  let resolveHandoffCapability:
    | AttemptHandoffApplyInput["resolveHandoffCapability"]
    | undefined;

  try {
    validateSelectionObjectInput(input, "Attempt handoff apply input must be an object.");
    request = readOwnedSelectionValue(
      input,
      "request",
      "Attempt handoff apply input must be a readable object."
    ) as AttemptHandoffApplyInput["request"];
    invokeHandoff = readOwnedSelectionValue(
      input,
      "invokeHandoff",
      "Attempt handoff apply input must be a readable object."
    ) as AttemptHandoffApplyInput["invokeHandoff"];
    validateSelectionRequiredFunction(
      invokeHandoff,
      "Attempt handoff apply requires invokeHandoff to be a function."
    );
    resolveHandoffCapability = readOwnedSelectionValue(
      input,
      "resolveHandoffCapability",
      "Attempt handoff apply input must be a readable object."
    ) as AttemptHandoffApplyInput["resolveHandoffCapability"];
    validateSelectionOptionalFunction(
      resolveHandoffCapability,
      "Attempt handoff apply requires resolveHandoffCapability to be a function when provided."
    );
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt handoff apply input must be a readable object."
    );
  }

  if (request === undefined) {
    return undefined;
  }

  const consumer =
    resolveHandoffCapability === undefined
      ? deriveAttemptHandoffConsumer({
          request
        })
      : deriveAttemptHandoffConsumer({
          request,
          resolveHandoffCapability
        });

  if (consumer === undefined) {
    return undefined;
  }

  const consume = await consumeAttemptHandoff({
    consumer,
    invokeHandoff
  });

  return {
    consumer,
    consume
  };
}
