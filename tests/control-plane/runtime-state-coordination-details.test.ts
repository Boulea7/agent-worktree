import { describe, expect, it } from "vitest";

import {
  buildExecutionSessionView,
  deriveExecutionCoordinationTaskDetailFromCloseoutDecision,
  deriveExecutionCoordinationTaskDetailFromHandoffDecision,
  deriveExecutionCoordinationTaskDetailFromPromotionDecision,
  deriveExecutionCoordinationTaskDetailFromSpawnCandidate,
  deriveExecutionCoordinationTaskDetailFromSpawnHeadlessWaitCandidate,
  type ExecutionSessionSpawnCandidate,
  type ExecutionSessionSpawnHeadlessWaitCandidate
} from "../../src/control-plane/internal.js";
import type {
  AttemptHandoffDecisionSummary,
  AttemptHandoffFinalizationCloseoutDecisionSummary,
  AttemptPromotionDecisionSummary
} from "../../src/selection/internal.js";

describe("control-plane runtime-state coordination detail helpers", () => {
  it("should derive delegated-work and blocked-child detail views", () => {
    expect(
      deriveExecutionCoordinationTaskDetailFromSpawnCandidate({
        id: "spawn-parent",
        updatedAt: "2026-04-14T00:00:00.000Z",
        requestedCount: 2,
        candidate: createSpawnCandidate({
          budget: {
            childCount: 1,
            lineageDepth: 0,
            lineageDepthKnown: true,
            remainingChildSlots: 2,
            remainingDepthAllowance: 1,
            withinChildLimit: true,
            withinDepthLimit: true
          }
        })
      })
    ).toEqual({
      id: "spawn-parent",
      kind: "delegated_work",
      owner: {
        attemptId: "att_parent",
        runtime: "codex-cli"
      },
      blockingReasons: [],
      requestedCount: 2,
      childCount: 1,
      lineageDepth: 0,
      lineageDepthKnown: true,
      remainingChildSlots: 2,
      remainingDepthAllowance: 1
    });

    expect(
      deriveExecutionCoordinationTaskDetailFromSpawnHeadlessWaitCandidate({
        id: "child-followup",
        updatedAt: "2026-04-14T00:00:00.000Z",
        headlessWaitCandidate: createHeadlessWaitCandidate()
      })
    ).toEqual({
      id: "child-followup",
      kind: "blocked_child",
      owner: {
        attemptId: "att_child",
        runtime: "codex-cli"
      },
      blockingReasons: [],
      descendantCoverage: "incomplete",
      descendantCount: 1,
      descendantAttemptIds: ["att_grandchild"],
      descendantCoverageDefaulted: false
    });
  });

  it("should derive detail views for verifier, review, and closeout flows", () => {
    expect(
      deriveExecutionCoordinationTaskDetailFromPromotionDecision({
        id: "verify",
        updatedAt: "2026-04-14T00:00:00.000Z",
        summary: createPromotionDecisionSummary()
      })
    ).toEqual({
      id: "verify",
      kind: "verifier_handoff",
      owner: {
        attemptId: "att_selected",
        runtime: "codex-cli"
      },
      blockingReasons: ["required_checks_pending"],
      taskId: "task_shared",
      selectedAttemptId: "att_selected",
      comparableCandidateCount: 1,
      promotionReadyCandidateCount: 0,
      canAdvance: false
    });

    expect(
      deriveExecutionCoordinationTaskDetailFromHandoffDecision({
        id: "review",
        updatedAt: "2026-04-14T00:00:00.000Z",
        summary: createHandoffDecisionSummary()
      })
    ).toEqual({
      id: "review",
      kind: "review_handoff",
      blockingReasons: ["handoff_unsupported"],
      resultCount: 1,
      blockedResultCount: 1,
      canAdvance: false
    });

    expect(
      deriveExecutionCoordinationTaskDetailFromCloseoutDecision({
        id: "closeout",
        updatedAt: "2026-04-14T00:00:00.000Z",
        summary: createCloseoutDecisionSummary({
          canAdvanceFromCloseout: true,
          hasBlockingReasons: false,
          blockingReasons: []
        })
      })
    ).toEqual({
      id: "closeout",
      kind: "closeout_readiness",
      blockingReasons: [],
      resultCount: 1,
      blockedResultCount: 1,
      canAdvance: true,
      reportingDisposition: "all_blocked"
    });
  });
});

