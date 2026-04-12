import { ValidationError } from "../core/errors.js";
import { deriveAttemptHandoffDecisionSummary } from "./handoff-decision.js";
import { deriveAttemptHandoffExplanationSummary } from "./handoff-explanation.js";
import {
  accessSelectionValue,
  rethrowSelectionAccessError,
  validateSelectionArray,
  validateSelectionObjectArrayEntries,
  validateSelectionObjectInput
} from "./entry-validation.js";
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

  try {
    validateSelectionObjectInput(
      summary,
      "Attempt handoff finalization target summary requires summary to be an object."
    );

    const canonicalSummary = deriveCanonicalExplanationSummary(summary);
    const decision = deriveAttemptHandoffDecisionSummary(canonicalSummary);

    if (decision === undefined || !decision.canFinalizeHandoff) {
      return undefined;
    }

    if (canonicalSummary.invokedResults.length === 0) {
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
      targets: canonicalSummary.invokedResults.map((entry) => ({
        taskId: entry.handoffTarget.taskId,
        attemptId: entry.handoffTarget.attemptId,
        runtime: entry.handoffTarget.runtime,
        status: entry.handoffTarget.status,
        sourceKind: entry.handoffTarget.sourceKind
      }))
    };
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt handoff finalization target summary requires summary to be a readable object."
    );
  }
}

function deriveCanonicalExplanationSummary(
  summary: Record<string, unknown>
): AttemptHandoffExplanationSummary {
  const explanationBasis = accessSelectionValue(summary, "explanationBasis");

  if (explanationBasis !== "handoff_report_ready") {
    throw new ValidationError(
      'Attempt handoff finalization target summary requires summary.explanationBasis to be "handoff_report_ready".'
    );
  }

  const results = accessSelectionValue(summary, "results");

  validateSelectionArray(
    results,
    "Attempt handoff finalization target summary requires summary.results to be an array."
  );
  validateSelectionObjectArrayEntries(
    results,
    "Attempt handoff finalization target summary requires summary.results entries to be objects."
  );

  const explanationResults =
    results as AttemptHandoffExplanationSummary["results"];

  const canonicalSummary = deriveAttemptHandoffExplanationSummary({
    reportBasis: "promotion_target_apply_batch",
    results: explanationResults.map((entry) => ({
      handoffTarget: entry.handoffTarget,
      targetApply: entry.targetApply
    })),
    invokedResults: explanationResults
      .filter((entry) => entry.invoked)
      .map((entry) => ({
        handoffTarget: entry.handoffTarget,
        targetApply: entry.targetApply
      })),
    blockedResults: explanationResults
      .filter((entry) => !entry.invoked)
      .map((entry) => ({
        handoffTarget: entry.handoffTarget,
        targetApply: entry.targetApply
      }))
  });

  if (canonicalSummary === undefined) {
    throw new ValidationError(
      "Attempt handoff finalization target summary requires summary.results to produce a canonical explanation summary."
    );
  }

  return canonicalSummary;
}
