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
