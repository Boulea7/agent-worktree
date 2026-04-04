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
    const allowedKeys = new Set([
      "deriveAttemptSelectionCandidate",
      "deriveAttemptSelectionResult",
      "deriveAttemptPromotionAuditSummary",
      "deriveAttemptPromotionCandidate",
      "deriveAttemptPromotionExplanationSummary",
      "deriveAttemptPromotionReport",
      "deriveAttemptPromotionResult",
      "deriveAttemptPromotionDecisionSummary",
      "deriveAttemptPromotionTarget",
      "deriveAttemptHandoffTarget",
      "deriveAttemptHandoffRequest",
      "deriveAttemptHandoffConsumer",
      "consumeAttemptHandoff",
      "consumeAttemptHandoffBatch",
      "applyAttemptHandoff",
      "applyAttemptHandoffBatch",
      "applyAttemptHandoffTarget",
      "applyAttemptHandoffTargetBatch",
      "applyAttemptPromotionTarget",
      "applyAttemptPromotionTargetBatch",
      "deriveAttemptHandoffReportReady",
      "deriveAttemptHandoffExplanationSummary",
      "deriveAttemptHandoffDecisionSummary",
      "deriveAttemptHandoffFinalizationTargetSummary",
      "deriveAttemptHandoffFinalizationRequestSummary",
      "applyAttemptHandoffFinalizationRequestSummary",
      "deriveAttemptHandoffFinalizationConsumer",
      "consumeAttemptHandoffFinalization",
      "consumeAttemptHandoffFinalizationBatch",
      "deriveAttemptHandoffFinalizationOutcomeSummary",
      "deriveAttemptHandoffFinalizationExplanationSummary",
      "deriveAttemptHandoffFinalizationReportReady",
      "deriveAttemptHandoffFinalizationGroupedProjectionSummary",
      "deriveAttemptHandoffFinalizationGroupedReportingSummary",
      "deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary",
      "deriveAttemptHandoffFinalizationClosureSummary",
      "deriveAttemptHandoffFinalizationCloseoutSummary",
      "deriveAttemptHandoffFinalizationCloseoutDecisionSummary"
    ]);
    const denylistKeys = new Set([
      "buildExecutionSessionIndex",
      "consumeExecutionSessionWait",
      "consumeExecutionSessionClose",
      "deriveAttemptVerificationPayload",
      "executeAttemptVerification"
    ]);

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

    const unexpectedKeys = [...exportKeys].filter(
      (key) => !allowedKeys.has(key) && !denylistKeys.has(key)
    );

    expect(unexpectedKeys).toEqual([]);
  });

  it("should keep selection internals free of unrelated control-plane and verification helpers", () => {
    expect(selection).not.toHaveProperty("buildExecutionSessionIndex");
    expect(selection).not.toHaveProperty("consumeExecutionSessionWait");
    expect(selection).not.toHaveProperty("consumeExecutionSessionClose");
    expect(selection).not.toHaveProperty("deriveAttemptVerificationPayload");
    expect(selection).not.toHaveProperty("executeAttemptVerification");
  });

  it("should continue exporting representative internal-only type surfaces across the current buckets", () => {
    expectTypeOf<AttemptSelectionCandidate>().not.toBeAny();
    expectTypeOf<AttemptSelectionResult>().not.toBeAny();
    expectTypeOf<AttemptPromotionAuditSummary>().not.toBeAny();
    expectTypeOf<AttemptPromotionReport>().not.toBeAny();
    expectTypeOf<AttemptPromotionDecisionSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffApply>().not.toBeAny();
    expectTypeOf<AttemptHandoffExplanationSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffDecisionSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationRequestSummaryApplyInput>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationGroupedReportingDispositionSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationClosureSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationCloseoutDecisionBlockingReason>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationCloseoutDecisionSummary>().not.toBeAny();
  });
});
