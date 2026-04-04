import { ValidationError } from "../core/errors.js";
import type {
  AttemptHandoffFinalizationClosureSummary,
  AttemptHandoffFinalizationGroupedReportingDispositionSummary
} from "./types.js";

const attemptHandoffFinalizationClosureBasis =
  "handoff_finalization_grouped_reporting_disposition_summary" as const;
const attemptHandoffFinalizationGroupedReportingDispositionBasis =
  "handoff_finalization_grouped_reporting_summary" as const;
const validReportingDispositions = new Set<
  AttemptHandoffFinalizationClosureSummary["reportingDisposition"]
>(["empty", "all_invoked", "all_blocked", "mixed"]);

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
    summary.groupedReportingDispositionBasis !==
    attemptHandoffFinalizationGroupedReportingDispositionBasis
  ) {
    throw new ValidationError(
      'Attempt handoff finalization closure summary requires summary.groupedReportingDispositionBasis to be "handoff_finalization_grouped_reporting_summary".'
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
  validateNonNegativeInteger(summary.groupCount, "summary.groupCount");

  if (
    summary.invokedResultCount + summary.blockedResultCount !==
    summary.resultCount
  ) {
    throw new ValidationError(
      "Attempt handoff finalization closure summary requires summary.invokedResultCount plus summary.blockedResultCount to equal summary.resultCount."
    );
  }

  validateReportingDisposition(summary.reportingDisposition);

  const canonicalReportingDisposition = deriveCanonicalReportingDisposition(
    summary.resultCount,
    summary.invokedResultCount,
    summary.blockedResultCount
  );

  if (summary.reportingDisposition !== canonicalReportingDisposition) {
    throw new ValidationError(
      "Attempt handoff finalization closure summary requires summary.reportingDisposition to match the canonical disposition derived from the result counts."
    );
  }

  const canonicalGroupCount = deriveCanonicalGroupCount(
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

function validateReportingDisposition(
  value: unknown
): asserts value is AttemptHandoffFinalizationClosureSummary["reportingDisposition"] {
  if (
    typeof value !== "string" ||
    !validReportingDispositions.has(
      value as AttemptHandoffFinalizationClosureSummary["reportingDisposition"]
    )
  ) {
    throw new ValidationError(
      "Attempt handoff finalization closure summary requires summary.reportingDisposition to use the existing grouped reporting disposition vocabulary."
    );
  }
}

function deriveCanonicalReportingDisposition(
  resultCount: number,
  invokedResultCount: number,
  blockedResultCount: number
): AttemptHandoffFinalizationClosureSummary["reportingDisposition"] {
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

function deriveCanonicalGroupCount(
  reportingDisposition: AttemptHandoffFinalizationClosureSummary["reportingDisposition"]
): number {
  switch (reportingDisposition) {
    case "empty":
      return 0;
    case "all_invoked":
    case "all_blocked":
      return 1;
    case "mixed":
      return 2;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
