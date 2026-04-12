import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type { HeadlessExecutionResult } from "../../src/adapters/types.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionCloseReadiness,
  deriveExecutionSessionContext,
  deriveExecutionSessionLifecycleDisposition,
  deriveExecutionSessionRecord
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state close readiness helpers", () => {
  it("should allow close when session lifecycle is supported and the context is active", () => {
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
      deriveExecutionSessionCloseReadiness({
        context: context!,
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      blockingReasons: [],
      sessionLifecycleSupported: true,
      alreadyFinal: false,
      wouldAffectDescendants: false,
      canClose: true,
      hasBlockingReasons: false
    });
  });

  it("should block close when session lifecycle is unsupported for the runtime", () => {
    const context = createContext({
      attemptId: "att_active",
      sessionId: "thr_active",
      lifecycleState: "active",
      sourceKind: "direct"
    });

    expect(
      deriveExecutionSessionCloseReadiness({
        context
      })
    ).toEqual({
      blockingReasons: ["session_lifecycle_unsupported"],
      sessionLifecycleSupported: false,
      alreadyFinal: false,
      wouldAffectDescendants: false,
      canClose: false,
      hasBlockingReasons: true
    });
  });

  it("should treat unknown runtimes as not supporting session lifecycle", () => {
    const context = createContext({
      attemptId: "att_unknown_runtime",
      runtime: "future-runtime",
      sessionId: "thr_future",
      lifecycleState: "active",
      sourceKind: "direct"
    });

    expect(
      deriveExecutionSessionCloseReadiness({
        context
      })
    ).toEqual({
      blockingReasons: ["session_lifecycle_unsupported"],
      sessionLifecycleSupported: false,
      alreadyFinal: false,
      wouldAffectDescendants: false,
      canClose: false,
      hasBlockingReasons: true
    });
  });

  it("should fail loudly when the close capability resolver does not return a boolean", () => {
    const context = createContext({
      attemptId: "att_invalid_resolver",
      sessionId: "thr_invalid_resolver",
      lifecycleState: "active",
      sourceKind: "direct"
    });

    expect(() =>
      deriveExecutionSessionCloseReadiness({
        context,
        resolveSessionLifecycleCapability: () => "yes" as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseReadiness({
        context,
        resolveSessionLifecycleCapability: () => "yes" as never
      })
    ).toThrow(
      "Execution session close readiness requires resolveSessionLifecycleCapability to return a boolean."
    );
  });

  it("should fail loudly when the close capability resolver is not a function", () => {
    const context = createContext({
      attemptId: "att_invalid_resolver_shape",
      sessionId: "thr_invalid_resolver_shape",
      lifecycleState: "active",
      sourceKind: "direct"
    });

    expect(() =>
      deriveExecutionSessionCloseReadiness({
        context,
        resolveSessionLifecycleCapability: "yes" as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseReadiness({
        context,
        resolveSessionLifecycleCapability: "yes" as never
      })
    ).toThrow(
      "Execution session close readiness requires resolveSessionLifecycleCapability to be a function when provided."
    );
  });

  it("should block close when the context lifecycle is terminal", () => {
    const context = createContext({
      attemptId: "att_completed",
      sessionId: "thr_completed",
      lifecycleState: "completed",
      sourceKind: "direct"
    });

    expect(
      deriveExecutionSessionCloseReadiness({
        context,
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      blockingReasons: ["lifecycle_terminal"],
      sessionLifecycleSupported: true,
      alreadyFinal: true,
      wouldAffectDescendants: false,
      canClose: false,
      hasBlockingReasons: true
    });
  });

  it("should block close when the context has no known session", () => {
    const context = createContext({
      attemptId: "att_unknown_session",
      lifecycleState: "active",
      sourceKind: "direct"
    });

    expect(
      deriveExecutionSessionCloseReadiness({
        context,
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      blockingReasons: ["session_unknown"],
      sessionLifecycleSupported: true,
      alreadyFinal: false,
      wouldAffectDescendants: false,
      canClose: false,
      hasBlockingReasons: true
    });
  });

  it("should block close when the context still has child attempts", () => {
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
      deriveExecutionSessionCloseReadiness({
        context: context!,
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      blockingReasons: ["child_attempts_present"],
      sessionLifecycleSupported: true,
      alreadyFinal: false,
      wouldAffectDescendants: true,
      canClose: false,
      hasBlockingReasons: true
    });
  });

  it("should block close when descendant coverage is incomplete", () => {
    const context = createContext({
      attemptId: "att_incomplete_coverage",
      sessionId: "thr_incomplete_coverage",
      lifecycleState: "active",
      sourceKind: "direct"
    });

    expect(
      deriveExecutionSessionCloseReadiness({
        context,
        resolveSessionLifecycleCapability: () => true,
        descendantCoverage: "incomplete"
      })
    ).toEqual({
      blockingReasons: ["descendant_coverage_incomplete"],
      sessionLifecycleSupported: true,
      alreadyFinal: false,
      wouldAffectDescendants: false,
      canClose: false,
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
      deriveExecutionSessionCloseReadiness({
        context,
        resolveSessionLifecycleCapability: () => true,
        descendantCoverage: "partial" as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseReadiness({
        context,
        resolveSessionLifecycleCapability: () => true,
        descendantCoverage: "partial" as never
      })
    ).toThrow(
      'Execution session close readiness requires descendantCoverage to be "complete" or "incomplete" when provided.'
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
      deriveExecutionSessionCloseReadiness({
        context: context!,
        descendantCoverage: "incomplete"
      })
    ).toEqual({
      blockingReasons: [
        "session_lifecycle_unsupported",
        "lifecycle_terminal",
        "session_unknown",
        "descendant_coverage_incomplete",
        "child_attempts_present"
      ],
      sessionLifecycleSupported: false,
      alreadyFinal: true,
      wouldAffectDescendants: true,
      canClose: false,
      hasBlockingReasons: true
    });
  });

  it("should derive close readiness through the record, view, context chain", () => {
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
      deriveExecutionSessionCloseReadiness({
        context: context!,
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      blockingReasons: [],
      sessionLifecycleSupported: true,
      alreadyFinal: false,
      wouldAffectDescendants: false,
      canClose: true,
      hasBlockingReasons: false
    });
  });

  it("should keep lifecycle disposition independent from the close capability resolver", () => {
    const context = createContext({
      attemptId: "att_active",
      sessionId: "thr_active",
      lifecycleState: "active",
      sourceKind: "direct"
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
    expect(
      deriveExecutionSessionCloseReadiness({
        context,
        resolveSessionLifecycleCapability: () => false
      })
    ).toEqual({
      blockingReasons: ["session_lifecycle_unsupported"],
      sessionLifecycleSupported: false,
      alreadyFinal: false,
      wouldAffectDescendants: false,
      canClose: false,
      hasBlockingReasons: true
    });
    expect(
      deriveExecutionSessionCloseReadiness({
        context,
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      blockingReasons: [],
      sessionLifecycleSupported: true,
      alreadyFinal: false,
      wouldAffectDescendants: false,
      canClose: true,
      hasBlockingReasons: false
    });
  });

  it("should fail loudly when the supplied close-readiness input or context container is malformed", () => {
    expect(() =>
      deriveExecutionSessionCloseReadiness(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseReadiness(undefined as never)
    ).toThrow("Execution session close readiness input must be an object.");

    expect(() =>
      deriveExecutionSessionCloseReadiness({
        context: undefined as never
      })
    ).toThrow(
      "Execution session close readiness requires context to be an object."
    );

    expect(() =>
      deriveExecutionSessionCloseReadiness({
        context: {
          record: undefined as never
        } as never
      })
    ).toThrow(
      "Execution session close readiness requires context.record to be an object."
    );
  });

  it("should fail loudly when the supplied close-readiness context omits lifecycle or runtime fields", () => {
    expect(() =>
      deriveExecutionSessionCloseReadiness({
        context: {
          record: {},
          hasKnownSession: true,
          hasChildren: false
        } as never,
        resolveSessionLifecycleCapability: () => true
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseReadiness({
        context: {
          record: {},
          hasKnownSession: true,
          hasChildren: false
        } as never,
        resolveSessionLifecycleCapability: () => true
      })
    ).toThrow(
      "Execution session lifecycle disposition requires context.record.lifecycleState to use the existing session lifecycle vocabulary."
    );

    expect(() =>
      deriveExecutionSessionCloseReadiness({
        context: {
          record: {
            lifecycleState: "active"
          },
          hasKnownSession: true,
          hasChildren: false
        } as never,
        resolveSessionLifecycleCapability: () => true
      })
    ).toThrow(
      "Execution session close readiness requires context.record.runtime to be a non-empty string."
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
