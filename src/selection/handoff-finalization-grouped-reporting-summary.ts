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
  AttemptHandoffFinalizationGroupedReportingGroup,
  AttemptHandoffFinalizationGroupedReportingSummary,
  AttemptHandoffFinalizationReportReadyEntry
} from "./types.js";

const attemptHandoffFinalizationGroupedReportingBasis =
  "handoff_finalization_grouped_projection_summary" as const;
const attemptHandoffFinalizationGroupedProjectionBasis =
  "handoff_finalization_report_ready" as const;

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

export function deriveAttemptHandoffFinalizationGroupedReportingSummary(
  summary: AttemptHandoffFinalizationGroupedProjectionSummary | undefined
): AttemptHandoffFinalizationGroupedReportingSummary | undefined {
  if (summary === undefined) {
    return undefined;
  }

  validateSummary(summary);
  const groups = validateGroups(summary.groups);

  const resultCount = groups.reduce((sum, group) => sum + group.resultCount, 0);
  const invokedResultCount = groups.reduce(
    (sum, group) => sum + group.invokedResultCount,
    0
  );
  const blockedResultCount = groups.reduce(
    (sum, group) => sum + group.blockedResultCount,
    0
  );

  if (summary.resultCount !== resultCount) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting summary requires summary.resultCount to match the canonical total derived from summary.groups."
    );
  }

  if (summary.invokedResultCount !== invokedResultCount) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting summary requires summary.invokedResultCount to match the canonical invoked total derived from summary.groups."
    );
  }

  if (summary.blockedResultCount !== blockedResultCount) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting summary requires summary.blockedResultCount to match the canonical blocked total derived from summary.groups."
    );
  }

  return {
    groupedReportingBasis: attemptHandoffFinalizationGroupedReportingBasis,
    resultCount,
    invokedResultCount,
    blockedResultCount,
    groups
  };
}

function validateSummary(
  summary: AttemptHandoffFinalizationGroupedProjectionSummary
): void {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting summary requires summary to be an object."
    );
  }

  if (summary.groupedProjectionBasis !== attemptHandoffFinalizationGroupedProjectionBasis) {
    throw new ValidationError(
      'Attempt handoff finalization grouped reporting summary requires summary.groupedProjectionBasis to be "handoff_finalization_report_ready".'
    );
  }

  validateNonNegativeInteger(summary.resultCount, "summary.resultCount");
  validateNonNegativeInteger(
    summary.invokedResultCount,
    "summary.invokedResultCount"
  );
  validateNonNegativeInteger(
    summary.blockedResultCount,
    "summary.blockedResultCount"
  );

  if (!Array.isArray(summary.groups)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting summary requires summary.groups to be an array."
    );
  }
}

function validateGroups(
  groups: readonly AttemptHandoffFinalizationGroupedProjectionGroup[]
): AttemptHandoffFinalizationGroupedReportingGroup[] {
  const validatedGroups: AttemptHandoffFinalizationGroupedReportingGroup[] = [];
  const seenGroupKeys = new Set<AttemptHandoffFinalizationExplanationCode>();

  for (let index = 0; index < groups.length; index += 1) {
    if (!hasOwnIndex(groups, index) || !isRecord(groups[index])) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires summary.groups entries to be objects."
      );
    }

    const group = groups[index] as AttemptHandoffFinalizationGroupedProjectionGroup;
    validateGroupKey(group.groupKey);

    if (seenGroupKeys.has(group.groupKey)) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires summary.groups to keep a single canonical group per explanation code."
      );
    }

    seenGroupKeys.add(group.groupKey);
    validateNonNegativeInteger(group.resultCount, "group.resultCount");
    validateNonNegativeInteger(
      group.invokedResultCount,
      "group.invokedResultCount"
    );
    validateNonNegativeInteger(
      group.blockedResultCount,
      "group.blockedResultCount"
    );

    if (!Array.isArray(group.results)) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires each group results to be an array."
      );
    }

    if (group.resultCount !== group.results.length) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires each group resultCount to match group.results.length."
      );
    }

    if (group.invokedResultCount + group.blockedResultCount !== group.resultCount) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires each group count split to add up to group.resultCount."
      );
    }

    const results = validateGroupResults(group.groupKey, group.results);
    const invokedResultCount = results.filter((entry) => entry.invoked).length;
    const blockedResultCount = results.length - invokedResultCount;

    if (group.invokedResultCount !== invokedResultCount) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires each group invokedResultCount to match the canonical invoked count derived from group.results."
      );
    }

    if (group.blockedResultCount !== blockedResultCount) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires each group blockedResultCount to match the canonical blocked count derived from group.results."
      );
    }

    validatedGroups.push({
      groupKey: group.groupKey,
      resultCount: group.resultCount,
      invokedResultCount: group.invokedResultCount,
      blockedResultCount: group.blockedResultCount
    });
  }

  return validatedGroups;
}

