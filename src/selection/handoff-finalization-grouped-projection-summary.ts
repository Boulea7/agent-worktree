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
  AttemptHandoffFinalizationGroupedProjectionGroup,
  AttemptHandoffFinalizationGroupedProjectionSummary,
  AttemptHandoffFinalizationReportReady,
  AttemptHandoffFinalizationReportReadyEntry
} from "./types.js";

const attemptHandoffFinalizationGroupedProjectionBasis =
  "handoff_finalization_report_ready" as const;
const attemptHandoffFinalizationReportReadyBasis =
  "handoff_finalization_explanation_summary" as const;

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

export function deriveAttemptHandoffFinalizationGroupedProjectionSummary(
  summary: AttemptHandoffFinalizationReportReady | undefined
): AttemptHandoffFinalizationGroupedProjectionSummary | undefined {
  if (summary === undefined) {
    return undefined;
  }

  validateSummary(summary);

  const results = validateReportReadyEntryArray(summary.results, "summary.results");
  validateCanonicalSubgroups(summary, results);

  const groups = deriveGroups(results);

  return {
    groupedProjectionBasis: attemptHandoffFinalizationGroupedProjectionBasis,
    resultCount: results.length,
    invokedResultCount: results.filter((entry) => entry.invoked).length,
    blockedResultCount: results.filter((entry) => !entry.invoked).length,
    groups
  };
}

function validateSummary(summary: AttemptHandoffFinalizationReportReady): void {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped projection summary requires summary to be an object."
    );
  }

  if (summary.reportBasis !== attemptHandoffFinalizationReportReadyBasis) {
    throw new ValidationError(
      'Attempt handoff finalization grouped projection summary requires summary.reportBasis to be "handoff_finalization_explanation_summary".'
    );
  }

  if (!Array.isArray(summary.results)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped projection summary requires summary.results to be an array."
    );
  }
}

function validateCanonicalSubgroups(
  summary: AttemptHandoffFinalizationReportReady,
  results: readonly AttemptHandoffFinalizationReportReadyEntry[]
): void {
  const invokedResults = results.filter((entry) => entry.invoked);
  const blockedResults = results.filter((entry) => !entry.invoked);

  if (!reportReadyEntryArraysEqual(summary.invokedResults, invokedResults)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped projection summary requires summary.invokedResults to match the stable filtered invoked subgroup."
    );
  }

  if (!reportReadyEntryArraysEqual(summary.blockedResults, blockedResults)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped projection summary requires summary.blockedResults to match the stable filtered blocked subgroup."
    );
  }
}

function deriveGroups(
  results: readonly AttemptHandoffFinalizationReportReadyEntry[]
): AttemptHandoffFinalizationGroupedProjectionGroup[] {
  const groups = new Map<
    AttemptHandoffFinalizationExplanationCode,
    AttemptHandoffFinalizationGroupedProjectionGroup
  >();

  for (const entry of results) {
    const existing = groups.get(entry.explanationCode);

    if (existing === undefined) {
      groups.set(entry.explanationCode, {
        groupKey: entry.explanationCode,
        resultCount: 1,
        invokedResultCount: entry.invoked ? 1 : 0,
        blockedResultCount: entry.invoked ? 0 : 1,
        results: [cloneReportReadyEntry(entry)]
      });
      continue;
    }

    existing.resultCount += 1;
    existing.invokedResultCount += entry.invoked ? 1 : 0;
    existing.blockedResultCount += entry.invoked ? 0 : 1;
    existing.results.push(cloneReportReadyEntry(entry));
  }

  return [...groups.values()];
}

