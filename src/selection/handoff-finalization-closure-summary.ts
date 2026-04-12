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

  validateSummary(summary);

  const hasResults = summary.resultCount > 0;
  const allResultsInvoked =
    hasResults && summary.invokedResultCount === summary.resultCount;
  const allResultsBlocked =
    hasResults && summary.blockedResultCount === summary.resultCount;
  const hasMixedDisposition =
    hasResults &&
    summary.invokedResultCount > 0 &&
    summary.blockedResultCount > 0;

  return {
    closureBasis: attemptHandoffFinalizationClosureBasis,
    resultCount: summary.resultCount,
    invokedResultCount: summary.invokedResultCount,
    blockedResultCount: summary.blockedResultCount,
    groupCount: summary.groupCount,
    reportingDisposition: summary.reportingDisposition,
    hasResults,
    allResultsInvoked,
    allResultsBlocked,
    hasMixedDisposition
  };
}

function validateSummary(
  summary: AttemptHandoffFinalizationGroupedReportingDispositionSummary
): void {
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

  validateNonNegativeInteger(
    readSelectionValue(
      summary,
      "resultCount",
      "Attempt handoff finalization closure summary requires summary.resultCount to be a non-negative integer."
    ),
    "summary.resultCount"
  );
  validateNonNegativeInteger(
    readSelectionValue(
      summary,
      "invokedResultCount",
      "Attempt handoff finalization closure summary requires summary.invokedResultCount to be a non-negative integer."
    ),
    "summary.invokedResultCount"
  );
  validateNonNegativeInteger(
    readSelectionValue(
      summary,
      "blockedResultCount",
      "Attempt handoff finalization closure summary requires summary.blockedResultCount to be a non-negative integer."
    ),
    "summary.blockedResultCount"
  );
  validateNonNegativeInteger(
    readSelectionValue(
      summary,
      "groupCount",
      "Attempt handoff finalization closure summary requires summary.groupCount to be a non-negative integer."
    ),
    "summary.groupCount"
  );

  if (
    summary.invokedResultCount + summary.blockedResultCount !==
    summary.resultCount
  ) {
    throw new ValidationError(
      "Attempt handoff finalization closure summary requires summary.invokedResultCount plus summary.blockedResultCount to equal summary.resultCount."
    );
  }

  validateHandoffFinalizationReportingDisposition(
    readSelectionValue(
      summary,
      "reportingDisposition",
      "Attempt handoff finalization closure summary requires summary.reportingDisposition to use the existing grouped reporting disposition vocabulary."
    ),
    "Attempt handoff finalization closure summary requires summary.reportingDisposition to use the existing grouped reporting disposition vocabulary."
  );

  const canonicalReportingDisposition =
    deriveCanonicalHandoffFinalizationReportingDisposition(
    summary.resultCount,
    summary.invokedResultCount,
    summary.blockedResultCount
    );

  if (summary.reportingDisposition !== canonicalReportingDisposition) {
    throw new ValidationError(
      "Attempt handoff finalization closure summary requires summary.reportingDisposition to match the canonical disposition derived from the result counts."
    );
  }

  const canonicalGroupCount = deriveCanonicalHandoffFinalizationGroupCount(
    summary.reportingDisposition
  );

  if (summary.groupCount !== canonicalGroupCount) {
    throw new ValidationError(
      "Attempt handoff finalization closure summary requires summary.groupCount to match the canonical group count derived from summary.reportingDisposition."
    );
  }
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
