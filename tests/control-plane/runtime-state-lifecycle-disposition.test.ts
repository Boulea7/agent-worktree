import { describe, expect, it } from "vitest";

import {
  buildExecutionSessionView,
  deriveExecutionSessionContext,
  deriveExecutionSessionLifecycleDisposition
} from "../../src/control-plane/index.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state lifecycle disposition helpers", () => {
  it("should derive shared lifecycle facts for an active session with no children", () => {
    const context = createContext({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });

    expect(
      deriveExecutionSessionLifecycleDisposition({
        context
      })
    ).toEqual({
      alreadyFinal: false,
      hasKnownSession: true,
      wouldAffectDescendants: false
    });
  });

  it("should mark terminal lifecycle states as already final", () => {
    const context = createContext({
      attemptId: "att_completed",
      sessionId: "thr_completed",
      sourceKind: "direct",
      lifecycleState: "completed"
    });

    expect(
      deriveExecutionSessionLifecycleDisposition({
        context
      })
    ).toEqual({
      alreadyFinal: true,
      hasKnownSession: true,
      wouldAffectDescendants: false
    });
  });

  it("should preserve unknown-session state without capability semantics", () => {
    const context = createContext({
      attemptId: "att_unknown_session",
      sourceKind: "direct",
      lifecycleState: "active"
    });

    expect(
      deriveExecutionSessionLifecycleDisposition({
        context
      })
    ).toEqual({
      alreadyFinal: false,
      hasKnownSession: false,
      wouldAffectDescendants: false
    });
  });

  it("should report descendant impact when child attempts are present", () => {
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
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([rootRecord, childRecord]);
    const context = deriveExecutionSessionContext({
      view,
      selector: {
        attemptId: "att_root"
      }
    })!;

    expect(
      deriveExecutionSessionLifecycleDisposition({
        context
      })
    ).toEqual({
      alreadyFinal: false,
      hasKnownSession: true,
      wouldAffectDescendants: true
    });
  });

  it("should keep unresolved parents neutral", () => {
    const context = createContext({
      attemptId: "att_orphan",
      sessionId: "thr_orphan",
      sourceKind: "delegated",
      parentAttemptId: "att_missing_parent",
      lifecycleState: "active"
    });

    expect(context.hasParent).toBe(true);
    expect(context.hasResolvedParent).toBe(false);
    expect(
      deriveExecutionSessionLifecycleDisposition({
        context
      })
    ).toEqual({
      alreadyFinal: false,
      hasKnownSession: true,
      wouldAffectDescendants: false
    });
  });

  it("should stay capability-neutral for unknown runtimes", () => {
    const context = createContext({
      attemptId: "att_future_runtime",
      runtime: "future-runtime",
      sessionId: "thr_future",
      sourceKind: "direct",
      lifecycleState: "active"
    });

    expect(
      deriveExecutionSessionLifecycleDisposition({
        context
      })
    ).toEqual({
      alreadyFinal: false,
      hasKnownSession: true,
      wouldAffectDescendants: false
    });
  });
});

function createContext(
  overrides: Partial<ExecutionSessionRecord> &
    Pick<ExecutionSessionRecord, "attemptId" | "sourceKind">
) {
  const record = createRecord(overrides);
  const view = buildExecutionSessionView([record]);

  return deriveExecutionSessionContext({
    view,
    selector: {
      attemptId: record.attemptId
    }
  })!;
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
