import { ValidationError } from "../core/errors.js";
import { readSelectionValue } from "./entry-validation.js";
import type {
  AttemptHandoffFinalizationClosureSummary,
  AttemptHandoffFinalizationGroupedReportingDispositionSummary
} from "./types.js";
import {
  deriveCanonicalHandoffFinalizationGroupCount,
  deriveCanonicalHandoffFinalizationReportingDisposition,
  validateHandoffFinalizationReportingDisposition
} from "./handoff-finalization-reporting-disposition-shared.js";

const attemptHandoffFinalizationClosureBasis =
  "handoff_finalization_grouped_reporting_disposition_summary" as const;
const attemptHandoffFinalizationGroupedReportingDispositionBasis =
  "handoff_finalization_grouped_reporting_summary" as const;
export function deriveAttemptHandoffFinalizationClosureSummary(
  summary: AttemptHandoffFinalizationGroupedReportingDispositionSummary | undefined
): AttemptHandoffFinalizationClosureSummary | undefined {
  if (summary === undefined) {
    return undefined;
  }

  const normalizedSummary = validateSummary(summary);

  const hasResults = normalizedSummary.resultCount > 0;
  const allResultsInvoked =
    hasResults &&
    normalizedSummary.invokedResultCount === normalizedSummary.resultCount;
  const allResultsBlocked =
    hasResults &&
    normalizedSummary.blockedResultCount === normalizedSummary.resultCount;
  const hasMixedDisposition =
    hasResults &&
    normalizedSummary.invokedResultCount > 0 &&
    normalizedSummary.blockedResultCount > 0;

  return {
    closureBasis: attemptHandoffFinalizationClosureBasis,
    resultCount: normalizedSummary.resultCount,
    invokedResultCount: normalizedSummary.invokedResultCount,
    blockedResultCount: normalizedSummary.blockedResultCount,
    groupCount: normalizedSummary.groupCount,
    reportingDisposition: normalizedSummary.reportingDisposition,
    hasResults,
    allResultsInvoked,
    allResultsBlocked,
    hasMixedDisposition
  };
}

function validateSummary(
  summary: AttemptHandoffFinalizationGroupedReportingDispositionSummary
): {
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  groupCount: number;
  reportingDisposition: AttemptHandoffFinalizationGroupedReportingDispositionSummary["reportingDisposition"];
} {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt handoff finalization closure summary requires summary to be an object."
    );
  }

  if (
    readSelectionValue(
      summary,
      "groupedReportingDispositionBasis",
      'Attempt handoff finalization closure summary requires summary.groupedReportingDispositionBasis to be "handoff_finalization_grouped_reporting_summary".'
    ) !==
    attemptHandoffFinalizationGroupedReportingDispositionBasis
  ) {
    throw new ValidationError(
      'Attempt handoff finalization closure summary requires summary.groupedReportingDispositionBasis to be "handoff_finalization_grouped_reporting_summary".'
    );
  }

  const resultCount = readSelectionValue(
    summary,
    "resultCount",
    "Attempt handoff finalization closure summary requires summary.resultCount to be a non-negative integer."
  );
  validateNonNegativeInteger(
    resultCount,
    "summary.resultCount"
  );
  const invokedResultCount = readSelectionValue(
    summary,
    "invokedResultCount",
    "Attempt handoff finalization closure summary requires summary.invokedResultCount to be a non-negative integer."
  );
  validateNonNegativeInteger(
    invokedResultCount,
    "summary.invokedResultCount"
  );
  const blockedResultCount = readSelectionValue(
    summary,
    "blockedResultCount",
    "Attempt handoff finalization closure summary requires summary.blockedResultCount to be a non-negative integer."
  );
  validateNonNegativeInteger(
    blockedResultCount,
    "summary.blockedResultCount"
  );
  const groupCount = readSelectionValue(
    summary,
    "groupCount",
    "Attempt handoff finalization closure summary requires summary.groupCount to be a non-negative integer."
  );
  validateNonNegativeInteger(
    groupCount,
    "summary.groupCount"
  );
  const reportingDisposition = readSelectionValue(
    summary,
    "reportingDisposition",
    "Attempt handoff finalization closure summary requires summary.reportingDisposition to use the existing grouped reporting disposition vocabulary."
  );
  validateHandoffFinalizationReportingDisposition(
    reportingDisposition,
    "Attempt handoff finalization closure summary requires summary.reportingDisposition to use the existing grouped reporting disposition vocabulary."
  );

  if (
    (invokedResultCount as number) + (blockedResultCount as number) !==
    (resultCount as number)
  ) {
    throw new ValidationError(
      "Attempt handoff finalization closure summary requires summary.invokedResultCount plus summary.blockedResultCount to equal summary.resultCount."
    );
  }

  const canonicalReportingDisposition =
    deriveCanonicalHandoffFinalizationReportingDisposition(
      resultCount as number,
      invokedResultCount as number,
      blockedResultCount as number
    );

  if (reportingDisposition !== canonicalReportingDisposition) {
    throw new ValidationError(
      "Attempt handoff finalization closure summary requires summary.reportingDisposition to match the canonical disposition derived from the result counts."
    );
  }

  const canonicalGroupCount = deriveCanonicalHandoffFinalizationGroupCount(
    reportingDisposition as AttemptHandoffFinalizationGroupedReportingDispositionSummary["reportingDisposition"]
  );

  if (groupCount !== canonicalGroupCount) {
    throw new ValidationError(
      "Attempt handoff finalization closure summary requires summary.groupCount to match the canonical group count derived from summary.reportingDisposition."
    );
  }

  return {
    resultCount: resultCount as number,
    invokedResultCount: invokedResultCount as number,
    blockedResultCount: blockedResultCount as number,
    groupCount: groupCount as number,
    reportingDisposition:
      reportingDisposition as AttemptHandoffFinalizationGroupedReportingDispositionSummary["reportingDisposition"]
  };
}

function validateNonNegativeInteger(value: unknown, fieldName: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(
      `Attempt handoff finalization closure summary requires ${fieldName} to be a non-negative integer.`
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
