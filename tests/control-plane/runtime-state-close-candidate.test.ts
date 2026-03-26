import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionCloseCandidate
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state close-candidate helpers", () => {
  it("should derive a close candidate from an attemptId selector", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);

    expect(
      deriveExecutionSessionCloseCandidate({
        view,
        selector: {
          attemptId: "att_active"
        },
        resolveSessionLifecycleCapability: () => true
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
        sessionLifecycleSupported: true,
        alreadyFinal: false,
        wouldAffectDescendants: false,
        canClose: true,
        hasBlockingReasons: false
      }
    });
  });

  it("should derive a close candidate from a sessionId selector", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);

    expect(
      deriveExecutionSessionCloseCandidate({
        view,
        selector: {
          sessionId: "thr_active"
        },
        resolveSessionLifecycleCapability: () => true
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
        sessionLifecycleSupported: true,
        alreadyFinal: false,
        wouldAffectDescendants: false,
        canClose: true,
        hasBlockingReasons: false
      }
    });
  });

  it("should block close by default when the runtime does not support session lifecycle", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);

    expect(
      deriveExecutionSessionCloseCandidate({
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
        blockingReasons: ["session_lifecycle_unsupported"],
        sessionLifecycleSupported: false,
        alreadyFinal: false,
        wouldAffectDescendants: false,
        canClose: false,
        hasBlockingReasons: true
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
      deriveExecutionSessionCloseCandidate({
        view,
        selector: {
          attemptId: "att_missing"
        }
      })
    ).toBeUndefined();
    expect(
      deriveExecutionSessionCloseCandidate({
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
      deriveExecutionSessionCloseCandidate({
        view,
        selector: {}
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseCandidate({
        view,
        selector: {
          attemptId: "att_active",
          sessionId: "thr_active"
        }
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseCandidate({
        view,
        selector: {
          attemptId: "   "
        }
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseCandidate({
        view,
        selector: {
          sessionId: "   "
        }
      })
    ).toThrow(ValidationError);
  });

  it("should keep unresolved parents neutral when other close blockers are absent", () => {
    const orphanRecord = createRecord({
      attemptId: "att_orphan",
      sessionId: "thr_orphan",
      sourceKind: "delegated",
      parentAttemptId: "att_missing_parent",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([orphanRecord]);

    expect(
      deriveExecutionSessionCloseCandidate({
        view,
        selector: {
          attemptId: "att_orphan"
        },
        resolveSessionLifecycleCapability: () => true
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
        sessionLifecycleSupported: true,
        alreadyFinal: false,
        wouldAffectDescendants: false,
        canClose: true,
        hasBlockingReasons: false
      }
    });
  });

  it("should preserve terminal lifecycle blocking for closed sessions", () => {
    const record = createRecord({
      attemptId: "att_closed",
      sessionId: "thr_closed",
      sourceKind: "direct",
      lifecycleState: "closed"
    });
    const view = buildExecutionSessionView([record]);

    expect(
      deriveExecutionSessionCloseCandidate({
        view,
        selector: {
          attemptId: "att_closed"
        },
        resolveSessionLifecycleCapability: () => true
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
        blockingReasons: ["lifecycle_terminal"],
        sessionLifecycleSupported: true,
        alreadyFinal: true,
        wouldAffectDescendants: false,
        canClose: false,
        hasBlockingReasons: true
      }
    });
  });

  it("should preserve the stable blocking-reason order when multiple blockers apply", () => {
    const rootRecord = createRecord({
      attemptId: "att_terminal_parent",
      sourceKind: "direct",
      lifecycleState: "failed"
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      sessionId: "thr_child",
      sourceKind: "delegated",
      parentAttemptId: "att_terminal_parent",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([rootRecord, childRecord]);

    expect(
      deriveExecutionSessionCloseCandidate({
        view,
        selector: {
          attemptId: "att_terminal_parent"
        }
      })
    ).toEqual({
      context: {
        record: rootRecord,
        selectedBy: "attemptId",
        childRecords: [childRecord],
        hasKnownSession: false,
        hasParent: false,
        hasResolvedParent: false,
        hasChildren: true
      },
      readiness: {
        blockingReasons: [
          "session_lifecycle_unsupported",
          "lifecycle_terminal",
          "session_unknown",
          "child_attempts_present"
        ],
        sessionLifecycleSupported: false,
        alreadyFinal: true,
        wouldAffectDescendants: true,
        canClose: false,
        hasBlockingReasons: true
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
