import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type { HeadlessExecutionResult } from "../../src/adapters/types.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionContext,
  deriveExecutionSessionLifecycleDisposition,
  deriveExecutionSessionRecord,
  deriveExecutionSessionWaitReadiness
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state wait readiness helpers", () => {
  it("should allow wait when the context is active, has a known session, and has no children", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);
    const context = deriveExecutionSessionContext({
      view,
      selector: {
        attemptId: "att_active"
      }
    });

    expect(
      deriveExecutionSessionWaitReadiness({
        context: context!
      })
    ).toEqual({
      blockingReasons: [],
      canWait: true,
      hasBlockingReasons: false
    });
  });

  it("should block wait when the context lifecycle is terminal", () => {
    const context = createContext({
      attemptId: "att_completed",
      sessionId: "thr_completed",
      lifecycleState: "completed",
      sourceKind: "direct"
    });

    expect(
      deriveExecutionSessionWaitReadiness({
        context
      })
    ).toEqual({
      blockingReasons: ["lifecycle_terminal"],
      canWait: false,
      hasBlockingReasons: true
    });
  });

  it("should block wait when the context has no known session", () => {
    const context = createContext({
      attemptId: "att_unknown_session",
      lifecycleState: "active",
      sourceKind: "direct"
    });

    expect(
      deriveExecutionSessionWaitReadiness({
        context
      })
    ).toEqual({
      blockingReasons: ["session_unknown"],
      canWait: false,
      hasBlockingReasons: true
    });
  });

  it("should block wait when the context still has child attempts", () => {
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
    });

    expect(
      deriveExecutionSessionWaitReadiness({
        context: context!
      })
    ).toEqual({
      blockingReasons: ["child_attempts_present"],
      canWait: false,
      hasBlockingReasons: true
    });
  });

  it("should block wait when descendant coverage is incomplete", () => {
    const context = createContext({
      attemptId: "att_incomplete_coverage",
      sessionId: "thr_incomplete_coverage",
      lifecycleState: "active",
      sourceKind: "direct"
    });

    expect(
      deriveExecutionSessionWaitReadiness({
        context,
        descendantCoverage: "incomplete"
      })
    ).toEqual({
      blockingReasons: ["descendant_coverage_incomplete"],
      canWait: false,
      hasBlockingReasons: true
    });
  });

  it("should fail loudly when descendant coverage uses unknown vocabulary", () => {
    const context = createContext({
      attemptId: "att_invalid_coverage",
      sessionId: "thr_invalid_coverage",
      lifecycleState: "active",
      sourceKind: "direct"
    });

    expect(() =>
      deriveExecutionSessionWaitReadiness({
        context,
        descendantCoverage: "partial" as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitReadiness({
        context,
        descendantCoverage: "partial" as never
      })
    ).toThrow(
      'Execution session wait readiness requires descendantCoverage to be "complete" or "incomplete" when provided.'
    );
  });

  it("should preserve the stable blocking-reason order when multiple blockers apply", () => {
    const rootRecord = createRecord({
      attemptId: "att_terminal_parent",
      sourceKind: "direct",
      lifecycleState: "failed"
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      sourceKind: "delegated",
      parentAttemptId: "att_terminal_parent",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([rootRecord, childRecord]);
    const context = deriveExecutionSessionContext({
      view,
      selector: {
        attemptId: "att_terminal_parent"
      }
    });

    expect(
      deriveExecutionSessionWaitReadiness({
        context: context!,
        descendantCoverage: "incomplete"
      })
    ).toEqual({
      blockingReasons: [
        "lifecycle_terminal",
        "session_unknown",
        "descendant_coverage_incomplete",
        "child_attempts_present"
      ],
      canWait: false,
      hasBlockingReasons: true
    });
  });

  it("should preserve wait readiness behavior after shared lifecycle facts are derived", () => {
    const rootRecord = createRecord({
      attemptId: "att_terminal_parent",
      sourceKind: "direct",
      lifecycleState: "failed"
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      sourceKind: "delegated",
      parentAttemptId: "att_terminal_parent",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([rootRecord, childRecord]);
    const context = deriveExecutionSessionContext({
      view,
      selector: {
        attemptId: "att_terminal_parent"
      }
    });

    expect(
      deriveExecutionSessionLifecycleDisposition({
        context: context!
      })
    ).toEqual({
      alreadyFinal: true,
      hasKnownSession: false,
      wouldAffectDescendants: true
    });
    expect(
      deriveExecutionSessionWaitReadiness({
        context: context!,
        descendantCoverage: "incomplete"
      })
    ).toEqual({
      blockingReasons: [
        "lifecycle_terminal",
        "session_unknown",
        "descendant_coverage_incomplete",
        "child_attempts_present"
      ],
      canWait: false,
      hasBlockingReasons: true
    });
  });

  it("should derive wait readiness through the record, view, context chain", () => {
    const rootRecord = deriveExecutionSessionRecord({
      attempt: {
        attemptId: "att_root"
      },
      result: createHeadlessExecutionResult({
        observation: {
          threadId: "thr_root",
          runCompleted: true,
          errorEventCount: 0
        }
      })
    });
    const childRecord = deriveExecutionSessionRecord({
      attempt: {
        attemptId: "att_child",
        sourceKind: "fork",
        parentAttemptId: "att_root"
      },
      result: createHeadlessExecutionResult({
        observation: {
          threadId: "thr_child",
          runCompleted: false,
          errorEventCount: 0,
          lastAgentMessage: "partial"
        }
      })
    });
    const view = buildExecutionSessionView([rootRecord!, childRecord!]);
    const context = deriveExecutionSessionContext({
      view,
      selector: {
        sessionId: "thr_child"
      }
    });

    expect(
      deriveExecutionSessionWaitReadiness({
        context: context!
      })
    ).toEqual({
      blockingReasons: [],
      canWait: true,
      hasBlockingReasons: false
    });
  });

  it("should fail loudly when the supplied wait-readiness input or context container is malformed", () => {
    expect(() =>
      deriveExecutionSessionWaitReadiness(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitReadiness(undefined as never)
    ).toThrow("Execution session wait readiness input must be an object.");

    expect(() =>
      deriveExecutionSessionWaitReadiness({
        context: undefined as never
      })
    ).toThrow(
      "Execution session wait readiness requires context to be an object."
    );

    expect(() =>
      deriveExecutionSessionWaitReadiness({
        context: {
          record: undefined as never
        } as never
      })
    ).toThrow(
      "Execution session wait readiness requires context.record to be an object."
    );
  });

  it("should fail loudly when the supplied wait-readiness context uses an invalid lifecycle state", () => {
    expect(() =>
      deriveExecutionSessionWaitReadiness({
        context: {
          record: {},
          hasKnownSession: true,
          hasChildren: false
        } as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitReadiness({
        context: {
          record: {},
          hasKnownSession: true,
          hasChildren: false
        } as never
      })
    ).toThrow(
      "Execution session lifecycle disposition requires context.record.lifecycleState to use the existing session lifecycle vocabulary."
    );
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

function createHeadlessExecutionResult(
  overrides: Partial<HeadlessExecutionResult> = {}
): HeadlessExecutionResult {
  return {
    command: {
      runtime: "codex-cli",
      executable: "codex",
      args: ["exec", "--json", "--ephemeral", "Reply with ok"],
      metadata: {
        executionMode: "headless_event_stream",
        safetyIntent: "workspace_write_with_approval",
        machineReadable: true,
        promptIncluded: true,
        resumeRequested: false
      }
    },
    events: [],
    exitCode: 0,
    observation: {
      runCompleted: false,
      errorEventCount: 0
    },
    stderr: "",
    stdout: "",
    ...overrides
  };
}
