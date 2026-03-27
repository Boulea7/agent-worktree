import { describe, expect, it } from "vitest";

import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnCandidate,
  deriveExecutionSessionSpawnTarget
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state spawn-target helpers", () => {
  it("should derive a spawn target from a spawnable candidate", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_active",
          sessionId: "thr_active",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_active"
      }
    });

    expect(
      deriveExecutionSessionSpawnTarget({
        candidate: candidate!
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
  });

  it("should return undefined when the candidate is blocked", () => {
    const blockedCandidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_terminal",
          sessionId: "thr_terminal",
          sourceKind: "direct",
          lifecycleState: "failed"
        })
      ]),
      selector: {
        attemptId: "att_terminal"
      }
    });

    expect(
      deriveExecutionSessionSpawnTarget({
        candidate: blockedCandidate!
      })
    ).toBeUndefined();
  });

  it("should derive the same spawn target shape through attemptId and sessionId selection paths", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);
    const candidateByAttemptId = deriveExecutionSessionSpawnCandidate({
      view,
      selector: {
        attemptId: "att_active"
      }
    });
    const candidateBySessionId = deriveExecutionSessionSpawnCandidate({
      view,
      selector: {
        sessionId: "thr_active"
      }
    });

    expect(
      deriveExecutionSessionSpawnTarget({
        candidate: candidateByAttemptId!
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
    expect(
      deriveExecutionSessionSpawnTarget({
        candidate: candidateBySessionId!
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
  });

  it("should return undefined when the candidate has an unknown session", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_unknown_session",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_unknown_session"
      }
    });

    expect(
      deriveExecutionSessionSpawnTarget({
        candidate: candidate!
      })
    ).toBeUndefined();
  });

  it("should return undefined when child limits still block spawning", () => {
    const rootRecord = createRecord({
      attemptId: "att_parent",
      sessionId: "thr_parent",
      sourceKind: "direct",
      lifecycleState: "active",
      guardrails: {
        maxChildren: 1
      }
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      sessionId: "thr_child",
      sourceKind: "fork",
      parentAttemptId: "att_parent",
      lifecycleState: "active"
    });
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([rootRecord, childRecord]),
      selector: {
        attemptId: "att_parent"
      }
    });

    expect(
      deriveExecutionSessionSpawnTarget({
        candidate: candidate!
      })
    ).toBeUndefined();
  });

  it("should derive a spawn target without mutating the candidate", () => {
    const record = createRecord({
      attemptId: "att_chain",
      sessionId: "thr_chain",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([record]),
      selector: {
        attemptId: "att_chain"
      }
    })!;
    const candidateSnapshot = JSON.parse(JSON.stringify(candidate));

    expect(
      deriveExecutionSessionSpawnTarget({
        candidate
      })
    ).toEqual({
      attemptId: "att_chain",
      runtime: "codex-cli",
      sessionId: "thr_chain"
    });
    expect(candidate).toEqual(candidateSnapshot);
  });

  it("should keep child lineage and worktree planning details out of the target", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_target",
          sessionId: "thr_target",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_target"
      }
    });
    const target = deriveExecutionSessionSpawnTarget({
      candidate: candidate!
    });

    expect(target).toEqual({
      attemptId: "att_target",
      runtime: "codex-cli",
      sessionId: "thr_target"
    });
    expect(target).not.toHaveProperty("sourceKind");
    expect(target).not.toHaveProperty("parentAttemptId");
    expect(target).not.toHaveProperty("childAttemptId");
    expect(target).not.toHaveProperty("branch");
    expect(target).not.toHaveProperty("worktreePath");
  });

  it("should preserve known-depth blocked candidate semantics when target derivation returns undefined", () => {
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
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        rootRecord,
        selectedRecord,
        childRecord
      ]),
      selector: {
        attemptId: "att_known_depth"
      }
    })!;
    const candidateSnapshot = JSON.parse(JSON.stringify(candidate));

    expect(candidate.readiness).toEqual({
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
    expect(
      deriveExecutionSessionSpawnTarget({
        candidate
      })
    ).toBeUndefined();
    expect(candidate).toEqual(candidateSnapshot);
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
