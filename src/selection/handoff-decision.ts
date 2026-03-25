import { ValidationError } from "../core/errors.js";
import { deriveAttemptHandoffExplanationSummary } from "./handoff-explanation.js";
import type {
  AttemptHandoffDecisionBlockingReason,
  AttemptHandoffDecisionSummary,
  AttemptHandoffExplanationEntry,
  AttemptHandoffExplanationSummary
} from "./types.js";

const ATTEMPT_HANDOFF_DECISION_BASIS =
  "handoff_explanation_summary" as const;
const ATTEMPT_HANDOFF_EXPLANATION_BASIS = "handoff_report_ready" as const;

export function deriveAttemptHandoffDecisionSummary(
  summary: AttemptHandoffExplanationSummary | undefined
): AttemptHandoffDecisionSummary | undefined {
  if (summary === undefined) {
    return undefined;
  }

  validateExplanationBasis(summary);

  const canonicalSummary = deriveAttemptHandoffExplanationSummary({
    reportBasis: "promotion_target_apply_batch",
    results: summary.results.map((entry) => ({
      handoffTarget: entry.handoffTarget,
      targetApply: entry.targetApply
    })),
    invokedResults: summary.results
      .filter((entry) => entry.invoked)
      .map((entry) => ({
        handoffTarget: entry.handoffTarget,
        targetApply: entry.targetApply
      })),
    blockedResults: summary.results
      .filter((entry) => !entry.invoked)
      .map((entry) => ({
        handoffTarget: entry.handoffTarget,
        targetApply: entry.targetApply
      }))
  });

  if (canonicalSummary === undefined) {
    throw new ValidationError(
      "Attempt handoff decision summary requires summary.results to produce a canonical explanation summary."
    );
  }

  validateCanonicalSummary(summary, canonicalSummary);

  const resultCount = canonicalSummary.results.length;
  const invokedResultCount = canonicalSummary.invokedResults.length;
  const blockedResultCount = canonicalSummary.blockedResults.length;
  const blockingReasons = deriveBlockingReasons(resultCount, invokedResultCount);

  return {
    decisionBasis: ATTEMPT_HANDOFF_DECISION_BASIS,
    resultCount,
    invokedResultCount,
    blockedResultCount,
    blockingReasons,
    canFinalizeHandoff: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0
  };
}

function validateExplanationBasis(
  summary: AttemptHandoffExplanationSummary
): void {
  if (summary.explanationBasis !== ATTEMPT_HANDOFF_EXPLANATION_BASIS) {
    throw new ValidationError(
      'Attempt handoff decision summary requires summary.explanationBasis to be "handoff_report_ready".'
    );
  }
}

function validateCanonicalSummary(
  summary: AttemptHandoffExplanationSummary,
  canonicalSummary: AttemptHandoffExplanationSummary
): void {
  if (!explanationEntryArraysEqual(summary.results, canonicalSummary.results)) {
    throw new ValidationError(
      "Attempt handoff decision summary requires summary.results to match the canonical explanation results."
    );
  }

  if (
    !explanationEntryArraysEqual(
      summary.invokedResults,
      canonicalSummary.invokedResults
    )
  ) {
    throw new ValidationError(
      "Attempt handoff decision summary requires summary.invokedResults to match the stable filtered invoked subgroup."
    );
  }

  if (
    !explanationEntryArraysEqual(
      summary.blockedResults,
      canonicalSummary.blockedResults
    )
  ) {
    throw new ValidationError(
      "Attempt handoff decision summary requires summary.blockedResults to match the stable filtered blocked subgroup."
    );
  }
}

function deriveBlockingReasons(
  resultCount: number,
  invokedResultCount: number
): AttemptHandoffDecisionBlockingReason[] {
  if (resultCount === 0) {
    return ["no_results"];
  }

  if (invokedResultCount > 0) {
    return [];
  }

  return ["handoff_unsupported"];
}

function explanationEntryArraysEqual(
  left: readonly AttemptHandoffExplanationEntry[] | unknown,
  right: readonly AttemptHandoffExplanationEntry[]
): boolean {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((entry, index) =>
      explanationEntryEqual(entry as AttemptHandoffExplanationEntry, right[index]!)
    )
  );
}

function explanationEntryEqual(
  left: AttemptHandoffExplanationEntry,
  right: AttemptHandoffExplanationEntry
): boolean {
  return (
    left.handoffTarget.handoffBasis === right.handoffTarget.handoffBasis &&
    left.handoffTarget.taskId === right.handoffTarget.taskId &&
    left.handoffTarget.attemptId === right.handoffTarget.attemptId &&
    left.handoffTarget.runtime === right.handoffTarget.runtime &&
    left.handoffTarget.status === right.handoffTarget.status &&
    left.handoffTarget.sourceKind === right.handoffTarget.sourceKind &&
    left.targetApply.request.taskId === right.targetApply.request.taskId &&
    left.targetApply.request.attemptId === right.targetApply.request.attemptId &&
    left.targetApply.request.runtime === right.targetApply.request.runtime &&
    left.targetApply.request.status === right.targetApply.request.status &&
    left.targetApply.request.sourceKind ===
      right.targetApply.request.sourceKind &&
    left.targetApply.apply.consumer.request.taskId ===
      right.targetApply.apply.consumer.request.taskId &&
    left.targetApply.apply.consumer.request.attemptId ===
      right.targetApply.apply.consumer.request.attemptId &&
    left.targetApply.apply.consumer.request.runtime ===
      right.targetApply.apply.consumer.request.runtime &&
    left.targetApply.apply.consumer.request.status ===
      right.targetApply.apply.consumer.request.status &&
    left.targetApply.apply.consumer.request.sourceKind ===
      right.targetApply.apply.consumer.request.sourceKind &&
    left.targetApply.apply.consume.request.taskId ===
      right.targetApply.apply.consume.request.taskId &&
    left.targetApply.apply.consume.request.attemptId ===
      right.targetApply.apply.consume.request.attemptId &&
    left.targetApply.apply.consume.request.runtime ===
      right.targetApply.apply.consume.request.runtime &&
    left.targetApply.apply.consume.request.status ===
      right.targetApply.apply.consume.request.status &&
    left.targetApply.apply.consume.request.sourceKind ===
      right.targetApply.apply.consume.request.sourceKind &&
    left.targetApply.apply.consume.invoked ===
      right.targetApply.apply.consume.invoked &&
    left.explanationCode === right.explanationCode &&
    left.invoked === right.invoked &&
    stringArraysEqual(left.blockingReasons, right.blockingReasons) &&
    readinessEqual(
      left.targetApply.apply.consumer.readiness,
      right.targetApply.apply.consumer.readiness
    ) &&
    readinessEqual(
      left.targetApply.apply.consume.readiness,
      right.targetApply.apply.consume.readiness
    )
  );
}

function readinessEqual(
  left: AttemptHandoffExplanationEntry["targetApply"]["apply"]["consumer"]["readiness"],
  right: AttemptHandoffExplanationEntry["targetApply"]["apply"]["consumer"]["readiness"]
): boolean {
  return (
    left.canConsumeHandoff === right.canConsumeHandoff &&
    left.hasBlockingReasons === right.hasBlockingReasons &&
    left.handoffSupported === right.handoffSupported &&
    stringArraysEqual(left.blockingReasons, right.blockingReasons)
  );
}

function stringArraysEqual(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
