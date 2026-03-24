import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnCandidate
} from "../../src/control-plane/index.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state spawn-candidate helpers", () => {
  it("should derive a spawn candidate from an attemptId selector", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);

    expect(
      deriveExecutionSessionSpawnCandidate({
        view,
        selector: {
          attemptId: "att_active"
        }
      })
    ).toEqual({
      context: {
        record,
        selectedBy: "attemptId",
        childRecords: [],
        hasKnownSession: true,
        hasParent: false,
        hasResolvedParent: false,
        hasChildren: false
      },
      readiness: {
        blockingReasons: [],
        canSpawn: true,
        hasBlockingReasons: false,
        lineageDepth: 0,
        lineageDepthKnown: true,
        withinDepthLimit: true,
        withinChildLimit: true
      }
    });
  });

  it("should derive a spawn candidate from a sessionId selector", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);

    expect(
      deriveExecutionSessionSpawnCandidate({
        view,
        selector: {
          sessionId: "thr_active"
        }
      })
    ).toEqual({
      context: {
        record,
        selectedBy: "sessionId",
        childRecords: [],
        hasKnownSession: true,
        hasParent: false,
        hasResolvedParent: false,
        hasChildren: false
      },
      readiness: {
        blockingReasons: [],
        canSpawn: true,
        hasBlockingReasons: false,
        lineageDepth: 0,
        lineageDepthKnown: true,
        withinDepthLimit: true,
        withinChildLimit: true
      }
    });
  });

  it("should return undefined when the selector does not resolve a record", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);

    expect(
      deriveExecutionSessionSpawnCandidate({
        view,
        selector: {
          attemptId: "att_missing"
        }
      })
    ).toBeUndefined();
    expect(
      deriveExecutionSessionSpawnCandidate({
        view,
        selector: {
          sessionId: "thr_missing"
        }
      })
    ).toBeUndefined();
  });

  it("should reject invalid selectors using the existing selector rules", () => {
    const view = buildExecutionSessionView([
      createRecord({
        attemptId: "att_active",
        sessionId: "thr_active",
        sourceKind: "direct",
        lifecycleState: "active"
      })
    ]);

    expect(() =>
      deriveExecutionSessionSpawnCandidate({
        view,
        selector: {}
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnCandidate({
        view,
        selector: {
          attemptId: "att_active",
          sessionId: "thr_active"
        }
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnCandidate({
        view,
        selector: {
          attemptId: "   "
        }
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnCandidate({
        view,
        selector: {
          sessionId: "   "
        }
      })
    ).toThrow(ValidationError);
  });

  it("should keep unresolved parents neutral when other spawn blockers are absent", () => {
    const orphanRecord = createRecord({
      attemptId: "att_orphan",
      sessionId: "thr_orphan",
      sourceKind: "delegated",
      parentAttemptId: "att_missing_parent",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([orphanRecord]);

    expect(
      deriveExecutionSessionSpawnCandidate({
        view,
        selector: {
          attemptId: "att_orphan"
        }
      })
    ).toEqual({
      context: {
        record: orphanRecord,
        selectedBy: "attemptId",
        childRecords: [],
        hasKnownSession: true,
        hasParent: true,
        hasResolvedParent: false,
        hasChildren: false
      },
      readiness: {
        blockingReasons: [],
        canSpawn: true,
        hasBlockingReasons: false,
        lineageDepth: undefined,
        lineageDepthKnown: false,
        withinDepthLimit: true,
        withinChildLimit: true
      }
    });
  });

  it("should preserve blocked spawn-readiness when candidate composition succeeds", () => {
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
    const view = buildExecutionSessionView([selectedRecord, childRecord]);

    expect(
      deriveExecutionSessionSpawnCandidate({
        view,
        selector: {
          attemptId: "att_gap"
        }
      })
    ).toEqual({
      context: {
        record: selectedRecord,
        selectedBy: "attemptId",
        childRecords: [childRecord],
        hasKnownSession: false,
        hasParent: true,
        hasResolvedParent: false,
        hasChildren: true
      },
      readiness: {
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
      }
    });
  });
});

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
