import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionWaitCandidate
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state wait-candidate helpers", () => {
  it("should derive a wait candidate from an attemptId selector", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);

    expect(
      deriveExecutionSessionWaitCandidate({
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
        canWait: true,
        hasBlockingReasons: false
      }
    });
  });

  it("should derive a wait candidate from a sessionId selector", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);

    expect(
      deriveExecutionSessionWaitCandidate({
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
        canWait: true,
        hasBlockingReasons: false
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
      deriveExecutionSessionWaitCandidate({
        view,
        selector: {
          attemptId: "att_missing"
        }
      })
    ).toBeUndefined();
    expect(
      deriveExecutionSessionWaitCandidate({
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
      deriveExecutionSessionWaitCandidate({
        view,
        selector: {}
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitCandidate({
        view,
        selector: {
          attemptId: "att_active",
          sessionId: "thr_active"
        }
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitCandidate({
        view,
        selector: {
          attemptId: "   "
        }
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitCandidate({
        view,
        selector: {
          sessionId: "   "
        }
      })
    ).toThrow(ValidationError);
  });

  it("should keep unresolved parents neutral when other wait blockers are absent", () => {
    const orphanRecord = createRecord({
      attemptId: "att_orphan",
      sessionId: "thr_orphan",
      sourceKind: "delegated",
      parentAttemptId: "att_missing_parent",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([orphanRecord]);

    expect(
      deriveExecutionSessionWaitCandidate({
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
        canWait: true,
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
      deriveExecutionSessionWaitCandidate({
        view,
        selector: {
          attemptId: "att_closed"
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
        blockingReasons: ["lifecycle_terminal"],
        canWait: false,
        hasBlockingReasons: true
      }
    });
  });

  it("should fail loudly when the supplied wait-candidate input, view, or selector containers are malformed", () => {
    expect(() =>
      deriveExecutionSessionWaitCandidate(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitCandidate(undefined as never)
    ).toThrow("Execution session wait candidate input must be an object.");

    expect(() =>
      deriveExecutionSessionWaitCandidate({
        view: undefined as never,
        selector: {
          attemptId: "att_active"
        }
      })
    ).toThrow("Execution session wait candidate requires view to be an object.");

    expect(() =>
      deriveExecutionSessionWaitCandidate({
        view: buildExecutionSessionView([]),
        selector: undefined as never
      })
    ).toThrow(
      "Execution session wait candidate requires selector to be an object."
    );

    const incompleteView = buildExecutionSessionView([]);

    expect(() =>
      deriveExecutionSessionWaitCandidate({
        view: {
          ...incompleteView,
          index: undefined as never
        },
        selector: {
          attemptId: "att_active"
        }
      })
    ).toThrow("Execution session wait candidate requires view to be an object.");

    expect(() =>
      deriveExecutionSessionWaitCandidate({
        view: {
          ...incompleteView,
          childAttemptIdsByParent: undefined as never
        },
        selector: {
          attemptId: "att_active"
        }
      })
    ).toThrow("Execution session wait candidate requires view to be an object.");
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
      lifecycleState: "completed"
    });
    const view = buildExecutionSessionView([rootRecord, childRecord]);

    expect(
      deriveExecutionSessionWaitCandidate({
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
          "lifecycle_terminal",
          "session_unknown",
          "child_attempts_present"
        ],
        canWait: false,
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
