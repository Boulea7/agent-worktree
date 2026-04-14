import { ValidationError } from "../core/errors.js";
import {
  accessSelectionValue,
  rethrowSelectionAccessError,
  validateSelectionArray,
  validateSelectionObjectArrayEntries,
  validateSelectionObjectInput
} from "./entry-validation.js";
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

  try {
    validateSelectionObjectInput(
      summary,
      "Attempt handoff decision summary requires summary to be an object."
    );

    const normalizedSummary = normalizeExplanationSummary(summary);
    const canonicalSummary = deriveAttemptHandoffExplanationSummary({
      reportBasis: "promotion_target_apply_batch",
      results: normalizedSummary.results.map((entry) => ({
        handoffTarget: entry.handoffTarget,
        targetApply: entry.targetApply
      })),
      invokedResults: normalizedSummary.results
        .filter((entry) => entry.invoked)
        .map((entry) => ({
          handoffTarget: entry.handoffTarget,
          targetApply: entry.targetApply
        })),
      blockedResults: normalizedSummary.results
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

    validateCanonicalSummary(normalizedSummary, canonicalSummary);

    const resultCount = canonicalSummary.results.length;
    const invokedResultCount = canonicalSummary.invokedResults.length;
    const blockedResultCount = canonicalSummary.blockedResults.length;
    const blockingReasons = deriveBlockingReasons(
      resultCount,
      invokedResultCount
    );

    return {
      decisionBasis: ATTEMPT_HANDOFF_DECISION_BASIS,
      resultCount,
      invokedResultCount,
      blockedResultCount,
      blockingReasons,
      canFinalizeHandoff: blockingReasons.length === 0,
      hasBlockingReasons: blockingReasons.length > 0
    };
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt handoff decision summary requires summary to be a readable object."
    );
  }
}

function normalizeExplanationSummary(
  summary: Record<string, unknown>
): AttemptHandoffExplanationSummary {
  const explanationBasis = accessSelectionValue(summary, "explanationBasis");
  const results = normalizeSummarySubgroupEntries(
    accessSelectionValue(summary, "results"),
    "summary.results"
  );
  const invokedResults = normalizeSummarySubgroupEntries(
    accessSelectionValue(summary, "invokedResults"),
    "summary.invokedResults"
  );
  const blockedResults = normalizeSummarySubgroupEntries(
    accessSelectionValue(summary, "blockedResults"),
    "summary.blockedResults"
  );

  validateExplanationBasis(explanationBasis);

  return {
    explanationBasis: ATTEMPT_HANDOFF_EXPLANATION_BASIS,
    results: results as AttemptHandoffExplanationEntry[],
    invokedResults: invokedResults as AttemptHandoffExplanationEntry[],
    blockedResults: blockedResults as AttemptHandoffExplanationEntry[]
  };
}

function validateExplanationBasis(explanationBasis: unknown): void {
  if (explanationBasis !== ATTEMPT_HANDOFF_EXPLANATION_BASIS) {
    throw new ValidationError(
      'Attempt handoff decision summary requires summary.explanationBasis to be "handoff_report_ready".'
    );
  }
}

function normalizeSummarySubgroupEntries(
  value: unknown,
  fieldName:
    | "summary.results"
    | "summary.invokedResults"
    | "summary.blockedResults"
): readonly unknown[] {
  validateSelectionArray(
    value,
    `Attempt handoff decision summary requires ${fieldName} to be an array.`
  );
  validateSelectionObjectArrayEntries(
    value,
    `Attempt handoff decision summary requires ${fieldName} entries to be objects.`
  );
  return value;
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
    left.every(
      (entry, index) =>
        hasOwnIndex(left, index) &&
        hasOwnIndex(right, index) &&
        explanationEntryEqual(
          entry as AttemptHandoffExplanationEntry,
          right[index] as AttemptHandoffExplanationEntry
        )
    )
  );
}

function explanationEntryEqual(
  left: AttemptHandoffExplanationEntry,
  right: AttemptHandoffExplanationEntry
): boolean {
  if (!isComparableExplanationEntry(left) || !isComparableExplanationEntry(right)) {
    return false;
  }

  return (
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
    left.targetApply.request.sourceKind ===
      right.targetApply.request.sourceKind &&
    normalizeComparableString(left.targetApply.apply.consumer.request.taskId) ===
      normalizeComparableString(right.targetApply.apply.consumer.request.taskId) &&
    normalizeComparableString(
      left.targetApply.apply.consumer.request.attemptId
    ) ===
      normalizeComparableString(
        right.targetApply.apply.consumer.request.attemptId
      ) &&
    normalizeComparableString(left.targetApply.apply.consumer.request.runtime) ===
      normalizeComparableString(right.targetApply.apply.consumer.request.runtime) &&
    left.targetApply.apply.consumer.request.status ===
      right.targetApply.apply.consumer.request.status &&
    left.targetApply.apply.consumer.request.sourceKind ===
      right.targetApply.apply.consumer.request.sourceKind &&
    normalizeComparableString(left.targetApply.apply.consume.request.taskId) ===
      normalizeComparableString(right.targetApply.apply.consume.request.taskId) &&
    normalizeComparableString(
      left.targetApply.apply.consume.request.attemptId
    ) ===
      normalizeComparableString(
        right.targetApply.apply.consume.request.attemptId
      ) &&
    normalizeComparableString(left.targetApply.apply.consume.request.runtime) ===
      normalizeComparableString(right.targetApply.apply.consume.request.runtime) &&
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

function isComparableExplanationEntry(
  value: unknown
): value is AttemptHandoffExplanationEntry {
  if (
    !isRecord(value) ||
    !isRecord(value.handoffTarget) ||
    !isRecord(value.targetApply) ||
    !Array.isArray(value.blockingReasons)
  ) {
    return false;
  }

  if (
    !isComparableRequest(value.targetApply.request) ||
    !isRecord(value.targetApply.apply) ||
    !isRecord(value.targetApply.apply.consumer) ||
    !isRecord(value.targetApply.apply.consume)
  ) {
    return false;
  }

  return (
    typeof value.explanationCode === "string" &&
    typeof value.invoked === "boolean" &&
    isComparableRequest(value.targetApply.apply.consumer.request) &&
    isComparableReadiness(value.targetApply.apply.consumer.readiness) &&
    isComparableRequest(value.targetApply.apply.consume.request) &&
    isComparableReadiness(value.targetApply.apply.consume.readiness) &&
    typeof value.targetApply.apply.consume.invoked === "boolean"
  );
}

function isComparableRequest(value: unknown): boolean {
  return isRecord(value);
}

function isComparableReadiness(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.blockingReasons);
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

function normalizeComparableString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
