import { describe, expect, it } from "vitest";

import type { HeadlessExecutionResult } from "../../src/adapters/types.js";
import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionRecord,
  deriveExecutionSessionContext
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state context helpers", () => {
  it("should derive a root context from an attemptId selector", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct"
    });
    const childA = createRecord({
      attemptId: "att_child_a",
      sourceKind: "fork",
      parentAttemptId: "att_root"
    });
    const childB = createRecord({
      attemptId: "att_child_b",
      sessionId: "thr_child_b",
      sourceKind: "delegated",
      parentAttemptId: "att_root"
    });
    const view = buildExecutionSessionView([rootRecord, childA, childB]);

    expect(
      deriveExecutionSessionContext({
        view,
        selector: {
          attemptId: "att_root"
        }
      })
    ).toEqual({
      record: rootRecord,
      selectedBy: "attemptId",
      childRecords: [childA, childB],
      hasKnownSession: true,
      hasParent: false,
      hasResolvedParent: false,
      hasChildren: true
    });
  });

  it("should derive a child context from a sessionId selector", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct"
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      sessionId: "thr_child",
      sourceKind: "fork",
      parentAttemptId: "att_root"
    });
    const view = buildExecutionSessionView([rootRecord, childRecord]);

    expect(
      deriveExecutionSessionContext({
        view,
        selector: {
          sessionId: "thr_child"
        }
      })
    ).toEqual({
      record: childRecord,
      selectedBy: "sessionId",
      parentRecord: rootRecord,
      childRecords: [],
      hasKnownSession: true,
      hasParent: true,
      hasResolvedParent: true,
      hasChildren: false
    });
  });

  it("should return undefined when the selector does not resolve a record", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct"
    });
    const view = buildExecutionSessionView([rootRecord]);

    expect(
      deriveExecutionSessionContext({
        view,
        selector: {
          attemptId: "att_missing"
        }
      })
    ).toBeUndefined();
    expect(
      deriveExecutionSessionContext({
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
        attemptId: "att_root",
        sessionId: "thr_root",
        sourceKind: "direct"
      })
    ]);

    expect(() =>
      deriveExecutionSessionContext({
        view,
        selector: {}
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionContext({
        view,
        selector: {
          attemptId: "att_root",
          sessionId: "thr_root"
        }
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionContext({
        view,
        selector: {
          attemptId: "   "
        }
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionContext({
        view,
        selector: {
          sessionId: "   "
        }
      })
    ).toThrow(ValidationError);
  });

  it("should tolerate an unresolved parent record", () => {
    const orphanChild = createRecord({
      attemptId: "att_orphan",
      sourceKind: "delegated",
      parentAttemptId: "att_missing_parent"
    });
    const view = buildExecutionSessionView([orphanChild]);

    expect(
      deriveExecutionSessionContext({
        view,
        selector: {
          attemptId: "att_orphan"
        }
      })
    ).toEqual({
      record: orphanChild,
      selectedBy: "attemptId",
      childRecords: [],
      hasKnownSession: false,
      hasParent: true,
      hasResolvedParent: false,
      hasChildren: false
    });
  });

  it("should derive a context from derived execution-session records", () => {
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
          runCompleted: false,
          errorEventCount: 0,
          lastAgentMessage: "partial"
        }
      })
    });
    const view = buildExecutionSessionView([rootRecord!, childRecord!]);

    expect(
      deriveExecutionSessionContext({
        view,
        selector: {
          attemptId: "att_child"
        }
      })
    ).toEqual({
      record: childRecord,
      selectedBy: "attemptId",
      parentRecord: rootRecord,
      childRecords: [],
      hasKnownSession: false,
      hasParent: true,
      hasResolvedParent: true,
      hasChildren: false
    });
  });

  it("should surface blank attempt identifiers before deriving a sessionId-selected context", () => {
    expect(() =>
      deriveExecutionSessionContext({
        view: buildExecutionSessionView([
          createRecord({
            attemptId: "   ",
            sessionId: "thr_blank_context",
            sourceKind: "direct"
          })
        ]),
        selector: {
          sessionId: "thr_blank_context"
        }
      })
    ).toThrow(ValidationError);
  });

  it("should fail loudly when the supplied context input, view, or selector containers are malformed", () => {
    const view = buildExecutionSessionView([
      createRecord({
        attemptId: "att_root",
        sessionId: "thr_root",
        sourceKind: "direct"
      })
    ]);

    expect(() =>
      deriveExecutionSessionContext(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionContext(undefined as never)
    ).toThrow("Execution session context input must be an object.");

    expect(() =>
      deriveExecutionSessionContext({
        view: undefined as never,
        selector: {
          attemptId: "att_root"
        }
      })
    ).toThrow("Execution session context requires view to be an object.");

    expect(() =>
      deriveExecutionSessionContext({
        view,
        selector: undefined as never
      })
    ).toThrow("Execution session context requires selector to be an object.");
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
