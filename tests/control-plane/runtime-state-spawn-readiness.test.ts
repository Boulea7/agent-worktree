import { describe, expect, it } from "vitest";

import {
  buildExecutionSessionView,
  deriveExecutionSessionContext,
  deriveExecutionSessionSpawnReadiness
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state spawn-readiness helpers", () => {
  it("should allow spawn for an active root with a known session and no guardrails", () => {
    const context = createContext([
      createRecord({
        attemptId: "att_root",
        sessionId: "thr_root",
        sourceKind: "direct",
        lifecycleState: "active"
      })
    ]);

    expect(
      deriveExecutionSessionSpawnReadiness({
        context,
        view: contextView(context)
      })
    ).toEqual({
      blockingReasons: [],
      canSpawn: true,
      hasBlockingReasons: false,
      lineageDepth: 0,
      lineageDepthKnown: true,
      withinDepthLimit: true,
      withinChildLimit: true
    });
  });

  it("should allow spawn when maxChildren is present but not yet reached", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct",
      lifecycleState: "active",
      guardrails: {
        maxChildren: 2
      }
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      sessionId: "thr_child",
      sourceKind: "fork",
      parentAttemptId: "att_root",
      lifecycleState: "active"
    });
    const context = createContext([rootRecord, childRecord], "att_root");

    expect(
      deriveExecutionSessionSpawnReadiness({
        context,
        view: contextView(context)
      })
    ).toEqual({
      blockingReasons: [],
      canSpawn: true,
      hasBlockingReasons: false,
      lineageDepth: 0,
      lineageDepthKnown: true,
      withinDepthLimit: true,
      withinChildLimit: true
    });
  });

  it("should block spawn when maxChildren has been reached", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct",
      lifecycleState: "active",
      guardrails: {
        maxChildren: 2
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
      deriveExecutionSessionSpawnReadiness({
        context,
        view: contextView(context)
      })
    ).toEqual({
      blockingReasons: ["child_limit_reached"],
      canSpawn: false,
      hasBlockingReasons: true,
      lineageDepth: 0,
      lineageDepthKnown: true,
      withinDepthLimit: true,
      withinChildLimit: false
    });
  });

  it("should allow spawn when resolved lineage stays within maxDepth", () => {
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
        maxDepth: 2
      }
    });
    const context = createContext([rootRecord, childRecord], "att_child");

    expect(
      deriveExecutionSessionSpawnReadiness({
        context,
        view: contextView(context)
      })
    ).toEqual({
      blockingReasons: [],
      canSpawn: true,
      hasBlockingReasons: false,
      lineageDepth: 1,
      lineageDepthKnown: true,
      withinDepthLimit: true,
      withinChildLimit: true
    });
  });

  it("should block spawn when resolved lineage would exceed maxDepth", () => {
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
      deriveExecutionSessionSpawnReadiness({
        context,
        view: contextView(context)
      })
    ).toEqual({
      blockingReasons: ["depth_limit_reached"],
      canSpawn: false,
      hasBlockingReasons: true,
      lineageDepth: 1,
      lineageDepthKnown: true,
      withinDepthLimit: false,
      withinChildLimit: true
    });
  });

  it("should keep unresolved lineage neutral when maxDepth is absent", () => {
    const orphanRecord = createRecord({
      attemptId: "att_orphan",
      sessionId: "thr_orphan",
      sourceKind: "delegated",
      parentAttemptId: "att_missing_parent",
      lifecycleState: "active"
    });
    const context = createContext([orphanRecord], "att_orphan");

    expect(
      deriveExecutionSessionSpawnReadiness({
        context,
        view: contextView(context)
      })
    ).toEqual({
      blockingReasons: [],
      canSpawn: true,
      hasBlockingReasons: false,
      lineageDepth: undefined,
      lineageDepthKnown: false,
      withinDepthLimit: true,
      withinChildLimit: true
    });
  });

  it("should block spawn when maxDepth is present but lineage depth is unknown", () => {
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
      deriveExecutionSessionSpawnReadiness({
        context,
        view: contextView(context)
      })
    ).toEqual({
      blockingReasons: ["lineage_depth_unknown"],
      canSpawn: false,
      hasBlockingReasons: true,
      lineageDepth: undefined,
      lineageDepthKnown: false,
      withinDepthLimit: false,
      withinChildLimit: true
    });
  });

  it("should block spawn with lineage_depth_unknown for cyclic lineage when maxDepth is present", () => {
    const recordA = createRecord({
      attemptId: "att_a",
      sessionId: "thr_a",
      sourceKind: "delegated",
      parentAttemptId: "att_b",
      lifecycleState: "active",
      guardrails: {
        maxDepth: 3
      }
    });
    const recordB = createRecord({
      attemptId: "att_b",
      sessionId: "thr_b",
      sourceKind: "fork",
      parentAttemptId: "att_a",
      lifecycleState: "active"
    });
    const context = createContext([recordA, recordB], "att_a");

    expect(
      deriveExecutionSessionSpawnReadiness({
        context,
        view: contextView(context)
      })
    ).toEqual({
      blockingReasons: ["lineage_depth_unknown"],
      canSpawn: false,
      hasBlockingReasons: true,
      lineageDepth: undefined,
      lineageDepthKnown: false,
      withinDepthLimit: false,
      withinChildLimit: true
    });
  });

  it("should preserve blocker ordering when lifecycle, session, depth, and child limits all block with known lineage depth", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const selectedRecord = createRecord({
      attemptId: "att_known_depth",
      sourceKind: "delegated",
      parentAttemptId: "att_root",
      lifecycleState: "failed",
      guardrails: {
        maxChildren: 1,
        maxDepth: 1
      }
    });
    const childRecord = createRecord({
      attemptId: "att_known_depth_child",
      sourceKind: "fork",
      parentAttemptId: "att_known_depth",
      lifecycleState: "active"
    });
    const context = createContext(
      [rootRecord, selectedRecord, childRecord],
      "att_known_depth"
    );

    expect(
      deriveExecutionSessionSpawnReadiness({
        context,
        view: contextView(context)
      })
    ).toEqual({
      blockingReasons: [
        "lifecycle_terminal",
        "session_unknown",
        "depth_limit_reached",
        "child_limit_reached"
      ],
      canSpawn: false,
      hasBlockingReasons: true,
      lineageDepth: 1,
      lineageDepthKnown: true,
      withinDepthLimit: false,
      withinChildLimit: false
    });
  });

  it("should preserve blocker ordering when lifecycle, session, lineage, and child limits all block", () => {
    const selectedRecord = createRecord({
      attemptId: "att_gap",
      sourceKind: "delegated",
      parentAttemptId: "att_missing_parent",
      lifecycleState: "failed",
      guardrails: {
        maxChildren: 1,
        maxDepth: 3
      }
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      sourceKind: "fork",
      parentAttemptId: "att_gap",
      lifecycleState: "active"
    });
    const context = createContext([selectedRecord, childRecord], "att_gap");

    expect(
      deriveExecutionSessionSpawnReadiness({
        context,
        view: contextView(context)
      })
    ).toEqual({
      blockingReasons: [
        "lifecycle_terminal",
        "session_unknown",
        "lineage_depth_unknown",
        "child_limit_reached"
      ],
      canSpawn: false,
      hasBlockingReasons: true,
      lineageDepth: undefined,
      lineageDepthKnown: false,
      withinDepthLimit: false,
      withinChildLimit: false
    });
  });
});

function createContext(
  records: ExecutionSessionRecord[],
  attemptId = records[0]!.attemptId
) {
  const view = buildExecutionSessionView(records);
  const context = deriveExecutionSessionContext({
    view,
    selector: {
      attemptId
    }
  });

  if (context === undefined) {
    throw new Error(`Expected context for ${attemptId}.`);
  }

  return Object.assign(context, { __testView: view });
}

function contextView(
  context: ReturnType<typeof createContext>
) {
  return context.__testView;
}

function createRecord(
  overrides: Partial<ExecutionSessionRecord> &
    Pick<ExecutionSessionRecord, "attemptId" | "sourceKind">
): ExecutionSessionRecord {
  const { attemptId, sourceKind, ...rest } = overrides;

  return {
    attemptId,
    runtime: "codex-cli",
    sourceKind,
    lifecycleState: "created",
    runCompleted: false,
    errorEventCount: 0,
    origin: "headless_result",
    ...rest
  };
}
