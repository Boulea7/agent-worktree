import { applyAttemptHandoffFinalizationBatch } from "./handoff-finalization-apply-batch.js";
import type {
  AttemptHandoffFinalizationApplyBatch,
  AttemptHandoffFinalizationRequestSummaryApplyInput
} from "./types.js";
import { validateAttemptHandoffFinalizationRequestSummaryForApply } from "./handoff-finalization-request-summary-shared.js";

export async function applyAttemptHandoffFinalizationRequestSummary(
  input: AttemptHandoffFinalizationRequestSummaryApplyInput
): Promise<AttemptHandoffFinalizationApplyBatch | undefined> {
  if (input.summary === undefined) {
    return undefined;
  }

  validateAttemptHandoffFinalizationRequestSummaryForApply(input.summary);

  if (!input.summary.canFinalizeHandoff) {
    return undefined;
  }

  return applyAttemptHandoffFinalizationBatch({
    requests: input.summary.requests,
    invokeHandoffFinalization: input.invokeHandoffFinalization,
    ...(input.resolveHandoffFinalizationCapability === undefined
      ? {}
      : {
          resolveHandoffFinalizationCapability:
            input.resolveHandoffFinalizationCapability
      })
  });
}
