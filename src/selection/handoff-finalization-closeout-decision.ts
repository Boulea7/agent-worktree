import { ValidationError } from "../core/errors.js";
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

  validateSummary(summary);
  const blockingReasons = deriveBlockingReasons(
    summary.resultCount,
    summary.invokedResultCount,
    summary.blockedResultCount
  );

  return {
    decisionBasis: attemptHandoffFinalizationCloseoutDecisionBasis,
    resultCount: summary.resultCount,
    invokedResultCount: summary.invokedResultCount,
    blockedResultCount: summary.blockedResultCount,
    groupCount: summary.groupCount,
    reportingDisposition: summary.reportingDisposition,
    blockingReasons,
    canAdvanceFromCloseout: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0
  };
}

function validateSummary(
  summary: AttemptHandoffFinalizationClosureSummary
): void {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary to be an object."
    );
  }

  if (summary.closureBasis !== attemptHandoffFinalizationClosureBasis) {
    throw new ValidationError(
      'Attempt handoff finalization closeout decision summary requires summary.closureBasis to be "handoff_finalization_grouped_reporting_disposition_summary".'
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
  validateHandoffFinalizationReportingDisposition(
    summary.reportingDisposition,
    "Attempt handoff finalization closeout decision summary requires summary.reportingDisposition to use the existing grouped reporting disposition vocabulary."
  );

  if (
    summary.invokedResultCount + summary.blockedResultCount !==
    summary.resultCount
  ) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.invokedResultCount plus summary.blockedResultCount to equal summary.resultCount."
    );
  }

  const hasResults = summary.resultCount > 0;
  const allResultsInvoked =
    hasResults && summary.invokedResultCount === summary.resultCount;
  const allResultsBlocked =
    hasResults && summary.blockedResultCount === summary.resultCount;
  const hasMixedDisposition =
    hasResults &&
    summary.invokedResultCount > 0 &&
    summary.blockedResultCount > 0;

  if (summary.hasResults !== hasResults) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.hasResults to match the canonical result-count derivation."
    );
  }

  if (summary.allResultsInvoked !== allResultsInvoked) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.allResultsInvoked to match the canonical count-derived state."
    );
  }

  if (summary.allResultsBlocked !== allResultsBlocked) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.allResultsBlocked to match the canonical count-derived state."
    );
  }

  if (summary.hasMixedDisposition !== hasMixedDisposition) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.hasMixedDisposition to match the canonical count-derived state."
    );
  }

  const canonicalReportingDisposition =
    deriveCanonicalHandoffFinalizationReportingDisposition(
    summary.resultCount,
    summary.invokedResultCount,
    summary.blockedResultCount
    );

  if (summary.reportingDisposition !== canonicalReportingDisposition) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.reportingDisposition to match the canonical disposition derived from the result counts."
    );
  }

  const canonicalGroupCount = deriveCanonicalHandoffFinalizationGroupCount(
    summary.reportingDisposition
  );

  if (summary.groupCount !== canonicalGroupCount) {
    throw new ValidationError(
      "Attempt handoff finalization closeout decision summary requires summary.groupCount to match the canonical group count derived from summary.reportingDisposition."
    );
  }
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
