import { describe, expect, expectTypeOf, it } from "vitest";

import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffApply,
  AttemptHandoffApplyBatch,
  AttemptHandoffConsume,
  AttemptHandoffConsumeBatch,
  AttemptHandoffConsumer,
  AttemptHandoffDecisionBlockingReason,
  AttemptHandoffDecisionSummary,
  AttemptHandoffExplanationCode,
  AttemptHandoffExplanationEntry,
  AttemptHandoffExplanationSummary,
  AttemptHandoffFinalizationApplyBatch,
  AttemptHandoffFinalizationExplanationCode,
  AttemptHandoffFinalizationExplanationEntry,
  AttemptHandoffFinalizationExplanationSummary,
  AttemptHandoffFinalizationOutcome,
  AttemptHandoffFinalizationOutcomeSummary,
  AttemptHandoffFinalizationCapabilityResolver,
  AttemptHandoffFinalizationConsume,
  AttemptHandoffFinalizationConsumeBatch,
  AttemptHandoffFinalizationConsumer,
  AttemptHandoffFinalizationInvoker,
  AttemptHandoffFinalizationRequestSummary,
  AttemptHandoffFinalizationRequestSummaryApplyInput,
  AttemptHandoffFinalizationTarget,
  AttemptHandoffFinalizationTargetSummary,
  AttemptHandoffReportReady,
  AttemptHandoffReportReadyEntry,
  AttemptHandoffRequest,
  AttemptHandoffTarget,
  AttemptPromotionAuditSummary,
  AttemptPromotionCandidate,
  AttemptPromotionDecisionSummary,
  AttemptPromotionExplanationSummary,
  AttemptPromotionReport,
  AttemptPromotionResult,
  AttemptPromotionTarget,
  AttemptSelectionCandidate,
  AttemptSelectionResult
} from "../../src/selection/internal.js";

describe("selection internal exports", () => {
  it("should keep the internal barrel locked to the current repo-internal runtime helper surface", () => {
    expect(Object.keys(selection).sort()).toEqual(
      [
        "applyAttemptHandoff",
        "applyAttemptHandoffBatch",
        "applyAttemptHandoffFinalizationRequestSummary",
        "deriveAttemptHandoffFinalizationOutcomeSummary",
        "applyAttemptHandoffTarget",
        "applyAttemptHandoffTargetBatch",
        "applyAttemptPromotionTarget",
        "applyAttemptPromotionTargetBatch",
        "consumeAttemptHandoff",
        "consumeAttemptHandoffBatch",
        "consumeAttemptHandoffFinalization",
        "consumeAttemptHandoffFinalizationBatch",
        "deriveAttemptHandoffConsumer",
        "deriveAttemptHandoffDecisionSummary",
        "deriveAttemptHandoffExplanationSummary",
        "deriveAttemptHandoffFinalizationConsumer",
        "deriveAttemptHandoffFinalizationExplanationSummary",
        "deriveAttemptHandoffFinalizationRequestSummary",
        "deriveAttemptHandoffFinalizationTargetSummary",
        "deriveAttemptHandoffReportReady",
        "deriveAttemptHandoffRequest",
        "deriveAttemptHandoffTarget",
        "deriveAttemptPromotionAuditSummary",
        "deriveAttemptPromotionCandidate",
        "deriveAttemptPromotionDecisionSummary",
        "deriveAttemptPromotionExplanationSummary",
        "deriveAttemptPromotionReport",
        "deriveAttemptPromotionResult",
        "deriveAttemptPromotionTarget",
        "deriveAttemptSelectionCandidate",
        "deriveAttemptSelectionResult"
      ].sort()
    );
  });

  it("should continue exporting the current internal-only type surface for selection and handoff finalization", () => {
    type SelectionInternalExports = {
      handoffApply: AttemptHandoffApply;
      handoffApplyBatch: AttemptHandoffApplyBatch;
      handoffConsume: AttemptHandoffConsume;
      handoffConsumeBatch: AttemptHandoffConsumeBatch;
      handoffConsumer: AttemptHandoffConsumer;
      handoffDecisionBlockingReason: AttemptHandoffDecisionBlockingReason;
      handoffDecisionSummary: AttemptHandoffDecisionSummary;
      handoffExplanationCode: AttemptHandoffExplanationCode;
      handoffExplanationEntry: AttemptHandoffExplanationEntry;
      handoffExplanationSummary: AttemptHandoffExplanationSummary;
      handoffFinalizationApplyBatch: AttemptHandoffFinalizationApplyBatch;
      handoffFinalizationExplanationCode: AttemptHandoffFinalizationExplanationCode;
      handoffFinalizationExplanationEntry: AttemptHandoffFinalizationExplanationEntry;
      handoffFinalizationExplanationSummary: AttemptHandoffFinalizationExplanationSummary;
      handoffFinalizationOutcome: AttemptHandoffFinalizationOutcome;
      handoffFinalizationOutcomeSummary: AttemptHandoffFinalizationOutcomeSummary;
      handoffFinalizationCapabilityResolver: AttemptHandoffFinalizationCapabilityResolver;
      handoffFinalizationConsume: AttemptHandoffFinalizationConsume;
      handoffFinalizationConsumeBatch: AttemptHandoffFinalizationConsumeBatch;
      handoffFinalizationConsumer: AttemptHandoffFinalizationConsumer;
      handoffFinalizationInvoker: AttemptHandoffFinalizationInvoker;
      handoffFinalizationRequestSummary: AttemptHandoffFinalizationRequestSummary;
      handoffFinalizationRequestSummaryApplyInput: AttemptHandoffFinalizationRequestSummaryApplyInput;
      handoffFinalizationTarget: AttemptHandoffFinalizationTarget;
      handoffFinalizationTargetSummary: AttemptHandoffFinalizationTargetSummary;
      handoffReportReady: AttemptHandoffReportReady;
      handoffReportReadyEntry: AttemptHandoffReportReadyEntry;
      handoffRequest: AttemptHandoffRequest;
      handoffTarget: AttemptHandoffTarget;
      promotionAuditSummary: AttemptPromotionAuditSummary;
      promotionCandidate: AttemptPromotionCandidate;
      promotionDecisionSummary: AttemptPromotionDecisionSummary;
      promotionExplanationSummary: AttemptPromotionExplanationSummary;
      promotionReport: AttemptPromotionReport;
      promotionResult: AttemptPromotionResult;
      promotionTarget: AttemptPromotionTarget;
      selectionCandidate: AttemptSelectionCandidate;
      selectionResult: AttemptSelectionResult;
    };

    expectTypeOf<SelectionInternalExports>().not.toBeAny();
  });
});