function validateGroupResults(
  groupKey: AttemptHandoffFinalizationExplanationCode,
  results: readonly AttemptHandoffFinalizationReportReadyEntry[]
): AttemptHandoffFinalizationReportReadyEntry[] {
  const validatedResults: AttemptHandoffFinalizationReportReadyEntry[] = [];

  for (let index = 0; index < results.length; index += 1) {
    if (!hasOwnIndex(results, index) || !isRecord(results[index])) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires group.results entries to be objects."
      );
    }

    const entry = validateReportReadyEntry(
      results[index] as AttemptHandoffFinalizationReportReadyEntry
    );

    if (entry.explanationCode !== groupKey) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires each group result entry to match the groupKey explanation code."
      );
    }

    validatedResults.push(entry);
  }

  return validatedResults;
}

function validateReportReadyEntry(
  entry: AttemptHandoffFinalizationReportReadyEntry
): AttemptHandoffFinalizationReportReadyEntry {
  if (!isRecord(entry)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting summary requires group.results entries to be objects."
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
      "Attempt handoff finalization grouped reporting summary requires entry.invoked to be a boolean."
    );
  }

  validateGroupKey(entry.explanationCode);

  if (entry.invoked && entry.explanationCode !== "handoff_finalization_invoked") {
    throw new ValidationError(
      'Attempt handoff finalization grouped reporting summary requires invoked entries to use "handoff_finalization_invoked".'
    );
  }

  if (
    !entry.invoked &&
    entry.explanationCode !== "handoff_finalization_blocked_unsupported"
  ) {
    throw new ValidationError(
      'Attempt handoff finalization grouped reporting summary requires blocked entries to use "handoff_finalization_blocked_unsupported".'
    );
  }

  if (entry.invoked && entry.blockingReasons.length > 0) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting summary requires invoked entries to use empty blockingReasons."
    );
  }

  if (!entry.invoked && entry.blockingReasons.length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting summary requires blocked entries to keep blockingReasons."
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

function validateGroupKey(value: unknown): void {
  if (
    typeof value !== "string" ||
    !validExplanationCodes.has(value as AttemptHandoffFinalizationExplanationCode)
  ) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting summary requires each groupKey to use the existing handoff-finalization explanation vocabulary."
    );
  }
}

function validateNonNegativeInteger(value: unknown, fieldName: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(
      `Attempt handoff finalization grouped reporting summary requires ${fieldName} to be a non-negative integer.`
    );
  }
}

function validateAttemptStatus(value: unknown, fieldName: string): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      `Attempt handoff finalization grouped reporting summary requires ${fieldName} to use the existing attempt status vocabulary.`
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
      `Attempt handoff finalization grouped reporting summary requires ${fieldName} to use the existing attempt source-kind vocabulary when provided.`
    );
  }
}

function validateBlockingReasons(value: unknown, fieldName: string): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      `Attempt handoff finalization grouped reporting summary requires ${fieldName} to be an array.`
    );
  }

  if (
    value.some(
      (reason) =>
        typeof reason !== "string" ||
        !validBlockingReasons.has(
          reason as AttemptHandoffFinalizationConsumerBlockingReason
        )
    )
  ) {
    throw new ValidationError(
      `Attempt handoff finalization grouped reporting summary requires ${fieldName} to use the existing handoff-finalization blocker vocabulary.`
    );
  }
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Attempt handoff finalization grouped reporting summary requires ${fieldName} to be a non-empty string.`
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      `Attempt handoff finalization grouped reporting summary requires ${fieldName} to be a non-empty string.`
    );
  }

  return normalized;
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
