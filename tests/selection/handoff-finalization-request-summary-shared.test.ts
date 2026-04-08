import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptSourceKind,
  AttemptStatus
} from "../../src/manifest/types.js";
import {
  attemptHandoffFinalizationRequestBasis,
  deriveCanonicalAttemptHandoffDecisionBlockingReasons,
  validateAttemptHandoffFinalizationRequestSummaryForApply
} from "../../src/selection/handoff-finalization-request-summary-shared.js";
import type {
  AttemptHandoffDecisionBlockingReason,
  AttemptHandoffFinalizationRequest,
  AttemptHandoffFinalizationRequestSummary
} from "../../src/selection/types.js";

describe("selection handoff-finalization-request-summary-shared helpers", () => {
  it("should derive canonical handoff decision blocking reasons from result counts", () => {
    expect(
      deriveCanonicalAttemptHandoffDecisionBlockingReasons(0, 0)
    ).toEqual(["no_results"]);
    expect(
      deriveCanonicalAttemptHandoffDecisionBlockingReasons(2, 0)
    ).toEqual(["handoff_unsupported"]);
    expect(
      deriveCanonicalAttemptHandoffDecisionBlockingReasons(2, 1)
    ).toEqual([]);
  });

  it("should accept canonical request summaries for both blocked and invokable paths", () => {
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          blockingReasons: ["no_results"],
          canFinalizeHandoff: false,
          requests: []
        })
      )
    ).not.toThrow();

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(createSummary())
    ).not.toThrow();
  });

  it("should reject invalid request basis and invalid blocker vocabulary", () => {
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requestBasis: "shadow_basis" as never
        })
      )
    ).toThrow(
      'Attempt handoff finalization request apply requires summary.requestBasis to be "handoff_finalization_target_summary".'
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          canFinalizeHandoff: false,
          requests: [],
          blockingReasons: ["shadow_reason" as never]
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.blockingReasons to use the existing handoff decision blocker vocabulary."
    );
  });

  it("should reject inconsistent counts and request/canFinalize combinations", () => {
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          resultCount: 2,
          invokedResultCount: 1,
          blockedResultCount: 0
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.resultCount to equal summary.invokedResultCount plus summary.blockedResultCount."
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          canFinalizeHandoff: false
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.requests to be empty when summary.canFinalizeHandoff is false."
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          resultCount: 1,
          invokedResultCount: 0,
          blockedResultCount: 1,
          canFinalizeHandoff: false,
          requests: []
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.blockingReasons to match the canonical blocker derivation from summary result counts."
    );
  });
});

function createRequest(
  overrides: Partial<{
    taskId: string;
    attemptId: string;
    runtime: string;
    status: AttemptStatus;
    sourceKind: AttemptSourceKind | undefined;
  }> = {}
): AttemptHandoffFinalizationRequest {
  return {
    taskId: "task_shared",
    attemptId: "att_ready",
    runtime: "codex-cli",
    status: "created",
    sourceKind: undefined,
    ...overrides
  };
}

function createSummary(
  overrides: Partial<{
    requestBasis: AttemptHandoffFinalizationRequestSummary["requestBasis"];
    resultCount: number;
    invokedResultCount: number;
    blockedResultCount: number;
    blockingReasons: AttemptHandoffDecisionBlockingReason[];
    canFinalizeHandoff: boolean;
    requests: AttemptHandoffFinalizationRequest[];
  }> = {}
): AttemptHandoffFinalizationRequestSummary {
  const requests = overrides.requests ?? [createRequest()];

  return {
    requestBasis: attemptHandoffFinalizationRequestBasis,
    resultCount: overrides.resultCount ?? requests.length,
    invokedResultCount: overrides.invokedResultCount ?? requests.length,
    blockedResultCount: overrides.blockedResultCount ?? 0,
    blockingReasons: overrides.blockingReasons ?? [],
    canFinalizeHandoff: overrides.canFinalizeHandoff ?? true,
    requests,
    ...overrides
  };
}
