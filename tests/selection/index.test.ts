import { describe, expect, expectTypeOf, it } from "vitest";

import * as selection from "../../src/selection/index.js";
import type {
  AttemptSelectionCandidate,
  AttemptSelectionResult
} from "../../src/selection/index.js";

describe("selection index exports", () => {
  it("should continue exporting only the narrow selection-facing types", () => {
    type SelectionIndexExports = {
      candidate: AttemptSelectionCandidate;
      selection: AttemptSelectionResult;
    };

    expectTypeOf<SelectionIndexExports>().not.toBeAny();
  });

  it("should keep the default barrel free of runtime exports", () => {
    expect(Object.keys(selection)).toEqual([]);
  });
});

// @ts-expect-error selection index must not export promotion audit types
type SelectionIndexShouldNotExportPromotionAuditSummary = import("../../src/selection/index.js").AttemptPromotionAuditSummary;

// @ts-expect-error selection index must not export promotion candidate types
type SelectionIndexShouldNotExportPromotionCandidate = import("../../src/selection/index.js").AttemptPromotionCandidate;

// @ts-expect-error selection index must not export promotion decision types
type SelectionIndexShouldNotExportPromotionDecisionSummary = import("../../src/selection/index.js").AttemptPromotionDecisionSummary;

// @ts-expect-error selection index must not export promotion targets
type SelectionIndexShouldNotExportPromotionTarget = import("../../src/selection/index.js").AttemptPromotionTarget;

// @ts-expect-error selection index must not export promotion reports
type SelectionIndexShouldNotExportPromotionReport = import("../../src/selection/index.js").AttemptPromotionReport;

// @ts-expect-error selection index must not export promotion result types
type SelectionIndexShouldNotExportPromotionResult = import("../../src/selection/index.js").AttemptPromotionResult;

// @ts-expect-error selection index must not export promotion explanation candidate types
type SelectionIndexShouldNotExportPromotionExplanationCandidate = import("../../src/selection/index.js").AttemptPromotionExplanationCandidate;

// @ts-expect-error selection index must not export promotion explanation summaries
type SelectionIndexShouldNotExportPromotionExplanationSummary = import("../../src/selection/index.js").AttemptPromotionExplanationSummary;

// @ts-expect-error selection index must not export handoff target types
type SelectionIndexShouldNotExportHandoffTarget = import("../../src/selection/index.js").AttemptHandoffTarget;

// @ts-expect-error selection index must not export handoff request types
type SelectionIndexShouldNotExportHandoffRequest = import("../../src/selection/index.js").AttemptHandoffRequest;

// @ts-expect-error selection index must not export handoff consumer types
type SelectionIndexShouldNotExportHandoffConsumer = import("../../src/selection/index.js").AttemptHandoffConsumer;

// @ts-expect-error selection index must not export handoff finalization target payloads
type SelectionIndexShouldNotExportHandoffFinalizationTarget = import("../../src/selection/index.js").AttemptHandoffFinalizationTarget;

// @ts-expect-error selection index must not export handoff finalization target summaries
type SelectionIndexShouldNotExportHandoffFinalizationTargetSummary = import("../../src/selection/index.js").AttemptHandoffFinalizationTargetSummary;

// @ts-expect-error selection index must not export handoff finalization request payloads
type SelectionIndexShouldNotExportHandoffFinalizationRequest = import("../../src/selection/index.js").AttemptHandoffFinalizationRequest;

// @ts-expect-error selection index must not export handoff finalization request summaries
type SelectionIndexShouldNotExportHandoffFinalizationRequestSummary = import("../../src/selection/index.js").AttemptHandoffFinalizationRequestSummary;

// @ts-expect-error selection index must not export handoff finalization request-summary apply input types
type SelectionIndexShouldNotExportHandoffFinalizationRequestSummaryApplyInput = import("../../src/selection/index.js").AttemptHandoffFinalizationRequestSummaryApplyInput;

// @ts-expect-error selection index must not export handoff finalization consumer types
type SelectionIndexShouldNotExportHandoffFinalizationConsumer = import("../../src/selection/index.js").AttemptHandoffFinalizationConsumer;

// @ts-expect-error selection index must not export handoff finalization consume result types
type SelectionIndexShouldNotExportHandoffFinalizationConsume = import("../../src/selection/index.js").AttemptHandoffFinalizationConsume;

// @ts-expect-error selection index must not export handoff finalization consume-batch result types
type SelectionIndexShouldNotExportHandoffFinalizationConsumeBatch = import("../../src/selection/index.js").AttemptHandoffFinalizationConsumeBatch;

// @ts-expect-error selection index must not export handoff finalization consume-batch input types
type SelectionIndexShouldNotExportHandoffFinalizationConsumeBatchInput = import("../../src/selection/index.js").AttemptHandoffFinalizationConsumeBatchInput;

// @ts-expect-error selection index must not export handoff finalization consume input types
type SelectionIndexShouldNotExportHandoffFinalizationConsumeInput = import("../../src/selection/index.js").AttemptHandoffFinalizationConsumeInput;

