import { ValidationError } from "../core/errors.js";
import type {
  AttemptHandoffFinalizationClosureSummary,
  AttemptHandoffFinalizationRequestSummaryApplyInput
} from "./types.js";
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
  validateInput(input);
  const applyBatch =
    await applyAttemptHandoffFinalizationRequestSummary(input);
  const outcomeSummary = deriveAttemptHandoffFinalizationOutcomeSummary(applyBatch);
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
}

function validateInput(value: unknown): void {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Attempt handoff finalization closeout summary input must be an object."
    );
  }

  if (typeof value.invokeHandoffFinalization !== "function") {
    throw new ValidationError(
      "Attempt handoff finalization closeout summary requires invokeHandoffFinalization to be a function."
    );
  }

  if (
    value.resolveHandoffFinalizationCapability !== undefined &&
    typeof value.resolveHandoffFinalizationCapability !== "function"
  ) {
    throw new ValidationError(
      "Attempt handoff finalization closeout summary requires resolveHandoffFinalizationCapability to be a function when provided."
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
