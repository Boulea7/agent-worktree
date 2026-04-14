import { ValidationError } from "../core/errors.js";
import { readSelectionValue } from "./entry-validation.js";
import type {
  AttemptHandoffFinalizationExplanationCode,
  AttemptHandoffFinalizationGroupedReportingGroup,
  AttemptHandoffFinalizationGroupedReportingDispositionSummary,
  AttemptHandoffFinalizationGroupedReportingSummary
} from "./types.js";
import { deriveCanonicalHandoffFinalizationReportingDisposition } from "./handoff-finalization-reporting-disposition-shared.js";

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

  const normalizedSummary = normalizeSummary(summary);
  const groups = validateGroups(normalizedSummary.groups);

  const resultCount = groups.reduce((sum, group) => sum + group.resultCount, 0);
  const invokedResultCount = groups.reduce(
    (sum, group) => sum + group.invokedResultCount,
    0
  );
  const blockedResultCount = groups.reduce(
    (sum, group) => sum + group.blockedResultCount,
    0
  );

  if (normalizedSummary.resultCount !== resultCount) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting disposition summary requires summary.resultCount to match the canonical total derived from summary.groups."
    );
  }

  if (normalizedSummary.invokedResultCount !== invokedResultCount) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting disposition summary requires summary.invokedResultCount to match the canonical invoked total derived from summary.groups."
    );
  }

  if (normalizedSummary.blockedResultCount !== blockedResultCount) {
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
    reportingDisposition: deriveCanonicalHandoffFinalizationReportingDisposition(
      resultCount,
      invokedResultCount,
      blockedResultCount
    )
  };
}

function normalizeSummary(
  summary: AttemptHandoffFinalizationGroupedReportingSummary
): {
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  groups: readonly AttemptHandoffFinalizationGroupedReportingGroup[];
} {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting disposition summary requires summary to be an object."
    );
  }

  if (
    readSelectionValue(
      summary,
      "groupedReportingBasis",
      'Attempt handoff finalization grouped reporting disposition summary requires summary.groupedReportingBasis to be "handoff_finalization_grouped_projection_summary".'
    ) !== attemptHandoffFinalizationGroupedReportingBasis
  ) {
    throw new ValidationError(
      'Attempt handoff finalization grouped reporting disposition summary requires summary.groupedReportingBasis to be "handoff_finalization_grouped_projection_summary".'
    );
  }

  const resultCount = readSelectionValue(
    summary,
    "resultCount",
    "Attempt handoff finalization grouped reporting disposition summary requires summary.resultCount to be a non-negative integer."
  ) as number;
  validateNonNegativeInteger(resultCount, "summary.resultCount");
  const invokedResultCount = readSelectionValue(
    summary,
    "invokedResultCount",
    "Attempt handoff finalization grouped reporting disposition summary requires summary.invokedResultCount to be a non-negative integer."
  ) as number;
  validateNonNegativeInteger(
    invokedResultCount,
    "summary.invokedResultCount"
  );
  const blockedResultCount = readSelectionValue(
    summary,
    "blockedResultCount",
    "Attempt handoff finalization grouped reporting disposition summary requires summary.blockedResultCount to be a non-negative integer."
  ) as number;
  validateNonNegativeInteger(
    blockedResultCount,
    "summary.blockedResultCount"
  );

  if (
    invokedResultCount + blockedResultCount !==
    resultCount
  ) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting disposition summary requires summary count split to add up to summary.resultCount."
    );
  }

  const groups = readSelectionValue(
    summary,
    "groups",
    "Attempt handoff finalization grouped reporting disposition summary requires summary.groups to be an array."
  );

  if (!Array.isArray(groups)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting disposition summary requires summary.groups to be an array."
    );
  }

  return {
    resultCount,
    invokedResultCount,
    blockedResultCount,
    groups
  };
}

function validateGroups(
  groups: readonly AttemptHandoffFinalizationGroupedReportingGroup[]
): AttemptHandoffFinalizationGroupedReportingGroup[] {
  const validatedGroups: AttemptHandoffFinalizationGroupedReportingGroup[] = [];
  const seenGroupKeys = new Set<AttemptHandoffFinalizationExplanationCode>();

  for (let index = 0; index < groups.length; index += 1) {
    if (!hasOwnIndex(groups, index)) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting disposition summary requires summary.groups entries to be objects."
      );
    }

    const group = readArrayEntry(
      groups,
      index,
      "Attempt handoff finalization grouped reporting disposition summary requires summary.groups entries to be objects."
    );

    if (!isRecord(group)) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting disposition summary requires summary.groups entries to be objects."
      );
    }

    const groupKey = readSelectionValue(
      group,
      "groupKey",
      "Attempt handoff finalization grouped reporting disposition summary requires each groupKey to use the existing handoff-finalization explanation vocabulary."
    );
    validateGroupKey(groupKey);

    if (
      seenGroupKeys.has(groupKey as AttemptHandoffFinalizationExplanationCode)
    ) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting disposition summary requires summary.groups to keep a single canonical group per explanation code."
      );
    }

    seenGroupKeys.add(groupKey as AttemptHandoffFinalizationExplanationCode);
    const resultCount = readSelectionValue(
      group,
      "resultCount",
      "Attempt handoff finalization grouped reporting disposition summary requires group.resultCount to be a non-negative integer."
    );
    validateNonNegativeInteger(resultCount, "group.resultCount");
    validateNonNegativeInteger(
      readSelectionValue(
        group,
        "invokedResultCount",
        "Attempt handoff finalization grouped reporting disposition summary requires group.invokedResultCount to be a non-negative integer."
      ),
      "group.invokedResultCount"
    );
    validateNonNegativeInteger(
      readSelectionValue(
        group,
        "blockedResultCount",
        "Attempt handoff finalization grouped reporting disposition summary requires group.blockedResultCount to be a non-negative integer."
      ),
      "group.blockedResultCount"
    );

    const invokedResultCountValue = readSelectionValue(
      group,
      "invokedResultCount",
      "Attempt handoff finalization grouped reporting disposition summary requires group.invokedResultCount to be a non-negative integer."
    ) as number;
    const blockedResultCountValue = readSelectionValue(
      group,
      "blockedResultCount",
      "Attempt handoff finalization grouped reporting disposition summary requires group.blockedResultCount to be a non-negative integer."
    ) as number;

    if (invokedResultCountValue + blockedResultCountValue !== resultCount) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting disposition summary requires each group count split to add up to group.resultCount."
      );
    }

    validateGroupSemantics({
      groupKey: groupKey as AttemptHandoffFinalizationExplanationCode,
      resultCount: resultCount as number,
      invokedResultCount: invokedResultCountValue,
      blockedResultCount: blockedResultCountValue
    });

    validatedGroups.push({
      groupKey: groupKey as AttemptHandoffFinalizationExplanationCode,
      resultCount: resultCount as number,
      invokedResultCount: invokedResultCountValue,
      blockedResultCount: blockedResultCountValue
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

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function readArrayEntry(
  values: readonly unknown[],
  index: number,
  message: string
): unknown {
  try {
    return values[index];
  } catch {
    throw new ValidationError(message);
  }
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