// @ts-expect-error selection index must not export handoff finalization capability resolver types
type SelectionIndexShouldNotExportHandoffFinalizationCapabilityResolver = import("../../src/selection/index.js").AttemptHandoffFinalizationCapabilityResolver;

// @ts-expect-error selection index must not export handoff finalization consumer blocking reason types
type SelectionIndexShouldNotExportHandoffFinalizationConsumerBlockingReason = import("../../src/selection/index.js").AttemptHandoffFinalizationConsumerBlockingReason;

// @ts-expect-error selection index must not export handoff finalization consumer readiness types
type SelectionIndexShouldNotExportHandoffFinalizationConsumerReadiness = import("../../src/selection/index.js").AttemptHandoffFinalizationConsumerReadiness;

// @ts-expect-error selection index must not export handoff finalization invoker types
type SelectionIndexShouldNotExportHandoffFinalizationInvoker = import("../../src/selection/index.js").AttemptHandoffFinalizationInvoker;

// @ts-expect-error selection index must not export handoff finalization apply result types
type SelectionIndexShouldNotExportHandoffFinalizationApply = import("../../src/selection/index.js").AttemptHandoffFinalizationApply;

// @ts-expect-error selection index must not export handoff finalization apply input types
type SelectionIndexShouldNotExportHandoffFinalizationApplyInput = import("../../src/selection/index.js").AttemptHandoffFinalizationApplyInput;

// @ts-expect-error selection index must not export handoff finalization apply-batch result types
type SelectionIndexShouldNotExportHandoffFinalizationApplyBatch = import("../../src/selection/index.js").AttemptHandoffFinalizationApplyBatch;

// @ts-expect-error selection index must not export handoff finalization apply-batch input types
type SelectionIndexShouldNotExportHandoffFinalizationApplyBatchInput = import("../../src/selection/index.js").AttemptHandoffFinalizationApplyBatchInput;

// @ts-expect-error selection index must not export handoff finalization outcome types
type SelectionIndexShouldNotExportHandoffFinalizationOutcome = import("../../src/selection/index.js").AttemptHandoffFinalizationOutcome;

// @ts-expect-error selection index must not export handoff finalization outcome summary types
type SelectionIndexShouldNotExportHandoffFinalizationOutcomeSummary = import("../../src/selection/index.js").AttemptHandoffFinalizationOutcomeSummary;

// @ts-expect-error selection index must not export handoff finalization explanation code types
type SelectionIndexShouldNotExportHandoffFinalizationExplanationCode = import("../../src/selection/index.js").AttemptHandoffFinalizationExplanationCode;

// @ts-expect-error selection index must not export handoff finalization explanation entry types
type SelectionIndexShouldNotExportHandoffFinalizationExplanationEntry = import("../../src/selection/index.js").AttemptHandoffFinalizationExplanationEntry;

// @ts-expect-error selection index must not export handoff finalization explanation summary types
type SelectionIndexShouldNotExportHandoffFinalizationExplanationSummary = import("../../src/selection/index.js").AttemptHandoffFinalizationExplanationSummary;

// @ts-expect-error selection index must not export handoff finalization grouped projection group types
type SelectionIndexShouldNotExportHandoffFinalizationGroupedProjectionGroup = import("../../src/selection/index.js").AttemptHandoffFinalizationGroupedProjectionGroup;

// @ts-expect-error selection index must not export handoff finalization grouped projection summary types
type SelectionIndexShouldNotExportHandoffFinalizationGroupedProjectionSummary = import("../../src/selection/index.js").AttemptHandoffFinalizationGroupedProjectionSummary;

// @ts-expect-error selection index must not export handoff finalization grouped reporting group types
type SelectionIndexShouldNotExportHandoffFinalizationGroupedReportingGroup = import("../../src/selection/index.js").AttemptHandoffFinalizationGroupedReportingGroup;

// @ts-expect-error selection index must not export handoff finalization grouped reporting summary types
type SelectionIndexShouldNotExportHandoffFinalizationGroupedReportingSummary = import("../../src/selection/index.js").AttemptHandoffFinalizationGroupedReportingSummary;

// @ts-expect-error selection index must not export handoff finalization report-ready types
type SelectionIndexShouldNotExportHandoffFinalizationReportReady = import("../../src/selection/index.js").AttemptHandoffFinalizationReportReady;

// @ts-expect-error selection index must not export handoff finalization report-ready entry types
type SelectionIndexShouldNotExportHandoffFinalizationReportReadyEntry = import("../../src/selection/index.js").AttemptHandoffFinalizationReportReadyEntry;

// @ts-expect-error selection index must not export handoff report-ready types
type SelectionIndexShouldNotExportHandoffReportReady = import("../../src/selection/index.js").AttemptHandoffReportReady;

