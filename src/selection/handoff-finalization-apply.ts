import { deriveAttemptHandoffFinalizationConsumer } from "./handoff-finalization-consumer.js";
import { consumeAttemptHandoffFinalization } from "./handoff-finalization-consume.js";
import {
  readOwnedSelectionValue,
  rethrowSelectionAccessError,
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
  let request: AttemptHandoffFinalizationApplyInput["request"];
  let invokeHandoffFinalization:
    | AttemptHandoffFinalizationApplyInput["invokeHandoffFinalization"];
  let resolveHandoffFinalizationCapability:
    | AttemptHandoffFinalizationApplyInput["resolveHandoffFinalizationCapability"]
    | undefined;

  try {
    validateSelectionObjectInput(
      input,
      "Attempt handoff finalization apply input must be an object."
    );
    request = readOwnedSelectionValue(
      input,
      "request",
      "Attempt handoff finalization apply input must be a readable object."
    ) as AttemptHandoffFinalizationApplyInput["request"];
    invokeHandoffFinalization = readOwnedSelectionValue(
      input,
      "invokeHandoffFinalization",
      "Attempt handoff finalization apply input must be a readable object."
    ) as AttemptHandoffFinalizationApplyInput["invokeHandoffFinalization"];
    validateSelectionRequiredFunction(
      invokeHandoffFinalization,
      "Attempt handoff finalization apply requires invokeHandoffFinalization to be a function."
    );
    resolveHandoffFinalizationCapability = readOwnedSelectionValue(
      input,
      "resolveHandoffFinalizationCapability",
      "Attempt handoff finalization apply input must be a readable object."
    ) as AttemptHandoffFinalizationApplyInput["resolveHandoffFinalizationCapability"];
    validateSelectionOptionalFunction(
      resolveHandoffFinalizationCapability,
      "Attempt handoff finalization apply requires resolveHandoffFinalizationCapability to be a function when provided."
    );
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt handoff finalization apply input must be a readable object."
    );
  }

  if (request === undefined) {
    return undefined;
  }

  const consumer =
    resolveHandoffFinalizationCapability === undefined
      ? deriveAttemptHandoffFinalizationConsumer({
          request
        })
      : deriveAttemptHandoffFinalizationConsumer({
          request,
          resolveHandoffFinalizationCapability
        });

  if (consumer === undefined) {
    return undefined;
  }

  const consume = await consumeAttemptHandoffFinalization({
    consumer,
    invokeHandoffFinalization
  });

  return {
    consumer,
    consume
  };
}
