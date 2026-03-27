import { ValidationError } from "../core/errors.js";
import { deriveAttemptHandoffReportReady } from "./handoff-report-ready.js";
import type {
  AttemptHandoffConsumerBlockingReason,
  AttemptHandoffExplanationCode,
  AttemptHandoffExplanationEntry,
  AttemptHandoffExplanationSummary,
  AttemptHandoffReportReady,
  AttemptHandoffReportReadyEntry
} from "./types.js";

const ATTEMPT_HANDOFF_EXPLANATION_BASIS = "handoff_report_ready" as const;
const ATTEMPT_HANDOFF_REPORT_READY_BASIS =
  "promotion_target_apply_batch" as const;

export function deriveAttemptHandoffExplanationSummary(
  report: AttemptHandoffReportReady | undefined
): AttemptHandoffExplanationSummary | undefined {
  if (report === undefined) {
    return undefined;
  }

  validateReportBasis(report);
  const canonicalReport = deriveAttemptHandoffReportReady({
    results: report.results
  });

  if (canonicalReport === undefined) {
    throw new ValidationError(
      "Attempt handoff explanation summary requires report.results to produce a canonical report-ready summary."
    );
  }

  validateCanonicalSubgroups(report, canonicalReport);

  const results = canonicalReport.results.map(deriveExplanationEntry);

  return {
    explanationBasis: ATTEMPT_HANDOFF_EXPLANATION_BASIS,
    results,
    invokedResults: results.filter((entry) => entry.invoked),
    blockedResults: results.filter((entry) => !entry.invoked)
  };
}

function validateReportBasis(report: AttemptHandoffReportReady): void {
  if (report.reportBasis !== ATTEMPT_HANDOFF_REPORT_READY_BASIS) {
    throw new ValidationError(
      'Attempt handoff explanation summary requires report.reportBasis to be "promotion_target_apply_batch".'
    );
  }
}

function validateCanonicalSubgroups(
  report: AttemptHandoffReportReady,
  canonicalReport: AttemptHandoffReportReady
): void {
  if (!reportEntryArraysEqual(report.results, canonicalReport.results)) {
    throw new ValidationError(
      "Attempt handoff explanation summary requires report.results to match the canonical report-ready results."
    );
  }

  if (
    !reportEntryArraysEqual(report.invokedResults, canonicalReport.invokedResults)
  ) {
    throw new ValidationError(
      "Attempt handoff explanation summary requires report.invokedResults to match the stable filtered invoked subgroup."
    );
  }

  if (
    !reportEntryArraysEqual(report.blockedResults, canonicalReport.blockedResults)
  ) {
    throw new ValidationError(
      "Attempt handoff explanation summary requires report.blockedResults to match the stable filtered blocked subgroup."
    );
  }
}

function deriveExplanationEntry(
  entry: AttemptHandoffReportReadyEntry
): AttemptHandoffExplanationEntry {
  const invoked = entry.targetApply.apply.consume.invoked;
  const blockingReasons = [
    ...entry.targetApply.apply.consumer.readiness.blockingReasons
  ];

  validateBlockingReasonsConsistency(entry, blockingReasons, invoked);

  return {
    handoffTarget: cloneHandoffTarget(entry),
    targetApply: cloneTargetApply(entry),
    explanationCode: invoked
      ? "handoff_invoked"
      : "handoff_blocked_unsupported",
    invoked,
    blockingReasons
  };
}

function validateBlockingReasonsConsistency(
  entry: AttemptHandoffReportReadyEntry,
  blockingReasons: AttemptHandoffConsumerBlockingReason[],
  invoked: boolean
): void {
  const consumeBlockingReasons =
    entry.targetApply.apply.consume.readiness.blockingReasons;

  if (!stringArraysEqual(blockingReasons, consumeBlockingReasons)) {
    throw new ValidationError(
      "Attempt handoff explanation summary requires consumer and consume blockingReasons to match."
    );
  }

  if (invoked && blockingReasons.length > 0) {
    throw new ValidationError(
      "Attempt handoff explanation summary requires invoked entries to use empty blockingReasons."
    );
  }

  if (!invoked && blockingReasons.length === 0) {
    throw new ValidationError(
      "Attempt handoff explanation summary requires blocked entries to keep blockingReasons."
    );
  }
}

function cloneHandoffTarget(
  entry: AttemptHandoffReportReadyEntry
): AttemptHandoffReportReadyEntry["handoffTarget"] {
  return {
    handoffBasis: entry.handoffTarget.handoffBasis,
    taskId: entry.handoffTarget.taskId,
    attemptId: entry.handoffTarget.attemptId,
    runtime: entry.handoffTarget.runtime,
    status: entry.handoffTarget.status,
    sourceKind: entry.handoffTarget.sourceKind
  };
}

function cloneTargetApply(
  entry: AttemptHandoffReportReadyEntry
): AttemptHandoffReportReadyEntry["targetApply"] {
  return {
    request: {
      taskId: entry.targetApply.request.taskId,
      attemptId: entry.targetApply.request.attemptId,
      runtime: entry.targetApply.request.runtime,
      status: entry.targetApply.request.status,
      sourceKind: entry.targetApply.request.sourceKind
    },
    apply: {
      consumer: {
        request: {
          taskId: entry.targetApply.apply.consumer.request.taskId,
          attemptId: entry.targetApply.apply.consumer.request.attemptId,
          runtime: entry.targetApply.apply.consumer.request.runtime,
          status: entry.targetApply.apply.consumer.request.status,
          sourceKind: entry.targetApply.apply.consumer.request.sourceKind
        },
        readiness: {
          blockingReasons: [
            ...entry.targetApply.apply.consumer.readiness.blockingReasons
          ],
          canConsumeHandoff:
            entry.targetApply.apply.consumer.readiness.canConsumeHandoff,
          hasBlockingReasons:
            entry.targetApply.apply.consumer.readiness.hasBlockingReasons,
          handoffSupported:
            entry.targetApply.apply.consumer.readiness.handoffSupported
        }
      },
      consume: {
        request: {
          taskId: entry.targetApply.apply.consume.request.taskId,
          attemptId: entry.targetApply.apply.consume.request.attemptId,
          runtime: entry.targetApply.apply.consume.request.runtime,
          status: entry.targetApply.apply.consume.request.status,
          sourceKind: entry.targetApply.apply.consume.request.sourceKind
        },
        readiness: {
          blockingReasons: [
            ...entry.targetApply.apply.consume.readiness.blockingReasons
          ],
          canConsumeHandoff:
            entry.targetApply.apply.consume.readiness.canConsumeHandoff,
          hasBlockingReasons:
            entry.targetApply.apply.consume.readiness.hasBlockingReasons,
          handoffSupported:
            entry.targetApply.apply.consume.readiness.handoffSupported
        },
        invoked: entry.targetApply.apply.consume.invoked
      }
    }
  };
}

function reportEntryArraysEqual(
  left: readonly AttemptHandoffReportReadyEntry[] | unknown,
  right: readonly AttemptHandoffReportReadyEntry[]
): boolean {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((entry, index) =>
      reportEntryEqual(entry as AttemptHandoffReportReadyEntry, right[index]!)
    )
  );
}

function reportEntryEqual(
  left: AttemptHandoffReportReadyEntry,
  right: AttemptHandoffReportReadyEntry
): boolean {
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
  left: AttemptHandoffReportReadyEntry["targetApply"]["apply"]["consumer"]["readiness"],
  right: AttemptHandoffReportReadyEntry["targetApply"]["apply"]["consumer"]["readiness"]
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
