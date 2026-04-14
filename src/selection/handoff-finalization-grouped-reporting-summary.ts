import { ValidationError } from "../core/errors.js";
import { readSelectionValue } from "./entry-validation.js";
import {
  validateDownstreamSingleTaskBoundary,
  validateDownstreamUniqueIdentity
} from "./downstream-identity-guardrails.js";
import { validateAndCloneAttemptHandoffFinalizationReportReadyEntry } from "./handoff-finalization-report-ready-entry-shared.js";
import type {
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

export function deriveAttemptHandoffFinalizationGroupedReportingSummary(
  summary: AttemptHandoffFinalizationGroupedProjectionSummary | undefined
): AttemptHandoffFinalizationGroupedReportingSummary | undefined {
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
      "Attempt handoff finalization grouped reporting summary requires summary.resultCount to match the canonical total derived from summary.groups."
    );
  }

  if (normalizedSummary.invokedResultCount !== invokedResultCount) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting summary requires summary.invokedResultCount to match the canonical invoked total derived from summary.groups."
    );
  }

  if (normalizedSummary.blockedResultCount !== blockedResultCount) {
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

function normalizeSummary(
  summary: AttemptHandoffFinalizationGroupedProjectionSummary
): {
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  groups: readonly AttemptHandoffFinalizationGroupedProjectionGroup[];
} {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting summary requires summary to be an object."
    );
  }

  if (
    readSelectionValue(
      summary,
      "groupedProjectionBasis",
      'Attempt handoff finalization grouped reporting summary requires summary.groupedProjectionBasis to be "handoff_finalization_report_ready".'
    ) !== attemptHandoffFinalizationGroupedProjectionBasis
  ) {
    throw new ValidationError(
      'Attempt handoff finalization grouped reporting summary requires summary.groupedProjectionBasis to be "handoff_finalization_report_ready".'
    );
  }

  validateNonNegativeInteger(
    readSelectionValue(
      summary,
      "resultCount",
      "Attempt handoff finalization grouped reporting summary requires summary.resultCount to be a non-negative integer."
    ),
    "summary.resultCount"
  );
  validateNonNegativeInteger(
    readSelectionValue(
      summary,
      "invokedResultCount",
      "Attempt handoff finalization grouped reporting summary requires summary.invokedResultCount to be a non-negative integer."
    ),
    "summary.invokedResultCount"
  );
  validateNonNegativeInteger(
    readSelectionValue(
      summary,
      "blockedResultCount",
      "Attempt handoff finalization grouped reporting summary requires summary.blockedResultCount to be a non-negative integer."
    ),
    "summary.blockedResultCount"
  );

  const groups = readSelectionValue(
    summary,
    "groups",
    "Attempt handoff finalization grouped reporting summary requires summary.groups to be an array."
  );

  if (!Array.isArray(groups)) {
    throw new ValidationError(
      "Attempt handoff finalization grouped reporting summary requires summary.groups to be an array."
    );
  }

  return {
    resultCount: readSelectionValue(
      summary,
      "resultCount",
      "Attempt handoff finalization grouped reporting summary requires summary.resultCount to be a non-negative integer."
    ) as number,
    invokedResultCount: readSelectionValue(
      summary,
      "invokedResultCount",
      "Attempt handoff finalization grouped reporting summary requires summary.invokedResultCount to be a non-negative integer."
    ) as number,
    blockedResultCount: readSelectionValue(
      summary,
      "blockedResultCount",
      "Attempt handoff finalization grouped reporting summary requires summary.blockedResultCount to be a non-negative integer."
    ) as number,
    groups: groups as readonly AttemptHandoffFinalizationGroupedProjectionGroup[]
  };
}

