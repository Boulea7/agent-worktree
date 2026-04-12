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
  AttemptHandoffFinalizationReportReady,
  AttemptHandoffFinalizationReportReadyEntry
} from "./types.js";

const attemptHandoffFinalizationGroupedProjectionBasis =
  "handoff_finalization_report_ready" as const;
const attemptHandoffFinalizationReportReadyBasis =
  "handoff_finalization_explanation_summary" as const;

export function deriveAttemptHandoffFinalizationGroupedProjectionSummary(
  summary: AttemptHandoffFinalizationReportReady | undefined
): AttemptHandoffFinalizationGroupedProjectionSummary | undefined {
  if (summary === undefined) {
    return undefined;
  }

  validateSummary(summary);

  const results = validateReportReadyEntryArray(summary.results, "summary.results");
  validateDownstreamSingleTaskBoundary(
    results,
    "Attempt handoff finalization grouped projection summary requires summary.results from a single taskId."
  );
  validateDownstreamUniqueIdentity(
    results,
    "Attempt handoff finalization grouped projection summary requires summary.results to use unique (taskId, attemptId, runtime) identities."
  );
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

  if (
    readSelectionValue(
      summary,
      "reportBasis",
      'Attempt handoff finalization grouped projection summary requires summary.reportBasis to be "handoff_finalization_explanation_summary".'
    ) !== attemptHandoffFinalizationReportReadyBasis
  ) {
    throw new ValidationError(
      'Attempt handoff finalization grouped projection summary requires summary.reportBasis to be "handoff_finalization_explanation_summary".'
    );
  }

  if (
    !Array.isArray(
      readSelectionValue(
        summary,
        "results",
        "Attempt handoff finalization grouped projection summary requires summary.results to be an array."
      )
    )
  ) {
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

  if (
    !reportReadyEntryArraysEqual(
      readSelectionValue(
        summary,
        "invokedResults",
        "Attempt handoff finalization grouped projection summary requires summary.invokedResults to match the stable filtered invoked subgroup."
      ),
      invokedResults
    )
  ) {
    throw new ValidationError(
      "Attempt handoff finalization grouped projection summary requires summary.invokedResults to match the stable filtered invoked subgroup."
    );
  }

  if (
    !reportReadyEntryArraysEqual(
      readSelectionValue(
        summary,
        "blockedResults",
        "Attempt handoff finalization grouped projection summary requires summary.blockedResults to match the stable filtered blocked subgroup."
      ),
      blockedResults
    )
  ) {
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
  return validateAndCloneAttemptHandoffFinalizationReportReadyEntry(
    entry,
    "Attempt handoff finalization grouped projection summary"
  );
}

function validateReportReadyEntryArray(
  entries: readonly AttemptHandoffFinalizationReportReadyEntry[],
  fieldName: string
): AttemptHandoffFinalizationReportReadyEntry[] {
  const validatedEntries: AttemptHandoffFinalizationReportReadyEntry[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    if (!hasOwnIndex(entries, index)) {
      throw new ValidationError(
        `Attempt handoff finalization grouped projection summary requires ${fieldName} entries to be objects.`
      );
    }

    const entry = readArrayEntry(
      entries,
      index,
      `Attempt handoff finalization grouped projection summary requires ${fieldName} entries to be objects.`
    );

    if (!isRecord(entry)) {
      throw new ValidationError(
        `Attempt handoff finalization grouped projection summary requires ${fieldName} entries to be objects.`
      );
    }

    validatedEntries.push(
      validateReportReadyEntry(
        entry as unknown as AttemptHandoffFinalizationReportReadyEntry
      )
    );
  }

  return validatedEntries;
}

function cloneReportReadyEntry(
  entry: AttemptHandoffFinalizationReportReadyEntry
): AttemptHandoffFinalizationReportReadyEntry {
  return validateAndCloneAttemptHandoffFinalizationReportReadyEntry(
    entry,
    "Attempt handoff finalization grouped projection summary"
  );
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
      !isRecord(
        readArrayEntry(
          left,
          index,
          "Attempt handoff finalization grouped projection summary requires summary results arrays to contain objects."
        )
      ) ||
      !isRecord(
        readArrayEntry(
          right,
          index,
          "Attempt handoff finalization grouped projection summary requires summary results arrays to contain objects."
        )
      )
    ) {
      return false;
    }

    try {
      const entry = validateReportReadyEntry(
        readArrayEntry(
          left,
          index,
          "Attempt handoff finalization grouped projection summary requires summary results arrays to contain objects."
        ) as AttemptHandoffFinalizationReportReadyEntry
      );

      if (
        !reportReadyEntryEqual(
          entry,
          readArrayEntry(
            right,
            index,
            "Attempt handoff finalization grouped projection summary requires summary results arrays to contain objects."
          ) as AttemptHandoffFinalizationReportReadyEntry
        )
      ) {
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
