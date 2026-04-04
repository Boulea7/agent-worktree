import { describe, expect, expectTypeOf, it } from "vitest";

import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffApply,
  AttemptHandoffFinalizationCloseoutDecisionBlockingReason,
  AttemptHandoffFinalizationCloseoutDecisionSummary,
  AttemptHandoffDecisionSummary,
  AttemptHandoffExplanationSummary,
  AttemptHandoffFinalizationClosureSummary,
  AttemptHandoffFinalizationGroupedReportingDispositionSummary,
  AttemptHandoffFinalizationRequestSummaryApplyInput,
  AttemptPromotionAuditSummary,
  AttemptPromotionDecisionSummary,
  AttemptPromotionReport,
  AttemptSelectionCandidate,
  AttemptSelectionResult
} from "../../src/selection/internal.js";

describe("selection internal exports", () => {
  it("should expose representative helpers for the current internal-only capability buckets", () => {
    const exportKeys = new Set(Object.keys(selection));

    for (const key of [
      "deriveAttemptSelectionCandidate",
      "deriveAttemptSelectionResult",
      "deriveAttemptPromotionAuditSummary",
      "deriveAttemptPromotionReport",
      "deriveAttemptPromotionDecisionSummary",
      "deriveAttemptPromotionTarget"
    ]) {
      expect(exportKeys.has(key)).toBe(true);
    }

    for (const key of [
      "deriveAttemptHandoffTarget",
      "deriveAttemptHandoffRequest",
      "deriveAttemptHandoffConsumer",
      "consumeAttemptHandoff",
      "applyAttemptHandoff",
      "deriveAttemptHandoffReportReady",
      "deriveAttemptHandoffExplanationSummary",
      "deriveAttemptHandoffDecisionSummary"
    ]) {
      expect(exportKeys.has(key)).toBe(true);
    }

    for (const key of [
      "deriveAttemptHandoffFinalizationTargetSummary",
      "deriveAttemptHandoffFinalizationRequestSummary",
      "applyAttemptHandoffFinalizationRequestSummary",
      "deriveAttemptHandoffFinalizationOutcomeSummary",
      "deriveAttemptHandoffFinalizationExplanationSummary",
      "deriveAttemptHandoffFinalizationReportReady",
      "deriveAttemptHandoffFinalizationGroupedProjectionSummary",
      "deriveAttemptHandoffFinalizationGroupedReportingSummary",
      "deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary",
      "deriveAttemptHandoffFinalizationClosureSummary",
      "deriveAttemptHandoffFinalizationCloseoutSummary",
      "deriveAttemptHandoffFinalizationCloseoutDecisionSummary"
    ]) {
      expect(exportKeys.has(key)).toBe(true);
    }
  });

  it("should keep selection internals free of unrelated control-plane and verification helpers", () => {
    expect(selection).not.toHaveProperty("buildExecutionSessionIndex");
    expect(selection).not.toHaveProperty("consumeExecutionSessionWait");
    expect(selection).not.toHaveProperty("consumeExecutionSessionClose");
    expect(selection).not.toHaveProperty("deriveAttemptVerificationPayload");
    expect(selection).not.toHaveProperty("executeAttemptVerification");
  });

  it("should continue exporting representative internal-only type surfaces across the current buckets", () => {
    type SelectionInternalExports = {
      selectionCandidate: AttemptSelectionCandidate;
      selectionResult: AttemptSelectionResult;
      promotionAuditSummary: AttemptPromotionAuditSummary;
      promotionReport: AttemptPromotionReport;
      promotionDecisionSummary: AttemptPromotionDecisionSummary;
      handoffApply: AttemptHandoffApply;
      handoffExplanationSummary: AttemptHandoffExplanationSummary;
      handoffDecisionSummary: AttemptHandoffDecisionSummary;
      handoffFinalizationRequestSummaryApplyInput: AttemptHandoffFinalizationRequestSummaryApplyInput;
      handoffFinalizationGroupedReportingDispositionSummary: AttemptHandoffFinalizationGroupedReportingDispositionSummary;
      handoffFinalizationClosureSummary: AttemptHandoffFinalizationClosureSummary;
      handoffFinalizationCloseoutDecisionBlockingReason: AttemptHandoffFinalizationCloseoutDecisionBlockingReason;
      handoffFinalizationCloseoutDecisionSummary: AttemptHandoffFinalizationCloseoutDecisionSummary;
    };

    expectTypeOf<SelectionInternalExports>().not.toBeAny();
  });
});
