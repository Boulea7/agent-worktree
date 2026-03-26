import { ValidationError } from "../core/errors.js";
import { deriveAttemptHandoffDecisionSummary } from "./handoff-decision.js";
import type {
  AttemptHandoffExplanationSummary,
  AttemptHandoffFinalizationTargetSummary
} from "./types.js";

const ATTEMPT_HANDOFF_FINALIZATION_BASIS =
  "handoff_decision_summary" as const;

export function deriveAttemptHandoffFinalizationTargetSummary(
  summary: AttemptHandoffExplanationSummary | undefined
): AttemptHandoffFinalizationTargetSummary | undefined {
  if (summary === undefined) {
    return undefined;
  }

  const decision = deriveAttemptHandoffDecisionSummary(summary);

  if (decision === undefined || !decision.canFinalizeHandoff) {
    return undefined;
  }

  if (summary.invokedResults.length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization target summary requires at least one invoked result when handoff finalization is ready."
    );
  }

  return {
    finalizationBasis: ATTEMPT_HANDOFF_FINALIZATION_BASIS,
    resultCount: decision.resultCount,
    invokedResultCount: decision.invokedResultCount,
    blockedResultCount: decision.blockedResultCount,
    blockingReasons: [...decision.blockingReasons],
    canFinalizeHandoff: decision.canFinalizeHandoff,
    targets: summary.invokedResults.map((entry) => ({
      taskId: entry.handoffTarget.taskId,
      attemptId: entry.handoffTarget.attemptId,
      runtime: entry.handoffTarget.runtime,
      status: entry.handoffTarget.status,
      sourceKind: entry.handoffTarget.sourceKind
    }))
  };
}
