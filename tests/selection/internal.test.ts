import { describe, expect, expectTypeOf, it } from "vitest";

import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffApply,
  AttemptHandoffApplyBatch,
  AttemptHandoffConsumeBatch,
  AttemptHandoffConsumeBatchInput,
  AttemptHandoffConsumerBlockingReason,
  AttemptHandoffFinalizationApplyBatchInput,
  AttemptHandoffFinalizationApplyInput,
  AttemptHandoffFinalizationCapabilityResolver,
  AttemptHandoffFinalizationCloseoutDecisionBlockingReason,
  AttemptHandoffFinalizationCloseoutDecisionSummary,
  AttemptHandoffDecisionSummary,
  AttemptHandoffExplanationSummary,
  AttemptHandoffFinalizationClosureSummary,
  AttemptHandoffFinalizationConsumerBlockingReason,
  AttemptHandoffFinalizationExplanationCode,
  AttemptHandoffFinalizationGroupedReportingDispositionSummary,
  AttemptHandoffFinalizationInvoker,
  AttemptHandoffFinalizationReportReady,
  AttemptHandoffFinalizationReportReadyEntry,
  AttemptHandoffFinalizationRequestSummaryApplyInput,
  AttemptHandoffReportReady,
  AttemptHandoffReportReadyEntry,
  AttemptPromotionAuditCandidate,
  AttemptPromotionAuditSummary,
  AttemptPromotionDecisionBlockingReason,
  AttemptPromotionDecisionSummary,
  AttemptPromotionReport,
  AttemptPromotionTargetApplyBatch,
  AttemptPromotionTargetApplyBatchInput,
  AttemptHandoffTargetApply,
  AttemptHandoffTargetApplyBatchInput,
  AttemptHandoffTargetApplyInput,
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
    expect(selection).not.toHaveProperty("normalizePromotionAttemptSourceKind");
    expect(selection).not.toHaveProperty(
      "validatePromotionArtifactSummaryCheckNameLists"
    );
    expect(selection).not.toHaveProperty(
      "deriveCanonicalAttemptHandoffDecisionBlockingReasons"
    );
    expect(selection).not.toHaveProperty(
      "validateAttemptHandoffFinalizationRequestSummaryForApply"
    );
  });

  it("should continue exporting representative internal-only type surfaces across the current buckets", () => {
    expectTypeOf<AttemptSelectionCandidate>().not.toBeAny();
    expectTypeOf<AttemptSelectionResult>().not.toBeAny();
    expectTypeOf<AttemptPromotionAuditCandidate>().not.toBeAny();
    expectTypeOf<AttemptPromotionAuditSummary>().not.toBeAny();
    expectTypeOf<AttemptPromotionReport>().not.toBeAny();
    expectTypeOf<AttemptPromotionDecisionBlockingReason>().not.toBeAny();
    expectTypeOf<AttemptPromotionDecisionSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffApply>().not.toBeAny();
    expectTypeOf<AttemptHandoffApplyBatch>().not.toBeAny();
    expectTypeOf<AttemptHandoffConsumeBatch>().not.toBeAny();
    expectTypeOf<AttemptHandoffConsumeBatchInput>().not.toBeAny();
    expectTypeOf<AttemptHandoffConsumerBlockingReason>().not.toBeAny();
    expectTypeOf<AttemptHandoffReportReady>().not.toBeAny();
    expectTypeOf<AttemptHandoffReportReadyEntry>().not.toBeAny();
    expectTypeOf<AttemptHandoffExplanationSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffDecisionSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffTargetApplyBatchInput>().not.toBeAny();
    expectTypeOf<AttemptHandoffTargetApplyInput>().not.toBeAny();
    expectTypeOf<AttemptHandoffTargetApply>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationCapabilityResolver>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationConsumerBlockingReason>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationInvoker>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationApplyInput>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationApplyBatchInput>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationRequestSummaryApplyInput>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationExplanationCode>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationReportReady>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationReportReadyEntry>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationGroupedReportingDispositionSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationClosureSummary>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationCloseoutDecisionBlockingReason>().not.toBeAny();
    expectTypeOf<AttemptHandoffFinalizationCloseoutDecisionSummary>().not.toBeAny();
    expectTypeOf<AttemptPromotionTargetApplyBatchInput>().not.toBeAny();
    expectTypeOf<AttemptPromotionTargetApplyBatch>().not.toBeAny();
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

// @ts-expect-error selection internal barrel must not export promotion source-kind helpers
type SelectionInternalShouldNotExportNormalizePromotionAttemptSourceKind = typeof import("../../src/selection/internal.js").normalizePromotionAttemptSourceKind;

// @ts-expect-error selection internal barrel must not export promotion artifact-summary guardrails
type SelectionInternalShouldNotExportValidatePromotionArtifactSummaryCheckNameLists = typeof import("../../src/selection/internal.js").validatePromotionArtifactSummaryCheckNameLists;

// @ts-expect-error selection internal barrel must not export handoff finalization shared blocker derivation helpers
type SelectionInternalShouldNotExportDeriveCanonicalAttemptHandoffDecisionBlockingReasons = typeof import("../../src/selection/internal.js").deriveCanonicalAttemptHandoffDecisionBlockingReasons;

// @ts-expect-error selection internal barrel must not export handoff finalization shared request-summary validators
type SelectionInternalShouldNotExportValidateAttemptHandoffFinalizationRequestSummaryForApply = typeof import("../../src/selection/internal.js").validateAttemptHandoffFinalizationRequestSummaryForApply;