// @ts-expect-error selection index must not export handoff report-ready entry types
type SelectionIndexShouldNotExportHandoffReportReadyEntry = import("../../src/selection/index.js").AttemptHandoffReportReadyEntry;

// @ts-expect-error selection index must not export handoff explanation code types
type SelectionIndexShouldNotExportHandoffExplanationCode = import("../../src/selection/index.js").AttemptHandoffExplanationCode;

// @ts-expect-error selection index must not export handoff explanation entry types
type SelectionIndexShouldNotExportHandoffExplanationEntry = import("../../src/selection/index.js").AttemptHandoffExplanationEntry;

// @ts-expect-error selection index must not export handoff explanation summaries
type SelectionIndexShouldNotExportHandoffExplanationSummary = import("../../src/selection/index.js").AttemptHandoffExplanationSummary;

// @ts-expect-error selection index must not export handoff decision blocking reason types
type SelectionIndexShouldNotExportHandoffDecisionBlockingReason = import("../../src/selection/index.js").AttemptHandoffDecisionBlockingReason;

// @ts-expect-error selection index must not export handoff decision summaries
type SelectionIndexShouldNotExportHandoffDecisionSummary = import("../../src/selection/index.js").AttemptHandoffDecisionSummary;

// @ts-expect-error selection index must not export promotion candidate helpers
type SelectionIndexShouldNotExportDeriveAttemptPromotionCandidate = typeof import("../../src/selection/index.js").deriveAttemptPromotionCandidate;

// @ts-expect-error selection index must not export handoff request helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffRequest = typeof import("../../src/selection/index.js").deriveAttemptHandoffRequest;

// @ts-expect-error selection index must not export handoff consumer helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffConsumer = typeof import("../../src/selection/index.js").deriveAttemptHandoffConsumer;

// @ts-expect-error selection index must not export handoff finalization target helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffFinalizationTargetSummary = typeof import("../../src/selection/index.js").deriveAttemptHandoffFinalizationTargetSummary;

// @ts-expect-error selection index must not export handoff finalization request helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffFinalizationRequestSummary = typeof import("../../src/selection/index.js").deriveAttemptHandoffFinalizationRequestSummary;

// @ts-expect-error selection index must not export handoff finalization consumer helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffFinalizationConsumer = typeof import("../../src/selection/index.js").deriveAttemptHandoffFinalizationConsumer;

// @ts-expect-error selection index must not export handoff finalization consume helpers
type SelectionIndexShouldNotExportConsumeAttemptHandoffFinalization = typeof import("../../src/selection/index.js").consumeAttemptHandoffFinalization;

// @ts-expect-error selection index must not export handoff finalization consume-batch helpers
type SelectionIndexShouldNotExportConsumeAttemptHandoffFinalizationBatch = typeof import("../../src/selection/index.js").consumeAttemptHandoffFinalizationBatch;

// @ts-expect-error selection index must not export handoff finalization apply helpers
type SelectionIndexShouldNotExportApplyAttemptHandoffFinalization = typeof import("../../src/selection/index.js").applyAttemptHandoffFinalization;

// @ts-expect-error selection index must not export handoff finalization apply-batch helpers
type SelectionIndexShouldNotExportApplyAttemptHandoffFinalizationBatch = typeof import("../../src/selection/index.js").applyAttemptHandoffFinalizationBatch;

// @ts-expect-error selection index must not export handoff finalization outcome summary helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffFinalizationOutcomeSummary = typeof import("../../src/selection/index.js").deriveAttemptHandoffFinalizationOutcomeSummary;

// @ts-expect-error selection index must not export handoff finalization explanation summary helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffFinalizationExplanationSummary = typeof import("../../src/selection/index.js").deriveAttemptHandoffFinalizationExplanationSummary;

// @ts-expect-error selection index must not export handoff finalization grouped projection summary helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffFinalizationGroupedProjectionSummary = typeof import("../../src/selection/index.js").deriveAttemptHandoffFinalizationGroupedProjectionSummary;

// @ts-expect-error selection index must not export handoff finalization grouped reporting summary helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffFinalizationGroupedReportingSummary = typeof import("../../src/selection/index.js").deriveAttemptHandoffFinalizationGroupedReportingSummary;

// @ts-expect-error selection index must not export handoff finalization report-ready helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffFinalizationReportReady = typeof import("../../src/selection/index.js").deriveAttemptHandoffFinalizationReportReady;

// @ts-expect-error selection index must not export handoff report-ready helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffReportReady = typeof import("../../src/selection/index.js").deriveAttemptHandoffReportReady;

// @ts-expect-error selection index must not export handoff explanation helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffExplanationSummary = typeof import("../../src/selection/index.js").deriveAttemptHandoffExplanationSummary;

// @ts-expect-error selection index must not export handoff decision helpers
type SelectionIndexShouldNotExportDeriveAttemptHandoffDecisionSummary = typeof import("../../src/selection/index.js").deriveAttemptHandoffDecisionSummary;