function validateGroups(
  groups: readonly AttemptHandoffFinalizationGroupedProjectionGroup[]
): AttemptHandoffFinalizationGroupedReportingGroup[] {
  const validatedGroups: AttemptHandoffFinalizationGroupedReportingGroup[] = [];
  const seenGroupKeys = new Set<AttemptHandoffFinalizationExplanationCode>();
  const validatedEntries: AttemptHandoffFinalizationReportReadyEntry[] = [];

  for (let index = 0; index < groups.length; index += 1) {
    if (!hasOwnIndex(groups, index)) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires summary.groups entries to be objects."
      );
    }

    const group = readArrayEntry(
      groups,
      index,
      "Attempt handoff finalization grouped reporting summary requires summary.groups entries to be objects."
    );

    if (!isRecord(group)) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires summary.groups entries to be objects."
      );
    }

    const groupKey = readSelectionValue(
      group,
      "groupKey",
      "Attempt handoff finalization grouped reporting summary requires each groupKey to use the existing handoff-finalization explanation vocabulary."
    );
    validateGroupKey(groupKey);

    if (
      seenGroupKeys.has(groupKey as AttemptHandoffFinalizationExplanationCode)
    ) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires summary.groups to keep a single canonical group per explanation code."
      );
    }

    seenGroupKeys.add(groupKey as AttemptHandoffFinalizationExplanationCode);
    const resultCount = readSelectionValue(
      group,
      "resultCount",
      "Attempt handoff finalization grouped reporting summary requires group.resultCount to be a non-negative integer."
    );
    validateNonNegativeInteger(resultCount, "group.resultCount");
    validateNonNegativeInteger(
      readSelectionValue(
        group,
        "invokedResultCount",
        "Attempt handoff finalization grouped reporting summary requires group.invokedResultCount to be a non-negative integer."
      ),
      "group.invokedResultCount"
    );
    validateNonNegativeInteger(
      readSelectionValue(
        group,
        "blockedResultCount",
        "Attempt handoff finalization grouped reporting summary requires group.blockedResultCount to be a non-negative integer."
      ),
      "group.blockedResultCount"
    );

    const groupResults = readSelectionValue(
      group,
      "results",
      "Attempt handoff finalization grouped reporting summary requires each group results to be an array."
    );

    if (!Array.isArray(groupResults)) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires each group results to be an array."
      );
    }

    if (resultCount !== groupResults.length) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires each group resultCount to match group.results.length."
      );
    }

    const invokedResultCountValue = readSelectionValue(
      group,
      "invokedResultCount",
      "Attempt handoff finalization grouped reporting summary requires group.invokedResultCount to be a non-negative integer."
    ) as number;
    const blockedResultCountValue = readSelectionValue(
      group,
      "blockedResultCount",
      "Attempt handoff finalization grouped reporting summary requires group.blockedResultCount to be a non-negative integer."
    ) as number;

    if (invokedResultCountValue + blockedResultCountValue !== resultCount) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires each group count split to add up to group.resultCount."
      );
    }

    const results = validateGroupResults(
      groupKey as AttemptHandoffFinalizationExplanationCode,
      groupResults as AttemptHandoffFinalizationReportReadyEntry[]
    );
    validatedEntries.push(...results);
    const invokedResultCount = results.filter((entry) => entry.invoked).length;
    const blockedResultCount = results.length - invokedResultCount;

    if (invokedResultCountValue !== invokedResultCount) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires each group invokedResultCount to match the canonical invoked count derived from group.results."
      );
    }

    if (blockedResultCountValue !== blockedResultCount) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires each group blockedResultCount to match the canonical blocked count derived from group.results."
      );
    }

    validatedGroups.push({
      groupKey: groupKey as AttemptHandoffFinalizationExplanationCode,
      resultCount: resultCount as number,
      invokedResultCount: invokedResultCountValue,
      blockedResultCount: blockedResultCountValue
    });
  }

  validateDownstreamSingleTaskBoundary(
    validatedEntries,
    "Attempt handoff finalization grouped reporting summary requires summary.groups results from a single taskId."
  );
  validateDownstreamUniqueIdentity(
    validatedEntries,
    "Attempt handoff finalization grouped reporting summary requires summary.groups results to use unique (taskId, attemptId, runtime) identities."
  );

  return validatedGroups;
}

function validateGroupResults(
  groupKey: AttemptHandoffFinalizationExplanationCode,
  results: readonly AttemptHandoffFinalizationReportReadyEntry[]
): AttemptHandoffFinalizationReportReadyEntry[] {
  const validatedResults: AttemptHandoffFinalizationReportReadyEntry[] = [];

  for (let index = 0; index < results.length; index += 1) {
    if (!hasOwnIndex(results, index)) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires group.results entries to be objects."
      );
    }

    const resultEntry = readArrayEntry(
      results,
      index,
      "Attempt handoff finalization grouped reporting summary requires group.results entries to be objects."
    );

    if (!isRecord(resultEntry)) {
      throw new ValidationError(
        "Attempt handoff finalization grouped reporting summary requires group.results entries to be objects."
      );
    }

    const entry = validateReportReadyEntry(
      resultEntry as unknown as AttemptHandoffFinalizationReportReadyEntry
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
  return validateAndCloneAttemptHandoffFinalizationReportReadyEntry(
    entry,
    "Attempt handoff finalization grouped reporting summary"
  );
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
