import { ValidationError } from "../core/errors.js";
import { readSelectionValue } from "./entry-validation.js";
import type {
  AttemptHandoffFinalizationCloseoutDecisionBlockingReason,
  AttemptHandoffFinalizationCloseoutDecisionSummary,
  AttemptHandoffFinalizationClosureSummary
} from "./types.js";
import {
  deriveCanonicalHandoffFinalizationGroupCount,
  deriveCanonicalHandoffFinalizationReportingDisposition,
  validateHandoffFinalizationReportingDisposition
} from "./handoff-finalization-reporting-disposition-shared.js";

const attemptHandoffFinalizationCloseoutDecisionBasis =
  "handoff_finalization_closure_summary" as const;
const attemptHandoffFinalizationClosureBasis =
  "handoff_finalization_grouped_reporting_disposition_summary" as const;
export function deriveAttemptHandoffFinalizationCloseoutDecisionSummary(
  summary: AttemptHandoffFinalizationClosureSummary | undefined
): AttemptHandoffFinalizationCloseoutDecisionSummary | undefined {
  if (summary === undefined) {
    return undefined;
  }

  const normalizedSummary = validateSummary(summary);
  const blockingReasons = deriveBlockingReasons(
    normalizedSummary.resultCount,
    normalizedSummary.invokedResultCount,
    normalizedSummary.blockedResultCount
  );

  return {
    decisionBasis: attemptHandoffFinalizationCloseoutDecisionBasis,
    resultCount: normalizedSummary.resultCount,
    invokedResultCount: normalizedSummary.invokedResultCount,
    blockedResultCount: normalizedSummary.blockedResultCount,
    groupCount: normalizedSummary.groupCount,
    reportingDisposition: normalizedSummary.reportingDisposition,
    blockingReasons,
    canAdvanceFromCloseout: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0
  };
}

function validateSummary(
  summary: AttemptHandoffFinalizationClosureSummary
): {
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  groupCount: number;
  reportingDisposition: AttemptHandoffFinalizationClosureSummary["reportingDisposition"];
} {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary to be an object."
    );
  }

  if (
    readSelectionValue(
      summary,
      "closureBasis",
      'Attempt handoff finalization closeout decision summary requires summary.closureBasis to be "handoff_finalization_grouped_reporting_disposition_summary".'
    ) !== attemptHandoffFinalizationClosureBasis
  ) {
    throw new ValidationError(
      'Attempt handoff finalization closeout decision summary requires summary.closureBasis to be "handoff_finalization_grouped_reporting_disposition_summary".'
    );
  }

  const resultCount = readSelectionValue(
    summary,
    "resultCount",
    "Attempt handoff finalization closeout decision summary requires summary.resultCount to be a non-negative integer."
  );
  validateNonNegativeInteger(resultCount, "summary.resultCount");
  const invokedResultCount = readSelectionValue(
    summary,
    "invokedResultCount",
    "Attempt handoff finalization closeout decision summary requires summary.invokedResultCount to be a non-negative integer."
  );
  validateNonNegativeInteger(invokedResultCount, "summary.invokedResultCount");
  const blockedResultCount = readSelectionValue(
    summary,
    "blockedResultCount",
    "Attempt handoff finalization closeout decision summary requires summary.blockedResultCount to be a non-negative integer."
  );
  validateNonNegativeInteger(blockedResultCount, "summary.blockedResultCount");
  const groupCount = readSelectionValue(
    summary,
    "groupCount",
    "Attempt handoff finalization closeout decision summary requires summary.groupCount to be a non-negative integer."
  );
  validateNonNegativeInteger(groupCount, "summary.groupCount");
  const reportingDisposition = readSelectionValue(
    summary,
    "reportingDisposition",
    "Attempt handoff finalization closeout decision summary requires summary.reportingDisposition to use the existing grouped reporting disposition vocabulary."
  );
  validateHandoffFinalizationReportingDisposition(
    reportingDisposition,
    "Attempt handoff finalization closeout decision summary requires summary.reportingDisposition to use the existing grouped reporting disposition vocabulary."
  );

  if (
    (invokedResultCount as number) + (blockedResultCount as number) !==
    (resultCount as number)
  ) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.invokedResultCount plus summary.blockedResultCount to equal summary.resultCount."
    );
  }

  const hasResults = (resultCount as number) > 0;
  const allResultsInvoked =
    hasResults && (invokedResultCount as number) === (resultCount as number);
  const allResultsBlocked =
    hasResults && (blockedResultCount as number) === (resultCount as number);
  const hasMixedDisposition =
    hasResults &&
    (invokedResultCount as number) > 0 &&
    (blockedResultCount as number) > 0;

  if (
    readSelectionValue(
      summary,
      "hasResults",
      "Attempt handoff finalization closeout decision summary requires summary.hasResults to match the canonical result-count derivation."
    ) !== hasResults
  ) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.hasResults to match the canonical result-count derivation."
    );
  }

  if (
    readSelectionValue(
      summary,
      "allResultsInvoked",
      "Attempt handoff finalization closeout decision summary requires summary.allResultsInvoked to match the canonical count-derived state."
    ) !== allResultsInvoked
  ) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.allResultsInvoked to match the canonical count-derived state."
    );
  }

  if (
    readSelectionValue(
      summary,
      "allResultsBlocked",
      "Attempt handoff finalization closeout decision summary requires summary.allResultsBlocked to match the canonical count-derived state."
    ) !== allResultsBlocked
  ) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.allResultsBlocked to match the canonical count-derived state."
    );
  }

  if (
    readSelectionValue(
      summary,
      "hasMixedDisposition",
      "Attempt handoff finalization closeout decision summary requires summary.hasMixedDisposition to match the canonical count-derived state."
    ) !== hasMixedDisposition
  ) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.hasMixedDisposition to match the canonical count-derived state."
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
      "Attempt handoff finalization closeout decision summary requires summary.reportingDisposition to match the canonical disposition derived from the result counts."
    );
  }

  const canonicalGroupCount = deriveCanonicalHandoffFinalizationGroupCount(
    reportingDisposition as AttemptHandoffFinalizationClosureSummary["reportingDisposition"]
  );

  if (groupCount !== canonicalGroupCount) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.groupCount to match the canonical group count derived from summary.reportingDisposition."
    );
  }

  return {
    resultCount: resultCount as number,
    invokedResultCount: invokedResultCount as number,
    blockedResultCount: blockedResultCount as number,
    groupCount: groupCount as number,
    reportingDisposition:
      reportingDisposition as AttemptHandoffFinalizationClosureSummary["reportingDisposition"]
  };
}

function deriveBlockingReasons(
  resultCount: number,
  invokedResultCount: number,
  blockedResultCount: number
): AttemptHandoffFinalizationCloseoutDecisionBlockingReason[] {
  if (resultCount === 0) {
    return ["no_results"];
  }

  if (blockedResultCount === resultCount) {
    return ["handoff_finalization_unsupported"];
  }

  if (invokedResultCount > 0 && blockedResultCount > 0) {
    return ["handoff_finalization_mixed_disposition"];
  }

  return [];
}

function validateNonNegativeInteger(value: unknown, fieldName: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(
      `Attempt handoff finalization closeout decision summary requires ${fieldName} to be a non-negative integer.`
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
