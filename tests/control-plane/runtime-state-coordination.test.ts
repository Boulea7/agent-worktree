import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionCoordinationBoard,
  deriveExecutionCoordinationTaskFromCloseoutDecision,
  deriveExecutionCoordinationTaskFromHandoffDecision,
  deriveExecutionCoordinationTaskFromPromotionDecision,
  deriveExecutionCoordinationTaskFromSpawnCandidate,
  deriveExecutionCoordinationTaskFromSpawnHeadlessWaitCandidate,
  type ExecutionCoordinationTask,
  type ExecutionSessionSpawnCandidate,
  type ExecutionSessionSpawnHeadlessWaitCandidate
} from "../../src/control-plane/internal.js";
import type {
  AttemptHandoffDecisionSummary,
  AttemptHandoffFinalizationCloseoutDecisionSummary,
  AttemptPromotionDecisionSummary
} from "../../src/selection/internal.js";

describe("control-plane runtime-state coordination helpers", () => {
  it("should derive a pending delegated-work task from a spawnable candidate", () => {
    const candidate = createSpawnCandidate();

    expect(
      deriveExecutionCoordinationTaskFromSpawnCandidate({
        id: "spawn-parent",
        updatedAt: "2026-04-14T00:00:00.000Z",
        requestedCount: 2,
        candidate
      })
    ).toEqual({
      id: "spawn-parent",
      kind: "delegated_work",
      title: "Delegate 2 child attempt(s) from att_parent",
      status: "pending",
      owner: {
        attemptId: "att_parent",
        runtime: "codex-cli"
      },
      dependsOnTaskIds: [],
      blockingReasons: [],
      updatedAt: "2026-04-14T00:00:00.000Z"
    });
  });

  it("should derive a blocked delegated-work task from a blocked spawn candidate", () => {
    const candidate = createSpawnCandidate({
      readiness: {
        blockingReasons: ["child_limit_reached"],
        canSpawn: false,
        hasBlockingReasons: true,
        lineageDepth: 0,
        lineageDepthKnown: true,
        withinChildLimit: false,
        withinDepthLimit: true
      }
    });

    expect(
      deriveExecutionCoordinationTaskFromSpawnCandidate({
        id: "spawn-blocked",
        updatedAt: "2026-04-14T00:00:00.000Z",
        requestedCount: 1,
        candidate,
        dependsOnTaskIds: ["review"]
      })
    ).toEqual({
      id: "spawn-blocked",
      kind: "delegated_work",
      title: "Delegate 1 child attempt(s) from att_parent",
      status: "blocked",
      owner: {
        attemptId: "att_parent",
        runtime: "codex-cli"
      },
      dependsOnTaskIds: ["review"],
      blockingReasons: ["child_limit_reached"],
      updatedAt: "2026-04-14T00:00:00.000Z"
    });
  });

  it("should derive an in-progress blocked-child task from a waitable headless child candidate", () => {
    const headlessWaitCandidate = createHeadlessWaitCandidate();

    expect(
      deriveExecutionCoordinationTaskFromSpawnHeadlessWaitCandidate({
        id: "child-followup",
        updatedAt: "2026-04-14T00:00:00.000Z",
        headlessWaitCandidate
      })
    ).toEqual({
      id: "child-followup",
      kind: "blocked_child",
      title: "Track child attempt att_child readiness",
      status: "in_progress",
      owner: {
        attemptId: "att_child",
        runtime: "codex-cli"
      },
      dependsOnTaskIds: [],
      blockingReasons: [],
      updatedAt: "2026-04-14T00:00:00.000Z"
    });
  });

  it("should derive a blocked-child task with stable blockers from a non-waitable headless child candidate", () => {
    const headlessWaitCandidate = createHeadlessWaitCandidate({
      candidate: {
        context: {
          ...createSpawnCandidate().context,
          record: {
            ...createSpawnCandidate().context.record,
            attemptId: "att_child",
            sessionId: "thr_child"
          }
        },
        readiness: {
          blockingReasons: ["descendant_coverage_incomplete", "child_attempts_present"],
          canWait: false,
          hasBlockingReasons: true
        }
      }
    });

    expect(
      deriveExecutionCoordinationTaskFromSpawnHeadlessWaitCandidate({
        id: "child-blocked",
        updatedAt: "2026-04-14T00:00:00.000Z",
        headlessWaitCandidate
      })
    ).toEqual({
      id: "child-blocked",
      kind: "blocked_child",
      title: "Track child attempt att_child readiness",
      status: "blocked",
      owner: {
        attemptId: "att_child",
        runtime: "codex-cli"
      },
      dependsOnTaskIds: [],
      blockingReasons: [
        "descendant_coverage_incomplete",
        "child_attempts_present"
      ],
      updatedAt: "2026-04-14T00:00:00.000Z"
    });
  });

  it("should derive verifier, review, and closeout tasks from existing selection summaries", () => {
    expect(
      deriveExecutionCoordinationTaskFromPromotionDecision({
        id: "verify",
        updatedAt: "2026-04-14T00:00:00.000Z",
        summary: createPromotionDecisionSummary()
      })
    ).toEqual({
      id: "verify",
      kind: "verifier_handoff",
      title: "Verify promotion readiness for task task_shared",
      status: "in_progress",
      owner: {
        attemptId: "att_selected",
        runtime: "codex-cli"
      },
      dependsOnTaskIds: [],
      blockingReasons: ["required_checks_pending"],
      updatedAt: "2026-04-14T00:00:00.000Z"
    });

    expect(
      deriveExecutionCoordinationTaskFromHandoffDecision({
        id: "review",
        updatedAt: "2026-04-14T00:00:00.000Z",
        summary: createHandoffDecisionSummary()
      })
    ).toEqual({
      id: "review",
      kind: "review_handoff",
      title: "Finalize review handoff readiness",
      status: "blocked",
      dependsOnTaskIds: [],
      blockingReasons: ["handoff_unsupported"],
      updatedAt: "2026-04-14T00:00:00.000Z"
    });

    expect(
      deriveExecutionCoordinationTaskFromCloseoutDecision({
        id: "closeout",
        updatedAt: "2026-04-14T00:00:00.000Z",
        summary: createCloseoutDecisionSummary({
          canAdvanceFromCloseout: true,
          hasBlockingReasons: false,
          blockingReasons: []
        }),
        dependsOnTaskIds: ["verify", "review"]
      })
    ).toEqual({
      id: "closeout",
      kind: "closeout_readiness",
      title: "Advance closeout readiness",
      status: "completed",
      dependsOnTaskIds: ["verify", "review"],
      blockingReasons: [],
      updatedAt: "2026-04-14T00:00:00.000Z"
    });
  });

  it("should derive a coordination board with ready and dependency-blocked summaries", () => {
    const board = deriveExecutionCoordinationBoard({
      tasks: [
        createTask({
          id: "verify",
          kind: "verifier_handoff",
          status: "completed"
        }),
        createTask({
          id: "review",
          kind: "review_handoff",
          status: "pending",
          dependsOnTaskIds: ["verify"]
        }),
        createTask({
          id: "closeout",
          kind: "closeout_readiness",
          status: "pending",
          dependsOnTaskIds: ["review"]
        }),
        createTask({
          id: "child",
          kind: "blocked_child",
          status: "blocked",
          blockingReasons: ["session_unknown"]
        })
      ]
    });

    expect(board.summary).toEqual({
      totalTaskCount: 4,
      pendingTaskCount: 2,
      inProgressTaskCount: 0,
      blockedTaskCount: 1,
      completedTaskCount: 1,
      droppedTaskCount: 0,
      readyTaskCount: 1,
      dependencyBlockedTaskCount: 1,
      readyTaskIds: ["review"],
      dependencyBlockedTaskIds: ["closeout"],
      blockedTaskIds: ["child"],
      completedTaskIds: ["verify"]
    });
  });

  it("should fail loudly on duplicate ids, missing dependencies, self dependencies, and blocked tasks without blockers", () => {
    expect(() =>
      deriveExecutionCoordinationBoard({
        tasks: [
          createTask({
            id: "dup"
          }),
          createTask({
            id: "dup"
          })
        ]
      })
    ).toThrow(ValidationError);

    expect(() =>
      deriveExecutionCoordinationBoard({
        tasks: [
          createTask({
            id: "needs-missing",
            dependsOnTaskIds: ["missing"]
          })
        ]
      })
    ).toThrow(/existing task ids/i);

    expect(() =>
      deriveExecutionCoordinationBoard({
        tasks: [
          createTask({
            id: "self",
            dependsOnTaskIds: ["self"]
          })
        ]
      })
    ).toThrow(/must not depend on itself/i);

    expect(() =>
      deriveExecutionCoordinationBoard({
        tasks: [
          createTask({
            id: "blocked",
            status: "blocked",
            blockingReasons: []
          })
        ]
      })
    ).toThrow(/blocked tasks to keep at least one blocking reason/i);
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
  return {
    headlessContext: {
      context: {
        ...createSpawnCandidate().context,
        record: {
          ...createSpawnCandidate().context.record,
          attemptId: "att_child",
          sessionId: "thr_child"
        }
      },
      headlessView: {} as never
    },
    candidate: {
      context: {
        ...createSpawnCandidate().context,
        record: {
          ...createSpawnCandidate().context.record,
          attemptId: "att_child",
          sessionId: "thr_child"
        }
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

function createTask(
  overrides: Partial<ExecutionCoordinationTask> & Pick<ExecutionCoordinationTask, "id">
): ExecutionCoordinationTask {
  return {
    kind: "review_handoff",
    title: `${overrides.id} title`,
    status: "pending",
    dependsOnTaskIds: [],
    blockingReasons: [],
    updatedAt: "2026-04-14T00:00:00.000Z",
    ...overrides
  };
}
