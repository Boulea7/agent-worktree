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
  const invokedResults = accessSelectionValue(summary, "invokedResults");
  const blockedResults = accessSelectionValue(summary, "blockedResults");

  validateSelectionArray(
    results,
    "Attempt handoff finalization target summary requires summary.results to be an array."
  );
  validateSelectionObjectArrayEntries(
    results,
    "Attempt handoff finalization target summary requires summary.results entries to be objects."
  );
  validateSelectionArray(
    invokedResults,
    "Attempt handoff finalization target summary requires summary.invokedResults to be an array."
  );
  validateSelectionObjectArrayEntries(
    invokedResults,
    "Attempt handoff finalization target summary requires summary.invokedResults entries to be objects."
  );
  validateSelectionArray(
    blockedResults,
    "Attempt handoff finalization target summary requires summary.blockedResults to be an array."
  );
  validateSelectionObjectArrayEntries(
    blockedResults,
    "Attempt handoff finalization target summary requires summary.blockedResults entries to be objects."
  );

  const explanationResults = results as AttemptHandoffExplanationSummary["results"];
  const explanationInvokedResults =
    invokedResults as AttemptHandoffExplanationSummary["invokedResults"];
  const explanationBlockedResults =
    blockedResults as AttemptHandoffExplanationSummary["blockedResults"];

  const canonicalSummary = deriveAttemptHandoffExplanationSummary({
    reportBasis: "promotion_target_apply_batch",
    results: explanationResults.map((entry) => ({
      handoffTarget: entry.handoffTarget,
      targetApply: entry.targetApply
    })),
    invokedResults: explanationInvokedResults.map((entry) => ({
      handoffTarget: entry.handoffTarget,
      targetApply: entry.targetApply
    })),
    blockedResults: explanationBlockedResults.map((entry) => ({
      handoffTarget: entry.handoffTarget,
      targetApply: entry.targetApply
    }))
  });

  if (canonicalSummary === undefined) {
    throw new ValidationError(
      "Attempt handoff finalization target summary requires summary.results to produce a canonical explanation summary."
    );
  }

  if (!explanationEntryArraysEqual(explanationResults, canonicalSummary.results)) {
    throw new ValidationError(
      "Attempt handoff finalization target summary requires summary.results to match the canonical explanation summary."
    );
  }

  if (
    !explanationEntryArraysEqual(
      explanationInvokedResults,
      canonicalSummary.invokedResults
    ) ||
    !explanationEntryArraysEqual(
      explanationBlockedResults,
      canonicalSummary.blockedResults
    )
  ) {
    throw new ValidationError(
      "Attempt handoff finalization target summary requires summary subgroup projections to match the canonical explanation summary."
    );
  }

  return canonicalSummary;
}

function explanationEntryArraysEqual(
  left: AttemptHandoffExplanationSummary["results"] | unknown,
  right: AttemptHandoffExplanationSummary["results"]
): boolean {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every(
      (entry, index) =>
        hasOwnIndex(left, index) &&
        hasOwnIndex(right, index) &&
        explanationEntryEqual(
          entry as AttemptHandoffExplanationSummary["results"][number],
          right[index] as AttemptHandoffExplanationSummary["results"][number]
        )
    )
  );
}

