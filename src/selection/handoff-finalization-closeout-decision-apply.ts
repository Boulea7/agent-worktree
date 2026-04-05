import type {
  AttemptHandoffFinalizationCloseoutDecisionSummary,
  AttemptHandoffFinalizationRequestSummaryApplyInput
} from "./types.js";
import { deriveAttemptHandoffFinalizationCloseoutSummary } from "./handoff-finalization-closeout-summary.js";
import { deriveAttemptHandoffFinalizationCloseoutDecisionSummary } from "./handoff-finalization-closeout-decision.js";

export async function applyAttemptHandoffFinalizationCloseoutDecisionSummary(
  input: AttemptHandoffFinalizationRequestSummaryApplyInput
): Promise<AttemptHandoffFinalizationCloseoutDecisionSummary | undefined> {
  const closeoutSummary =
    await deriveAttemptHandoffFinalizationCloseoutSummary(input);

  return deriveAttemptHandoffFinalizationCloseoutDecisionSummary(
    closeoutSummary
  );
}
