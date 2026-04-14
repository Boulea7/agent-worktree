import { ValidationError } from "../core/errors.js";
import type {
  AttemptHandoffFinalizationClosureSummary,
  AttemptHandoffFinalizationRequestSummaryApplyInput
} from "./types.js";
import {
  accessSelectionValue,
  rethrowSelectionAccessError,
  validateSelectionObjectInput
} from "./entry-validation.js";
import { applyAttemptHandoffFinalizationRequestSummary } from "./handoff-finalization-request-apply.js";
import { deriveAttemptHandoffFinalizationOutcomeSummary } from "./handoff-finalization-outcome-summary.js";
import { deriveAttemptHandoffFinalizationExplanationSummary } from "./handoff-finalization-explanation.js";
import { deriveAttemptHandoffFinalizationReportReady } from "./handoff-finalization-report-ready.js";
import { deriveAttemptHandoffFinalizationGroupedProjectionSummary } from "./handoff-finalization-grouped-projection-summary.js";
import { deriveAttemptHandoffFinalizationGroupedReportingSummary } from "./handoff-finalization-grouped-reporting-summary.js";
import { deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary } from "./handoff-finalization-grouped-reporting-disposition-summary.js";
import { deriveAttemptHandoffFinalizationClosureSummary } from "./handoff-finalization-closure-summary.js";

export async function deriveAttemptHandoffFinalizationCloseoutSummary(
  input: AttemptHandoffFinalizationRequestSummaryApplyInput
): Promise<AttemptHandoffFinalizationClosureSummary | undefined> {
  try {
    validateSelectionObjectInput(
      input,
      "Attempt handoff finalization closeout summary input must be an object."
    );
    const summary = accessSelectionValue(input, "summary") as
      | AttemptHandoffFinalizationRequestSummaryApplyInput["summary"]
      | undefined;
    const invokeHandoffFinalization = normalizeRequiredFunction(
      accessSelectionValue(input, "invokeHandoffFinalization"),
      "Attempt handoff finalization closeout summary requires invokeHandoffFinalization to be a function."
    ) as AttemptHandoffFinalizationRequestSummaryApplyInput["invokeHandoffFinalization"];
    const resolveHandoffFinalizationCapability = normalizeOptionalFunction(
      accessSelectionValue(input, "resolveHandoffFinalizationCapability"),
      "Attempt handoff finalization closeout summary requires resolveHandoffFinalizationCapability to be a function when provided."
    ) as AttemptHandoffFinalizationRequestSummaryApplyInput["resolveHandoffFinalizationCapability"];

    const applyBatch = await applyAttemptHandoffFinalizationRequestSummary({
      summary,
      invokeHandoffFinalization,
      ...(resolveHandoffFinalizationCapability === undefined
        ? {}
        : {
            resolveHandoffFinalizationCapability
          })
    });
    const outcomeSummary =
      deriveAttemptHandoffFinalizationOutcomeSummary(applyBatch);
    const explanationSummary =
      deriveAttemptHandoffFinalizationExplanationSummary(outcomeSummary);
    const reportReady =
      deriveAttemptHandoffFinalizationReportReady(explanationSummary);
    const groupedProjectionSummary =
      deriveAttemptHandoffFinalizationGroupedProjectionSummary(reportReady);
    const groupedReportingSummary =
      deriveAttemptHandoffFinalizationGroupedReportingSummary(
        groupedProjectionSummary
      );
    const groupedReportingDispositionSummary =
      deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary(
        groupedReportingSummary
      );

    return deriveAttemptHandoffFinalizationClosureSummary(
      groupedReportingDispositionSummary
    );
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt handoff finalization closeout summary input must be a readable object."
    );
  }
}

function normalizeRequiredFunction(
  value: unknown,
  message: string
): (...args: never[]) => unknown {
  if (typeof value !== "function") {
    throw new ValidationError(message);
  }

  return value as (...args: never[]) => unknown;
}

function normalizeOptionalFunction(
  value: unknown,
  message: string
): ((...args: never[]) => unknown) | undefined {
  if (value !== undefined && typeof value !== "function") {
    throw new ValidationError(message);
  }

  return value as ((...args: never[]) => unknown) | undefined;
}
