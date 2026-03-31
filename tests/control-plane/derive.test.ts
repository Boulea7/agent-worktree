import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildSessionTreeIndex,
  classifySessionLifecycleState,
  deriveSessionNodeRef,
  deriveSessionSnapshot,
  normalizeSessionGuardrails
} from "../../src/control-plane/derive.js";

describe("control-plane derive helpers", () => {
  it("should normalize missing source metadata as a direct root node", () => {
    expect(
      deriveSessionNodeRef({
        attemptId: "att_root"
      })
    ).toEqual({
      attemptId: "att_root",
      nodeKind: "root",
      sourceKind: "direct"
    });
  });

  it("should preserve child lineage without validating parent existence", () => {
    expect(
      deriveSessionNodeRef({
        attemptId: "att_child",
        sourceKind: "delegated",
        parentAttemptId: "att_missing_parent"
      })
    ).toEqual({
      attemptId: "att_child",
      nodeKind: "child",
      sourceKind: "delegated",
      parentAttemptId: "att_missing_parent"
    });
  });

  it("should reject contradictory lineage metadata", () => {
    expect(() =>
      deriveSessionNodeRef({
        attemptId: "att_direct",
        sourceKind: "direct",
        parentAttemptId: "att_parent"
      })
    ).toThrow(ValidationError);

    expect(() =>
      deriveSessionNodeRef({
        attemptId: "att_delegated",
        sourceKind: "delegated"
      })
    ).toThrow(ValidationError);

    expect(() =>
      deriveSessionNodeRef({
        attemptId: "att_same",
        sourceKind: "fork",
        parentAttemptId: "att_same"
      })
    ).toThrow(ValidationError);
  });

  it("should reject blank attempt identifiers", () => {
    expect(() =>
      deriveSessionNodeRef({
        attemptId: "   "
      })
    ).toThrow(ValidationError);
  });

  it("should classify lifecycle states from bounded internal signals", () => {
    expect(classifySessionLifecycleState()).toBe("created");

    expect(
      classifySessionLifecycleState({
        observation: {
          threadId: "thr_demo",
          runCompleted: false,
          errorEventCount: 0
        }
      })
    ).toBe("active");

    expect(
      classifySessionLifecycleState({
        observation: {
          runCompleted: true,
          errorEventCount: 0
        }
      })
    ).toBe("completed");

    expect(
      classifySessionLifecycleState({
        observation: {
          runCompleted: false,
          errorEventCount: 1,
          lastErrorMessage: "failed"
        }
      })
    ).toBe("failed");

    expect(
      classifySessionLifecycleState({
        lifecycleEventKind: "spawn_requested",
        observation: {
          threadId: "thr_demo",
          runCompleted: false,
          errorEventCount: 0
        }
      })
    ).toBe("active");

    expect(
      classifySessionLifecycleState({
        lifecycleEventKind: "spawn_recorded",
        observation: {
          threadId: "thr_demo",
          runCompleted: false,
          errorEventCount: 0
        }
      })
    ).toBe("active");

    expect(
      classifySessionLifecycleState({
        lifecycleEventKind: "close_requested",
        observation: {
          threadId: "thr_demo",
          runCompleted: false,
          errorEventCount: 0
        }
      })
    ).toBe("active");

    expect(
      classifySessionLifecycleState({
        lifecycleEventKind: "close_recorded",
        observation: {
          threadId: "thr_demo",
          runCompleted: false,
          errorEventCount: 0
        }
      })
    ).toBe("closed");
  });

  it("should derive snapshots without mutating the source input", () => {
    const input = {
      attemptId: "att_child",
      runtime: "codex-cli",
      sourceKind: "fork" as const,
      parentAttemptId: "att_parent",
      observation: {
        threadId: "thr_demo",
        runCompleted: false,
        errorEventCount: 0,
        lastAgentMessage: "partial"
      },
      guardrails: {
        maxChildren: 2,
        maxDepth: 3
      },
      lifecycleEventKind: "spawn_recorded" as const
    };

    const snapshot = deriveSessionSnapshot(input);

    expect(snapshot).toEqual({
      node: {
        attemptId: "att_child",
        nodeKind: "child",
        sourceKind: "fork",
        parentAttemptId: "att_parent"
      },
      lifecycleState: "active",
      sessionRef: {
        runtime: "codex-cli",
        sessionId: "thr_demo"
      },
      runCompleted: false,
      errorEventCount: 0,
      lastAgentMessage: "partial",
      guardrails: {
        maxChildren: 2,
        maxDepth: 3
      },
      lastLifecycleEventKind: "spawn_recorded"
    });
    expect(input).toEqual({
      attemptId: "att_child",
      runtime: "codex-cli",
      sourceKind: "fork",
      parentAttemptId: "att_parent",
      observation: {
        threadId: "thr_demo",
        runCompleted: false,
        errorEventCount: 0,
        lastAgentMessage: "partial"
      },
      guardrails: {
        maxChildren: 2,
        maxDepth: 3
      },
      lifecycleEventKind: "spawn_recorded"
    });
  });

  it("should preserve spawn_requested as a marker-only lifecycle event without closing the session", () => {
    const input = {
      attemptId: "att_spawn_requested",
      runtime: "codex-cli",
      observation: {
        threadId: "thr_spawn_requested",
        runCompleted: false,
        errorEventCount: 0,
        lastAgentMessage: "spawn requested"
      },
      lifecycleEventKind: "spawn_requested" as const
    };

    const snapshot = deriveSessionSnapshot(input);

    expect(snapshot).toEqual({
      node: {
        attemptId: "att_spawn_requested",
        nodeKind: "root",
        sourceKind: "direct"
      },
      lifecycleState: "active",
      sessionRef: {
        runtime: "codex-cli",
        sessionId: "thr_spawn_requested"
      },
      runCompleted: false,
      errorEventCount: 0,
      lastAgentMessage: "spawn requested",
      lastLifecycleEventKind: "spawn_requested"
    });
    expect(input).toEqual({
      attemptId: "att_spawn_requested",
      runtime: "codex-cli",
      observation: {
        threadId: "thr_spawn_requested",
        runCompleted: false,
        errorEventCount: 0,
        lastAgentMessage: "spawn requested"
      },
      lifecycleEventKind: "spawn_requested"
    });
  });

  it("should preserve spawn_recorded as a marker-only lifecycle event without closing the session", () => {
    const input = {
      attemptId: "att_spawn_recorded",
      runtime: "codex-cli",
      observation: {
        threadId: "thr_spawn_recorded",
        runCompleted: false,
        errorEventCount: 0,
        lastAgentMessage: "spawn recorded"
      },
      lifecycleEventKind: "spawn_recorded" as const
    };

    const snapshot = deriveSessionSnapshot(input);

    expect(snapshot).toEqual({
      node: {
        attemptId: "att_spawn_recorded",
        nodeKind: "root",
        sourceKind: "direct"
      },
      lifecycleState: "active",
      sessionRef: {
        runtime: "codex-cli",
        sessionId: "thr_spawn_recorded"
      },
      runCompleted: false,
      errorEventCount: 0,
      lastAgentMessage: "spawn recorded",
      lastLifecycleEventKind: "spawn_recorded"
    });
    expect(input).toEqual({
      attemptId: "att_spawn_recorded",
      runtime: "codex-cli",
      observation: {
        threadId: "thr_spawn_recorded",
        runCompleted: false,
        errorEventCount: 0,
        lastAgentMessage: "spawn recorded"
      },
      lifecycleEventKind: "spawn_recorded"
    });
  });

  it("should preserve close_requested as a recorded lifecycle marker without closing the session", () => {
    const input = {
      attemptId: "att_close_requested",
      runtime: "codex-cli",
      observation: {
        threadId: "thr_close_requested",
        runCompleted: false,
        errorEventCount: 0,
        lastAgentMessage: "pending close"
      },
      lifecycleEventKind: "close_requested" as const
    };

    const snapshot = deriveSessionSnapshot(input);

    expect(snapshot).toEqual({
      node: {
        attemptId: "att_close_requested",
        nodeKind: "root",
        sourceKind: "direct"
      },
      lifecycleState: "active",
      sessionRef: {
        runtime: "codex-cli",
        sessionId: "thr_close_requested"
      },
      runCompleted: false,
      errorEventCount: 0,
      lastAgentMessage: "pending close",
      lastLifecycleEventKind: "close_requested"
    });
    expect(input).toEqual({
      attemptId: "att_close_requested",
      runtime: "codex-cli",
      observation: {
        threadId: "thr_close_requested",
        runCompleted: false,
        errorEventCount: 0,
        lastAgentMessage: "pending close"
      },
      lifecycleEventKind: "close_requested"
    });
  });

  it("should preserve close_recorded as the lifecycle marker that closes the session", () => {
    const input = {
      attemptId: "att_close_recorded",
      runtime: "codex-cli",
      observation: {
        threadId: "thr_close_recorded",
        runCompleted: false,
        errorEventCount: 0,
        lastAgentMessage: "close recorded"
      },
      lifecycleEventKind: "close_recorded" as const
    };

    const snapshot = deriveSessionSnapshot(input);

    expect(snapshot).toEqual({
      node: {
        attemptId: "att_close_recorded",
        nodeKind: "root",
        sourceKind: "direct"
      },
      lifecycleState: "closed",
      sessionRef: {
        runtime: "codex-cli",
        sessionId: "thr_close_recorded"
      },
      runCompleted: false,
      errorEventCount: 0,
      lastAgentMessage: "close recorded",
      lastLifecycleEventKind: "close_recorded"
    });
    expect(input).toEqual({
      attemptId: "att_close_recorded",
      runtime: "codex-cli",
      observation: {
        threadId: "thr_close_recorded",
        runCompleted: false,
        errorEventCount: 0,
        lastAgentMessage: "close recorded"
      },
      lifecycleEventKind: "close_recorded"
    });
  });

  it("should build a session-tree index without validating missing parents", () => {
    const snapshots = [
      deriveSessionSnapshot({
        attemptId: "att_root",
        runtime: "codex-cli"
      }),
      deriveSessionSnapshot({
        attemptId: "att_child_a",
        runtime: "codex-cli",
        sourceKind: "fork",
        parentAttemptId: "att_root"
      }),
      deriveSessionSnapshot({
        attemptId: "att_child_b",
        runtime: "codex-cli",
        sourceKind: "delegated",
        parentAttemptId: "att_missing_parent"
      })
    ];

    const index = buildSessionTreeIndex(snapshots);

    expect(index.byAttemptId.get("att_root")).toMatchObject({
      node: {
        attemptId: "att_root",
        nodeKind: "root"
      }
    });
    expect(index.byAttemptId.get("att_child_a")).toMatchObject({
      node: {
        attemptId: "att_child_a",
        parentAttemptId: "att_root"
      }
    });
    expect(index.childAttemptIdsByParent.get("att_root")).toEqual(["att_child_a"]);
    expect(index.childAttemptIdsByParent.get("att_missing_parent")).toEqual([
      "att_child_b"
    ]);
  });

  it("should reject duplicate attempt snapshots while building an index", () => {
    expect(() =>
      buildSessionTreeIndex([
        deriveSessionSnapshot({
          attemptId: "att_duplicate",
          runtime: "codex-cli"
        }),
        deriveSessionSnapshot({
          attemptId: "att_duplicate",
          runtime: "codex-cli"
        })
      ])
    ).toThrow(ValidationError);
  });

  it("should reject blank attempt identifiers when building a session-tree index", () => {
    expect(() =>
      buildSessionTreeIndex([
        {
          node: {
            attemptId: "   ",
            nodeKind: "root",
            sourceKind: "direct"
          },
          lifecycleState: "created",
          runCompleted: false,
          errorEventCount: 0
        }
      ])
    ).toThrow(ValidationError);
  });

  it("should validate guardrail values as positive integers", () => {
    expect(
      normalizeSessionGuardrails({
        maxChildren: 4,
        maxDepth: 2
      })
    ).toEqual({
      maxChildren: 4,
      maxDepth: 2
    });

    expect(() =>
      normalizeSessionGuardrails({
        maxChildren: 0
      })
    ).toThrow(ValidationError);

    expect(() =>
      normalizeSessionGuardrails({
        maxDepth: 1.5
      })
    ).toThrow(ValidationError);
  });
});
