import { ValidationError } from "../core/errors.js";
import { applyAttemptHandoff } from "./handoff-apply.js";
import type {
  AttemptHandoffApply,
  AttemptHandoffApplyBatch,
  AttemptHandoffApplyBatchInput
} from "./types.js";

export async function applyAttemptHandoffBatch(
  input: AttemptHandoffApplyBatchInput
): Promise<AttemptHandoffApplyBatch> {
  const results: AttemptHandoffApply[] = [];

  for (const request of input.requests) {
    const result = await applyAttemptHandoff({
      request,
      invokeHandoff: input.invokeHandoff,
      ...(input.resolveHandoffCapability === undefined
        ? {}
        : {
            resolveHandoffCapability: input.resolveHandoffCapability
          })
    });

    if (result === undefined) {
      throw new ValidationError(
        "Attempt handoff apply batch requires each request to produce an apply result."
      );
    }

    results.push(result);
  }

  return {
    results
  };
}