function explanationEntryEqual(
  left: AttemptHandoffExplanationSummary["results"][number],
  right: AttemptHandoffExplanationSummary["results"][number]
): boolean {
  return (
    left.explanationCode === right.explanationCode &&
    left.invoked === right.invoked &&
    stringArraysEqual(left.blockingReasons, right.blockingReasons) &&
    left.handoffTarget.handoffBasis === right.handoffTarget.handoffBasis &&
    normalizeComparableString(left.handoffTarget.taskId) ===
      normalizeComparableString(right.handoffTarget.taskId) &&
    normalizeComparableString(left.handoffTarget.attemptId) ===
      normalizeComparableString(right.handoffTarget.attemptId) &&
    normalizeComparableString(left.handoffTarget.runtime) ===
      normalizeComparableString(right.handoffTarget.runtime) &&
    left.handoffTarget.status === right.handoffTarget.status &&
    left.handoffTarget.sourceKind === right.handoffTarget.sourceKind &&
    normalizeComparableString(left.targetApply.request.taskId) ===
      normalizeComparableString(right.targetApply.request.taskId) &&
    normalizeComparableString(left.targetApply.request.attemptId) ===
      normalizeComparableString(right.targetApply.request.attemptId) &&
    normalizeComparableString(left.targetApply.request.runtime) ===
      normalizeComparableString(right.targetApply.request.runtime) &&
    left.targetApply.request.status === right.targetApply.request.status &&
    left.targetApply.request.sourceKind === right.targetApply.request.sourceKind &&
    normalizeComparableString(left.targetApply.apply.consumer.request.taskId) ===
      normalizeComparableString(right.targetApply.apply.consumer.request.taskId) &&
    normalizeComparableString(
      left.targetApply.apply.consumer.request.attemptId
    ) ===
      normalizeComparableString(
        right.targetApply.apply.consumer.request.attemptId
      ) &&
    normalizeComparableString(left.targetApply.apply.consumer.request.runtime) ===
      normalizeComparableString(
        right.targetApply.apply.consumer.request.runtime
      ) &&
    left.targetApply.apply.consumer.request.status ===
      right.targetApply.apply.consumer.request.status &&
    left.targetApply.apply.consumer.request.sourceKind ===
      right.targetApply.apply.consumer.request.sourceKind &&
    stringArraysEqual(
      left.targetApply.apply.consumer.readiness.blockingReasons,
      right.targetApply.apply.consumer.readiness.blockingReasons
    ) &&
    left.targetApply.apply.consumer.readiness.canConsumeHandoff ===
      right.targetApply.apply.consumer.readiness.canConsumeHandoff &&
    left.targetApply.apply.consumer.readiness.hasBlockingReasons ===
      right.targetApply.apply.consumer.readiness.hasBlockingReasons &&
    left.targetApply.apply.consumer.readiness.handoffSupported ===
      right.targetApply.apply.consumer.readiness.handoffSupported &&
    normalizeComparableString(left.targetApply.apply.consume.request.taskId) ===
      normalizeComparableString(right.targetApply.apply.consume.request.taskId) &&
    normalizeComparableString(left.targetApply.apply.consume.request.attemptId) ===
      normalizeComparableString(
        right.targetApply.apply.consume.request.attemptId
      ) &&
    normalizeComparableString(left.targetApply.apply.consume.request.runtime) ===
      normalizeComparableString(
        right.targetApply.apply.consume.request.runtime
      ) &&
    left.targetApply.apply.consume.request.status ===
      right.targetApply.apply.consume.request.status &&
    left.targetApply.apply.consume.request.sourceKind ===
      right.targetApply.apply.consume.request.sourceKind &&
    stringArraysEqual(
      left.targetApply.apply.consume.readiness.blockingReasons,
      right.targetApply.apply.consume.readiness.blockingReasons
    ) &&
    left.targetApply.apply.consume.readiness.canConsumeHandoff ===
      right.targetApply.apply.consume.readiness.canConsumeHandoff &&
    left.targetApply.apply.consume.readiness.hasBlockingReasons ===
      right.targetApply.apply.consume.readiness.hasBlockingReasons &&
    left.targetApply.apply.consume.readiness.handoffSupported ===
      right.targetApply.apply.consume.readiness.handoffSupported &&
    left.targetApply.apply.consume.invoked ===
      right.targetApply.apply.consume.invoked
  );
}

function stringArraysEqual(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (value, index) =>
        hasOwnIndex(left, index) &&
        hasOwnIndex(right, index) &&
        value === right[index]
    )
  );
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function normalizeComparableString(value: string): string {
  return value.trim();
}