function validateReportReadyEntry(
  entry: AttemptHandoffFinalizationReportReadyEntry
): AttemptHandoffFinalizationReportReadyEntry {
  if (!isRecord(entry)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped projection summary requires summary.results entries to be objects."
    );
  }

  const taskId = normalizeRequiredString(entry.taskId, "entry.taskId");
  const attemptId = normalizeRequiredString(entry.attemptId, "entry.attemptId");
  const runtime = normalizeRequiredString(entry.runtime, "entry.runtime");
  validateAttemptStatus(entry.status, "entry.status");
  validateAttemptSourceKind(entry.sourceKind, "entry.sourceKind");
  validateBlockingReasons(entry.blockingReasons, "entry.blockingReasons");

  if (typeof entry.invoked !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization grouped projection summary requires entry.invoked to be a boolean."
    );
  }

  if (!validExplanationCodes.has(entry.explanationCode)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped projection summary requires entry.explanationCode to use the existing handoff-finalization explanation vocabulary."
    );
  }

  if (entry.invoked && entry.explanationCode !== "handoff_finalization_invoked") {
    throw new ValidationError(
      'Attempt handoff finalization grouped projection summary requires invoked entries to use "handoff_finalization_invoked".'
    );
  }

  if (
    !entry.invoked &&
    entry.explanationCode !== "handoff_finalization_blocked_unsupported"
  ) {
    throw new ValidationError(
      'Attempt handoff finalization grouped projection summary requires blocked entries to use "handoff_finalization_blocked_unsupported".'
    );
  }

  if (entry.invoked && entry.blockingReasons.length > 0) {
    throw new ValidationError(
      "Attempt handoff finalization grouped projection summary requires invoked entries to use empty blockingReasons."
    );
  }

  if (!entry.invoked && entry.blockingReasons.length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization grouped projection summary requires blocked entries to keep blockingReasons."
    );
  }

  return {
    taskId,
    attemptId,
    runtime,
    status: entry.status,
    sourceKind: entry.sourceKind,
    explanationCode: entry.explanationCode,
    invoked: entry.invoked,
    blockingReasons: [...entry.blockingReasons]
  };
}

function validateReportReadyEntryArray(
  entries: readonly AttemptHandoffFinalizationReportReadyEntry[],
  fieldName: string
): AttemptHandoffFinalizationReportReadyEntry[] {
  const validatedEntries: AttemptHandoffFinalizationReportReadyEntry[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    if (!hasOwnIndex(entries, index) || !isRecord(entries[index])) {
      throw new ValidationError(
        `Attempt handoff finalization grouped projection summary requires ${fieldName} entries to be objects.`
      );
    }

    validatedEntries.push(
      validateReportReadyEntry(
        entries[index] as AttemptHandoffFinalizationReportReadyEntry
      )
    );
  }

  return validatedEntries;
}

function cloneReportReadyEntry(
  entry: AttemptHandoffFinalizationReportReadyEntry
): AttemptHandoffFinalizationReportReadyEntry {
  return {
    taskId: entry.taskId,
    attemptId: entry.attemptId,
    runtime: entry.runtime,
    status: entry.status,
    sourceKind: entry.sourceKind,
    explanationCode: entry.explanationCode,
    invoked: entry.invoked,
    blockingReasons: [...entry.blockingReasons]
  };
}

function reportReadyEntryArraysEqual(
  left: readonly AttemptHandoffFinalizationReportReadyEntry[] | unknown,
  right: readonly AttemptHandoffFinalizationReportReadyEntry[]
): boolean {
  if (!Array.isArray(left) || left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (
      !hasOwnIndex(left, index) ||
      !hasOwnIndex(right, index) ||
      !isRecord(left[index]) ||
      !isRecord(right[index])
    ) {
      return false;
    }

    try {
      const entry = validateReportReadyEntry(
        left[index] as AttemptHandoffFinalizationReportReadyEntry
      );

      if (!reportReadyEntryEqual(entry, right[index]!)) {
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

function reportReadyEntryEqual(
  left: AttemptHandoffFinalizationReportReadyEntry,
  right: AttemptHandoffFinalizationReportReadyEntry
): boolean {
  return (
    normalizeComparableString(left.taskId) ===
      normalizeComparableString(right.taskId) &&
    normalizeComparableString(left.attemptId) ===
      normalizeComparableString(right.attemptId) &&
    normalizeComparableString(left.runtime) ===
      normalizeComparableString(right.runtime) &&
    left.status === right.status &&
    left.sourceKind === right.sourceKind &&
    left.explanationCode === right.explanationCode &&
    left.invoked === right.invoked &&
    stringArraysEqual(left.blockingReasons, right.blockingReasons)
  );
}

function validateAttemptStatus(value: unknown, fieldName: string): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      `Attempt handoff finalization grouped projection summary requires ${fieldName} to use the existing attempt status vocabulary.`
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
      `Attempt handoff finalization grouped projection summary requires ${fieldName} to use the existing attempt source-kind vocabulary when provided.`
    );
  }
}

function validateBlockingReasons(value: unknown, fieldName: string): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      `Attempt handoff finalization grouped projection summary requires ${fieldName} to be an array.`
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
        `Attempt handoff finalization grouped projection summary requires ${fieldName} to use the existing handoff-finalization blocker vocabulary.`
      );
    }
  }
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Attempt handoff finalization grouped projection summary requires ${fieldName} to be a non-empty string.`
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      `Attempt handoff finalization grouped projection summary requires ${fieldName} to be a non-empty string.`
    );
  }

  return normalized;
}

function normalizeComparableString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