function createSpawnCandidate(
  overrides: Partial<ExecutionSessionSpawnCandidate> = {}
): ExecutionSessionSpawnCandidate {
  return {
    context: {
      record: {
        attemptId: "att_parent",
        runtime: "codex-cli",
        sourceKind: "direct",
        lifecycleState: "active",
        runCompleted: false,
        errorEventCount: 0,
        origin: "headless_result",
        sessionId: "thr_parent"
      },
      selectedBy: "attemptId",
      childRecords: [],
      hasKnownSession: true,
      hasParent: false,
      hasResolvedParent: false,
      hasChildren: false
    },
    budget: {
      childCount: 0,
      lineageDepth: 0,
      lineageDepthKnown: true,
      withinChildLimit: true,
      withinDepthLimit: true
    },
    readiness: {
      blockingReasons: [],
      canSpawn: true,
      hasBlockingReasons: false,
      lineageDepth: 0,
      lineageDepthKnown: true,
      withinChildLimit: true,
      withinDepthLimit: true
    },
    ...overrides
  };
}

function createHeadlessWaitCandidate(
  overrides: Partial<ExecutionSessionSpawnHeadlessWaitCandidate> = {}
): ExecutionSessionSpawnHeadlessWaitCandidate {
  const childRecord = {
    ...createSpawnCandidate().context.record,
    attemptId: "att_child",
    sessionId: "thr_child"
  };
  const grandchildRecord = {
    ...createSpawnCandidate().context.record,
    attemptId: "att_grandchild",
    parentAttemptId: "att_child",
    sessionId: "thr_grandchild"
  };

  return {
    headlessContext: {
      context: {
        ...createSpawnCandidate().context,
        record: childRecord
      },
      headlessView: {
        descendantCoverage: "incomplete",
        view: buildExecutionSessionView([childRecord, grandchildRecord])
      } as never
    },
    candidate: {
      context: {
        ...createSpawnCandidate().context,
        record: childRecord
      },
      readiness: {
        blockingReasons: [],
        canWait: true,
        hasBlockingReasons: false
      }
    },
    ...overrides
  };
}

function createPromotionDecisionSummary(
  overrides: Partial<AttemptPromotionDecisionSummary> = {}
): AttemptPromotionDecisionSummary {
  return {
    decisionBasis: "promotion_explanation_summary",
    taskId: "task_shared",
    selectedAttemptId: "att_selected",
    selectedIdentity: {
      taskId: "task_shared",
      attemptId: "att_selected",
      runtime: "codex-cli"
    },
    candidateCount: 1,
    comparableCandidateCount: 1,
    promotionReadyCandidateCount: 0,
    recommendedForPromotion: false,
    selected: {
      attemptId: "att_selected",
      runtime: "codex-cli",
      status: "running",
      sourceKind: "delegated",
      hasComparablePayload: true,
      isSelected: true,
      recommendedForPromotion: false,
      explanationCode: "required_checks_pending",
      blockingRequiredCheckNames: ["lint"],
      failedOrErrorCheckNames: [],
      pendingCheckNames: ["lint"],
      skippedCheckNames: []
    },
    blockingReasons: ["required_checks_pending"],
    canPromote: false,
    hasBlockingReasons: true,
    ...overrides
  };
}

function createHandoffDecisionSummary(
  overrides: Partial<AttemptHandoffDecisionSummary> = {}
): AttemptHandoffDecisionSummary {
  return {
    decisionBasis: "handoff_explanation_summary",
    resultCount: 1,
    invokedResultCount: 0,
    blockedResultCount: 1,
    blockingReasons: ["handoff_unsupported"],
    canFinalizeHandoff: false,
    hasBlockingReasons: true,
    ...overrides
  };
}

function createCloseoutDecisionSummary(
  overrides: Partial<AttemptHandoffFinalizationCloseoutDecisionSummary> = {}
): AttemptHandoffFinalizationCloseoutDecisionSummary {
  return {
    decisionBasis: "handoff_finalization_closure_summary",
    resultCount: 1,
    invokedResultCount: 0,
    blockedResultCount: 1,
    groupCount: 1,
    reportingDisposition: "all_blocked",
    blockingReasons: ["handoff_finalization_unsupported"],
    canAdvanceFromCloseout: false,
    hasBlockingReasons: true,
    ...overrides
  };
}
