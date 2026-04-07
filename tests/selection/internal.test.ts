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
  AttemptHandoffFinalizationReportReady,
  AttemptHandoffFinalizationReportReadyEntry,
  AttemptHandoffFinalizationRequestSummaryApplyInput,
  AttemptHandoffReportReady,
  AttemptHandoffReportReadyEntry,
  AttemptPromotionAuditSummary,
  AttemptPromotionDecisionSummary,
  AttemptPromotionReport,
  AttemptSelectionCandidate,
  AttemptSelectionResult
} from "../../src/selection/internal.js";

describe("selection internal exports", () => {
  it("should keep the current selection internal runtime export inventory explicit", () => {
    expect(Object.keys(selection).sort()).toEqual(
      [
        "applyAttemptHandoff",
        "applyAttemptHandoffBatch",
        "applyAttemptHandoffFinalization",
        "applyAttemptHandoffFinalizationBatch",
        "applyAttemptHandoffFinalizationCloseoutDecisionSummary",
        "applyAttemptHandoffFinalizationRequestSummary",
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
        "deriveAttemptHandoffFinalizationClosureSummary",
        "deriveAttemptHandoffFinalizationCloseoutDecisionSummary",
        "deriveAttemptHandoffFinalizationCloseoutSummary",
        "deriveAttemptHandoffFinalizationConsumer",
        "deriveAttemptHandoffFinalizationExplanationSummary",
        "deriveAttemptHandoffFinalizationGroupedProjectionSummary",
        "deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary",
        "deriveAttemptHandoffFinalizationGroupedReportingSummary",
        "deriveAttemptHandoffFinalizationOutcomeSummary",
        "deriveAttemptHandoffFinalizationReportReady",
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
    expectTypeOf<AttemptHandoffReportReady>().not.toBeAny();
    expectTypeOf<AttemptHandoffReportReadyEntry>().not.toBeAny();
    expectTypeOf<AttemptHandoffExplanationSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffDecisionSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationRequestSummaryApplyInput>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationReportReady>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationReportReadyEntry>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationGroupedReportingDispositionSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationClosureSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationCloseoutDecisionBlockingReason>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationCloseoutDecisionSummary>().not.toBeAny();
  });
});

// @ts-expect-error selection internal barrel must not export control-plane context types
type SelectionInternalShouldNotExportExecutionSessionContext = import("../../src/selection/internal.js").ExecutionSessionContext;

// @ts-expect-error selection internal barrel must not export verification summary types
type SelectionInternalShouldNotExportVerificationSummary = import("../../src/selection/internal.js").AttemptVerificationSummary;

// @ts-expect-error selection internal barrel must not export control-plane helpers
type SelectionInternalShouldNotExportControlPlaneHelper = typeof import("../../src/selection/internal.js").deriveExecutionSessionContext;

// @ts-expect-error selection internal barrel must not export verification helpers
type SelectionInternalShouldNotExportVerificationHelper = typeof import("../../src/selection/internal.js").deriveAttemptVerificationSummary;
