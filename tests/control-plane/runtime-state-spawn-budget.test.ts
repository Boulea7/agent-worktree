import { describe, expect, it } from "vitest";

import {
  buildExecutionSessionView,
  deriveExecutionSessionContext,
  deriveExecutionSessionSpawnBudget
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state spawn-budget helpers", () => {
  it("should derive an unbounded budget when no guardrails are present", () => {
    const context = createContext([
      createRecord({
        attemptId: "att_root",
        sessionId: "thr_root",
        sourceKind: "direct",
        lifecycleState: "active"
      })
    ]);

    expect(
      deriveExecutionSessionSpawnBudget({
        context,
        view: contextView(context)
      })
    ).toEqual({
      childCount: 0,
      lineageDepth: 0,
      lineageDepthKnown: true,
      withinChildLimit: true,
      withinDepthLimit: true
    });
  });

  it("should derive remaining child slots when maxChildren is present", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct",
      lifecycleState: "active",
      guardrails: {
        maxChildren: 3
      }
    });
    const childRecord = createRecord({
      attemptId: "att_child_a",
      sourceKind: "fork",
      parentAttemptId: "att_root",
      lifecycleState: "active"
    });
    const context = createContext([rootRecord, childRecord], "att_root");

    expect(
      deriveExecutionSessionSpawnBudget({
        context,
        view: contextView(context)
      })
    ).toEqual({
      childCount: 1,
      lineageDepth: 0,
      lineageDepthKnown: true,
      maxChildren: 3,
      remainingChildSlots: 2,
      withinChildLimit: true,
      withinDepthLimit: true
    });
  });

  it("should clamp remaining child slots to zero when maxChildren is exhausted", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct",
      lifecycleState: "active",
      guardrails: {
        maxChildren: 1
      }
    });
    const childA = createRecord({
      attemptId: "att_child_a",
      sourceKind: "fork",
      parentAttemptId: "att_root",
      lifecycleState: "active"
    });
    const childB = createRecord({
      attemptId: "att_child_b",
      sourceKind: "delegated",
      parentAttemptId: "att_root",
      lifecycleState: "active"
    });
    const context = createContext([rootRecord, childA, childB], "att_root");

    expect(
      deriveExecutionSessionSpawnBudget({
        context,
        view: contextView(context)
      })
    ).toEqual({
      childCount: 2,
      lineageDepth: 0,
      lineageDepthKnown: true,
      maxChildren: 1,
      remainingChildSlots: 0,
      withinChildLimit: false,
      withinDepthLimit: true
    });
  });

  it("should derive remaining depth allowance when maxDepth is present and lineage is known", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      sessionId: "thr_child",
      sourceKind: "fork",
      parentAttemptId: "att_root",
      lifecycleState: "active",
      guardrails: {
        maxDepth: 3
      }
    });
    const context = createContext([rootRecord, childRecord], "att_child");

    expect(
      deriveExecutionSessionSpawnBudget({
        context,
        view: contextView(context)
      })
    ).toEqual({
      childCount: 0,
      lineageDepth: 1,
      lineageDepthKnown: true,
      maxDepth: 3,
      remainingDepthAllowance: 1,
      withinChildLimit: true,
      withinDepthLimit: true
    });
  });

  it("should clamp remaining depth allowance to zero when maxDepth is exhausted", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      sessionId: "thr_child",
      sourceKind: "fork",
      parentAttemptId: "att_root",
      lifecycleState: "active",
      guardrails: {
        maxDepth: 1
      }
    });
    const context = createContext([rootRecord, childRecord], "att_child");

    expect(
      deriveExecutionSessionSpawnBudget({
        context,
        view: contextView(context)
      })
    ).toEqual({
      childCount: 0,
      lineageDepth: 1,
      lineageDepthKnown: true,
      maxDepth: 1,
      remainingDepthAllowance: 0,
      withinChildLimit: true,
      withinDepthLimit: false
    });
  });

  it("should keep remaining depth allowance undefined when maxDepth is present but lineage is unknown", () => {
    const orphanRecord = createRecord({
      attemptId: "att_orphan",
      sessionId: "thr_orphan",
      sourceKind: "delegated",
      parentAttemptId: "att_missing_parent",
      lifecycleState: "active",
      guardrails: {
        maxDepth: 3
      }
    });
    const context = createContext([orphanRecord], "att_orphan");

    expect(
      deriveExecutionSessionSpawnBudget({
        context,
        view: contextView(context)
      })
    ).toEqual({
      childCount: 0,
      lineageDepth: undefined,
      lineageDepthKnown: false,
      maxDepth: 3,
      withinChildLimit: true,
      withinDepthLimit: false
    });
  });

  it("should keep lineage depth known when the selected record carries a padded parentAttemptId", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const childRecord = createRecord({
      attemptId: "  att_child  ",
      sessionId: "thr_child",
      sourceKind: "fork",
      parentAttemptId: "  att_root  ",
      lifecycleState: "active",
      guardrails: {
        maxDepth: 3
      }
    });
    const context = createContext([rootRecord, childRecord], "att_child");

    expect(
      deriveExecutionSessionSpawnBudget({
        context,
        view: buildExecutionSessionView([rootRecord, childRecord])
      })
    ).toEqual({
      childCount: 0,
      lineageDepth: 1,
      lineageDepthKnown: true,
      maxDepth: 3,
      remainingDepthAllowance: 1,
      withinChildLimit: true,
      withinDepthLimit: true
    });
  });
});

function createContext(
  records: readonly ExecutionSessionRecord[],
  attemptId = records[0]?.attemptId ?? "att_root"
) {
  const view = buildExecutionSessionView(records);
  const context = deriveExecutionSessionContext({
    view,
    selector: {
      attemptId
    }
  });

  if (!context) {
    throw new Error("Expected context to resolve.");
  }

  return context;
}

function contextView(
  context: ReturnType<typeof createContext>
): ReturnType<typeof buildExecutionSessionView> {
  return buildExecutionSessionView([
    context.record,
    ...context.childRecords,
    ...(context.parentRecord ? [context.parentRecord] : [])
  ]);
}

function createRecord(
  overrides: Partial<ExecutionSessionRecord> & Pick<ExecutionSessionRecord, "attemptId">
): ExecutionSessionRecord {
  return {
    attemptId: overrides.attemptId,
    origin: "headless_result",
    runtime: overrides.runtime ?? "codex-cli",
    sourceKind: overrides.sourceKind ?? "direct",
    lifecycleState: overrides.lifecycleState ?? "created",
    runCompleted: overrides.runCompleted ?? false,
    errorEventCount: overrides.errorEventCount ?? 0,
    ...(overrides.sessionId === undefined ? {} : { sessionId: overrides.sessionId }),
    ...(overrides.parentAttemptId === undefined
      ? {}
      : { parentAttemptId: overrides.parentAttemptId }),
    ...(overrides.guardrails === undefined ? {} : { guardrails: overrides.guardrails }),
    ...(overrides.turnStatus === undefined ? {} : { turnStatus: overrides.turnStatus }),
    ...(overrides.lastAgentMessage === undefined
      ? {}
      : { lastAgentMessage: overrides.lastAgentMessage }),
    ...(overrides.lastErrorMessage === undefined
      ? {}
      : { lastErrorMessage: overrides.lastErrorMessage }),
    ...(overrides.usage === undefined ? {} : { usage: overrides.usage })
  };
}
