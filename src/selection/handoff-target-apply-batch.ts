import { ValidationError } from "../core/errors.js";
import { applyAttemptHandoffTarget } from "./handoff-target-apply.js";
import type {
  AttemptHandoffTargetApply,
  AttemptHandoffTargetApplyBatch,
  AttemptHandoffTargetApplyBatchInput
} from "./types.js";

export async function applyAttemptHandoffTargetBatch(
  input: AttemptHandoffTargetApplyBatchInput
): Promise<AttemptHandoffTargetApplyBatch> {
  const results: AttemptHandoffTargetApply[] = [];

  for (const target of input.targets) {
    const result = await applyAttemptHandoffTarget({
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
        "Attempt handoff target apply batch requires each target to produce a target-apply result."
      );
    }

    results.push(result);
  }

  return {
    results
  };
}
