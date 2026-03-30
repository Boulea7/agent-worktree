import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptHandoffFinalizationConsumerBlockingReason,
  AttemptHandoffFinalizationExplanationCode,
  AttemptHandoffFinalizationExplanationEntry,
  AttemptHandoffFinalizationExplanationSummary,
  AttemptHandoffFinalizationReportReady,
  AttemptHandoffFinalizationReportReadyEntry
} from "./types.js";

const attemptHandoffFinalizationReportReadyBasis =
  "handoff_finalization_explanation_summary" as const;
const attemptHandoffFinalizationExplanationBasis =
  "handoff_finalization_outcome_summary" as const;

const validExplanationCodes = new Set<AttemptHandoffFinalizationExplanationCode>([
  "handoff_finalization_invoked",
  "handoff_finalization_blocked_unsupported"
]);
const validBlockingReasons =
  new Set<AttemptHandoffFinalizationConsumerBlockingReason>([
    "handoff_finalization_unsupported"
  ]);
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function deriveAttemptHandoffFinalizationReportReady(
  summary: AttemptHandoffFinalizationExplanationSummary | undefined
): AttemptHandoffFinalizationReportReady | undefined {
  if (summary === undefined) {
    return undefined;
  }

  validateSummaryBasis(summary);
  const results = validateExplanationEntryArray(summary.results, "summary.results");

  validateCanonicalSubgroups(summary, results);

  return {
    reportBasis: attemptHandoffFinalizationReportReadyBasis,
    results: results.map(deriveReportEntry),
    invokedResults: results
      .filter((entry) => entry.invoked)
      .map(deriveReportEntry),
    blockedResults: results
      .filter((entry) => !entry.invoked)
      .map(deriveReportEntry)
  };
}

function validateSummaryBasis(
  summary: AttemptHandoffFinalizationExplanationSummary
): void {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires summary to be an object."
    );
  }

  if (summary.explanationBasis !== attemptHandoffFinalizationExplanationBasis) {
    throw new ValidationError(
      'Attempt handoff finalization report-ready requires summary.explanationBasis to be "handoff_finalization_outcome_summary".'
    );
  }

  if (!Array.isArray(summary.results)) {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires summary.results to be an array."
    );
  }
}

function validateCanonicalSubgroups(
  summary: AttemptHandoffFinalizationExplanationSummary,
  results: readonly AttemptHandoffFinalizationExplanationEntry[]
): void {
  const invokedResults = results.filter((entry) => entry.invoked);
  const blockedResults = results.filter((entry) => !entry.invoked);

  if (!explanationEntryArraysEqual(summary.results, results)) {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires summary.results to match the canonical explanation results."
    );
  }

  if (!explanationEntryArraysEqual(summary.invokedResults, invokedResults)) {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires summary.invokedResults to match the stable filtered invoked subgroup."
    );
  }

  if (!explanationEntryArraysEqual(summary.blockedResults, blockedResults)) {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires summary.blockedResults to match the stable filtered blocked subgroup."
    );
  }
}

function validateExplanationEntry(
  entry: AttemptHandoffFinalizationExplanationEntry
): AttemptHandoffFinalizationExplanationEntry {
  if (!isRecord(entry)) {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires summary.results entries to be objects."
    );
  }

  const outcome = validateOutcome(entry.outcome);

  if (typeof entry.invoked !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires entry.invoked to be a boolean."
    );
  }

  validateBlockingReasons(entry.blockingReasons, "entry.blockingReasons");

  if (entry.invoked !== outcome.invoked) {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires entry.invoked to match entry.outcome.invoked."
    );
  }

  if (!stringArraysEqual(entry.blockingReasons, outcome.blockingReasons)) {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires entry.blockingReasons to match entry.outcome.blockingReasons."
    );
  }

  if (!validExplanationCodes.has(entry.explanationCode)) {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires entry.explanationCode to use the existing handoff-finalization explanation vocabulary."
    );
  }

  if (entry.invoked && entry.explanationCode !== "handoff_finalization_invoked") {
    throw new ValidationError(
      'Attempt handoff finalization report-ready requires invoked entries to use "handoff_finalization_invoked".'
    );
  }

  if (
    !entry.invoked &&
    entry.explanationCode !== "handoff_finalization_blocked_unsupported"
  ) {
    throw new ValidationError(
      'Attempt handoff finalization report-ready requires blocked entries to use "handoff_finalization_blocked_unsupported".'
    );
  }

  if (entry.invoked && entry.blockingReasons.length > 0) {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires invoked entries to use empty blockingReasons."
    );
  }

  if (!entry.invoked && entry.blockingReasons.length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires blocked entries to keep blockingReasons."
    );
  }

  return {
    outcome,
    explanationCode: entry.explanationCode,
    invoked: entry.invoked,
    blockingReasons: [...entry.blockingReasons]
  };
}

