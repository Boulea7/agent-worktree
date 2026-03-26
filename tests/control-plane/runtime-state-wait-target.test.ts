import { describe, expect, it } from "vitest";

import {
  buildExecutionSessionView,
  deriveExecutionSessionWaitCandidate,
  deriveExecutionSessionWaitTarget
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state wait-target helpers", () => {
  it("should derive a wait target from a waitable candidate", () => {
    const candidate = deriveExecutionSessionWaitCandidate({
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
      deriveExecutionSessionWaitTarget({
        candidate: candidate!
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
  });

  it("should return undefined when the candidate is blocked", () => {
    const blockedCandidate = deriveExecutionSessionWaitCandidate({
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
      deriveExecutionSessionWaitTarget({
        candidate: blockedCandidate!
      })
    ).toBeUndefined();
  });

  it("should derive the same wait target shape through attemptId and sessionId selection paths", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);
    const candidateByAttemptId = deriveExecutionSessionWaitCandidate({
      view,
      selector: {
        attemptId: "att_active"
      }
    });
    const candidateBySessionId = deriveExecutionSessionWaitCandidate({
      view,
      selector: {
        sessionId: "thr_active"
      }
    });

    expect(
      deriveExecutionSessionWaitTarget({
        candidate: candidateByAttemptId!
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
    expect(
      deriveExecutionSessionWaitTarget({
        candidate: candidateBySessionId!
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
  });

  it("should return undefined when the candidate has an unknown session", () => {
    const candidate = deriveExecutionSessionWaitCandidate({
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
      deriveExecutionSessionWaitTarget({
        candidate: candidate!
      })
    ).toBeUndefined();
  });

  it("should return undefined when child attempts still block waiting", () => {
    const rootRecord = createRecord({
      attemptId: "att_parent",
      sessionId: "thr_parent",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      sessionId: "thr_child",
      sourceKind: "fork",
      parentAttemptId: "att_parent",
      lifecycleState: "active"
    });
    const candidate = deriveExecutionSessionWaitCandidate({
      view: buildExecutionSessionView([rootRecord, childRecord]),
      selector: {
        attemptId: "att_parent"
      }
    });

    expect(
      deriveExecutionSessionWaitTarget({
        candidate: candidate!
      })
    ).toBeUndefined();
  });

  it("should derive a wait target through the existing record-view-candidate chain without mutating the candidate", () => {
    const record = createRecord({
      attemptId: "att_chain",
      sessionId: "thr_chain",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const candidate = deriveExecutionSessionWaitCandidate({
      view: buildExecutionSessionView([record]),
      selector: {
        attemptId: "att_chain"
      }
    })!;
    const candidateSnapshot = JSON.parse(JSON.stringify(candidate));

    expect(
      deriveExecutionSessionWaitTarget({
        candidate
      })
    ).toEqual({
      attemptId: "att_chain",
      runtime: "codex-cli",
      sessionId: "thr_chain"
    });
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
