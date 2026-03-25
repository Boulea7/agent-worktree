import { ValidationError } from "../core/errors.js";
import { applyAttemptPromotionTarget } from "./promotion-target-apply.js";
import type {
  AttemptPromotionTargetApply,
  AttemptPromotionTargetApplyBatch,
  AttemptPromotionTargetApplyBatchInput
} from "./types.js";

export async function applyAttemptPromotionTargetBatch(
  input: AttemptPromotionTargetApplyBatchInput
): Promise<AttemptPromotionTargetApplyBatch> {
  const results: AttemptPromotionTargetApply[] = [];

  for (const target of input.targets) {
    const result = await applyAttemptPromotionTarget({
      target,
      invokeHandoff: input.invokeHandoff,
      ...(input.resolveHandoffCapability === undefined
        ? {}
        : {
            resolveHandoffCapability: input.resolveHandoffCapability
          })
    });

    if (result === undefined) {
      throw new ValidationError(
        "Attempt promotion target apply batch requires each target to produce a promotion target-apply result."
      );
    }

    results.push(result);
  }

  return {
    results
  };
}