function validateOutcome(
  outcome: AttemptHandoffFinalizationExplanationEntry["outcome"]
): AttemptHandoffFinalizationExplanationEntry["outcome"] {
  if (!isRecord(outcome)) {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires entry.outcome to be an object."
    );
  }

  const taskId = normalizeRequiredString(outcome.taskId, "entry.outcome.taskId");
  const attemptId = normalizeRequiredString(
    outcome.attemptId,
    "entry.outcome.attemptId"
  );
  const runtime = normalizeRequiredString(outcome.runtime, "entry.outcome.runtime");
  validateAttemptStatus(outcome.status, "entry.outcome.status");
  validateAttemptSourceKind(outcome.sourceKind, "entry.outcome.sourceKind");

  if (typeof outcome.invoked !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization report-ready requires entry.outcome.invoked to be a boolean."
    );
  }

  validateBlockingReasons(
    outcome.blockingReasons,
    "entry.outcome.blockingReasons"
  );

  return {
    taskId,
    attemptId,
    runtime,
    status: outcome.status,
    sourceKind: outcome.sourceKind,
    invoked: outcome.invoked,
    blockingReasons: [...outcome.blockingReasons]
  };
}

function deriveReportEntry(
  entry: AttemptHandoffFinalizationExplanationEntry
): AttemptHandoffFinalizationReportReadyEntry {
  return {
    taskId: entry.outcome.taskId,
    attemptId: entry.outcome.attemptId,
    runtime: entry.outcome.runtime,
    status: entry.outcome.status,
    sourceKind: entry.outcome.sourceKind,
    explanationCode: entry.explanationCode,
    invoked: entry.invoked,
    blockingReasons: [...entry.blockingReasons]
  };
}

function validateExplanationEntryArray(
  entries: readonly AttemptHandoffFinalizationExplanationEntry[],
  fieldName: string
): AttemptHandoffFinalizationExplanationEntry[] {
  const validatedEntries: AttemptHandoffFinalizationExplanationEntry[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];

    if (!hasOwnIndex(entries, index) || !isRecord(entry)) {
      throw new ValidationError(
        `Attempt handoff finalization report-ready requires ${fieldName}[${index}] to be an object.`
      );
    }

    validatedEntries.push(validateExplanationEntry(entry));
  }

  return validatedEntries;
}

function explanationEntryArraysEqual(
  left: readonly AttemptHandoffFinalizationExplanationEntry[] | unknown,
  right: readonly AttemptHandoffFinalizationExplanationEntry[]
): boolean {
  if (!Array.isArray(left) || left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (!hasOwnIndex(left, index) || !isRecord(left[index])) {
      return false;
    }

    try {
      const entry = validateExplanationEntry(
        left[index] as AttemptHandoffFinalizationExplanationEntry
      );

      if (!explanationEntryEqual(entry, right[index]!)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function explanationEntryEqual(
  left: AttemptHandoffFinalizationExplanationEntry,
  right: AttemptHandoffFinalizationExplanationEntry
): boolean {
  return (
    left.explanationCode === right.explanationCode &&
    left.invoked === right.invoked &&
    stringArraysEqual(left.blockingReasons, right.blockingReasons) &&
    normalizeComparableString(left.outcome.taskId) ===
      normalizeComparableString(right.outcome.taskId) &&
    normalizeComparableString(left.outcome.attemptId) ===
      normalizeComparableString(right.outcome.attemptId) &&
    normalizeComparableString(left.outcome.runtime) ===
      normalizeComparableString(right.outcome.runtime) &&
    left.outcome.status === right.outcome.status &&
    left.outcome.sourceKind === right.outcome.sourceKind &&
    left.outcome.invoked === right.outcome.invoked &&
    stringArraysEqual(left.outcome.blockingReasons, right.outcome.blockingReasons)
  );
}

function validateBlockingReasons(value: unknown, fieldName: string): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      `Attempt handoff finalization report-ready requires ${fieldName} to be an array.`
    );
  }

  for (let index = 0; index < value.length; index += 1) {
    if (
      !hasOwnIndex(value, index) ||
      typeof value[index] !== "string" ||
      !validBlockingReasons.has(
        value[index] as AttemptHandoffFinalizationConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        `Attempt handoff finalization report-ready requires ${fieldName} to use the existing handoff-finalization blocker vocabulary.`
      );
    }
  }
}

function validateAttemptStatus(value: unknown, fieldName: string): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      `Attempt handoff finalization report-ready requires ${fieldName} to use the existing attempt status vocabulary.`
    );
  }
}

function validateAttemptSourceKind(value: unknown, fieldName: string): void {
  if (
    value !== undefined &&
    (typeof value !== "string" ||
      !validAttemptSourceKinds.has(value as AttemptSourceKind))
  ) {
    throw new ValidationError(
      `Attempt handoff finalization report-ready requires ${fieldName} to use the existing attempt source-kind vocabulary when provided.`
    );
  }
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Attempt handoff finalization report-ready requires ${fieldName} to be a non-empty string.`
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      `Attempt handoff finalization report-ready requires ${fieldName} to be a non-empty string.`
    );
  }

  return normalized;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
