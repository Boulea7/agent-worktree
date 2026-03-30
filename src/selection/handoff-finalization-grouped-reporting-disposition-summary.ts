import { ValidationError } from "../core/errors.js";
import type {
  AttemptHandoffFinalizationExplanationCode,
  AttemptHandoffFinalizationGroupedReportingGroup,
  AttemptHandoffFinalizationGroupedReportingDispositionSummary,
  AttemptHandoffFinalizationGroupedReportingSummary
} from "./types.js";

const attemptHandoffFinalizationGroupedReportingDispositionBasis =
  "handoff_finalization_grouped_reporting_summary" as const;
const attemptHandoffFinalizationGroupedReportingBasis =
  "handoff_finalization_grouped_projection_summary" as const;

const validExplanationCodes = new Set<AttemptHandoffFinalizationExplanationCode>([
  "handoff_finalization_invoked",
  "handoff_finalization_blocked_unsupported"
]);

export function deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary(
  summary: AttemptHandoffFinalizationGroupedReportingSummary | undefined
): AttemptHandoffFinalizationGroupedReportingDispositionSummary | undefined {
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
      "Attempt handoff finalization grouped reporting disposition summary requires summary.resultCount to match the canonical total derived from summary.groups."
    );
  }

  if (summary.invokedResultCount !== invokedResultCount) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting disposition summary requires summary.invokedResultCount to match the canonical invoked total derived from summary.groups."
    );
  }

  if (summary.blockedResultCount !== blockedResultCount) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting disposition summary requires summary.blockedResultCount to match the canonical blocked total derived from summary.groups."
    );
  }

  return {
    groupedReportingDispositionBasis:
      attemptHandoffFinalizationGroupedReportingDispositionBasis,
    resultCount,
    invokedResultCount,
    blockedResultCount,
    groupCount: groups.length,
    reportingDisposition: deriveReportingDisposition(
      resultCount,
      invokedResultCount,
      blockedResultCount
    )
  };
}

function validateSummary(
  summary: AttemptHandoffFinalizationGroupedReportingSummary
): void {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting disposition summary requires summary to be an object."
    );
  }

  if (summary.groupedReportingBasis !== attemptHandoffFinalizationGroupedReportingBasis) {
    throw new ValidationError(
      'Attempt handoff finalization grouped reporting disposition summary requires summary.groupedReportingBasis to be "handoff_finalization_grouped_projection_summary".'
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

  if (
    summary.invokedResultCount + summary.blockedResultCount !==
    summary.resultCount
  ) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting disposition summary requires summary count split to add up to summary.resultCount."
    );
  }

  if (!Array.isArray(summary.groups)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting disposition summary requires summary.groups to be an array."
    );
  }
}

function validateGroups(
  groups: readonly AttemptHandoffFinalizationGroupedReportingGroup[]
): AttemptHandoffFinalizationGroupedReportingGroup[] {
  const validatedGroups: AttemptHandoffFinalizationGroupedReportingGroup[] = [];
  const seenGroupKeys = new Set<AttemptHandoffFinalizationExplanationCode>();

  for (let index = 0; index < groups.length; index += 1) {
    if (!hasOwnIndex(groups, index) || !isRecord(groups[index])) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting disposition summary requires summary.groups entries to be objects."
      );
    }

    const group = groups[index] as AttemptHandoffFinalizationGroupedReportingGroup;
    validateGroupKey(group.groupKey);

    if (seenGroupKeys.has(group.groupKey)) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting disposition summary requires summary.groups to keep a single canonical group per explanation code."
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

    if (group.invokedResultCount + group.blockedResultCount !== group.resultCount) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting disposition summary requires each group count split to add up to group.resultCount."
      );
    }

    validateGroupSemantics(group);

    validatedGroups.push({
      groupKey: group.groupKey,
      resultCount: group.resultCount,
      invokedResultCount: group.invokedResultCount,
      blockedResultCount: group.blockedResultCount
    });
  }

  return validatedGroups;
}

function validateGroupKey(value: unknown): void {
  if (
    typeof value !== "string" ||
    !validExplanationCodes.has(value as AttemptHandoffFinalizationExplanationCode)
  ) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting disposition summary requires each groupKey to use the existing handoff-finalization explanation vocabulary."
    );
  }
}

function validateGroupSemantics(
  group: AttemptHandoffFinalizationGroupedReportingGroup
): void {
  if (
    group.groupKey === "handoff_finalization_invoked" &&
    (group.invokedResultCount !== group.resultCount || group.blockedResultCount !== 0)
  ) {
    throw new ValidationError(
      'Attempt handoff finalization grouped reporting disposition summary requires "handoff_finalization_invoked" groups to keep all results invoked.'
    );
  }

  if (
    group.groupKey === "handoff_finalization_blocked_unsupported" &&
    (group.blockedResultCount !== group.resultCount || group.invokedResultCount !== 0)
  ) {
    throw new ValidationError(
      'Attempt handoff finalization grouped reporting disposition summary requires "handoff_finalization_blocked_unsupported" groups to keep all results blocked.'
    );
  }
}

function deriveReportingDisposition(
  resultCount: number,
  invokedResultCount: number,
  blockedResultCount: number
): AttemptHandoffFinalizationGroupedReportingDispositionSummary["reportingDisposition"] {
  if (resultCount === 0) {
    return "empty";
  }

  if (invokedResultCount === resultCount) {
    return "all_invoked";
  }

  if (blockedResultCount === resultCount) {
    return "all_blocked";
  }

  return "mixed";
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function validateNonNegativeInteger(value: unknown, fieldName: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(
      `Attempt handoff finalization grouped reporting disposition summary requires ${fieldName} to be a non-negative integer.`
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
