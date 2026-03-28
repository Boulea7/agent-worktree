import { ValidationError } from "../core/errors.js";
import { applyAttemptHandoffFinalization } from "./handoff-finalization-apply.js";
import type {
  AttemptHandoffFinalizationApply,
  AttemptHandoffFinalizationApplyBatch,
  AttemptHandoffFinalizationApplyBatchInput
} from "./types.js";

export async function applyAttemptHandoffFinalizationBatch(
  input: AttemptHandoffFinalizationApplyBatchInput
): Promise<AttemptHandoffFinalizationApplyBatch> {
  const results: AttemptHandoffFinalizationApply[] = [];

  for (const request of input.requests) {
    const result = await applyAttemptHandoffFinalization({
      request,
      invokeHandoffFinalization: input.invokeHandoffFinalization,
      ...(input.resolveHandoffFinalizationCapability === undefined
        ? {}
        : {
            resolveHandoffFinalizationCapability:
              input.resolveHandoffFinalizationCapability
          })
    });

    if (result === undefined) {
      throw new ValidationError(
        "Attempt handoff finalization apply batch requires each request to produce an apply result."
      );
    }

    results.push(result);
  }

  return {
    results
  };
}
