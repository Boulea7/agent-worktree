import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionSpawnHeadlessWaitRequest,
  deriveExecutionSessionWaitRequest,
  type ExecutionSessionRecord,
  type ExecutionSessionSpawnHeadlessRecord,
  type ExecutionSessionSpawnHeadlessView,
  type ExecutionSessionSpawnHeadlessWaitTarget
} from "../../src/control-plane/internal.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnHeadlessContext,
  deriveExecutionSessionSpawnHeadlessWaitCandidate,
  deriveExecutionSessionSpawnHeadlessWaitTarget
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-headless-wait-request helpers", () => {
  it("should derive a wrapped wait request from a waitable headless wait target", () => {
    const headlessWaitTarget = createHeadlessWaitTarget({
      attemptId: "att_child_wait_request",
      parentAttemptId: "att_parent_wait_request",
      sessionId: "thr_child_wait_request",
      sourceKind: "delegated"
    });

    const result = deriveExecutionSessionSpawnHeadlessWaitRequest({
      headlessWaitTarget,
      timeoutMs: 1_500
    }) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      headlessWaitTarget,
      request: deriveExecutionSessionWaitRequest({
        target: headlessWaitTarget.target!,
        timeoutMs: 1_500
      })
    });
    expect(result).not.toHaveProperty("target");
    expect(result).not.toHaveProperty("candidate");
    expect(result).not.toHaveProperty("headlessContext");
    expect(result).not.toHaveProperty("consumer");
    expect(result).not.toHaveProperty("consume");
  });

  it("should preserve a blocked headless wait target while omitting request output", () => {
    const headlessWaitTarget = createHeadlessWaitTarget({
      attemptId: "att_child_wait_request_blocked",
      parentAttemptId: "att_parent_wait_request_blocked",
      sourceKind: "fork"
    });

    expect(
      deriveExecutionSessionSpawnHeadlessWaitRequest({
        headlessWaitTarget,
        timeoutMs: 250
      })
    ).toEqual({
      headlessWaitTarget
    });
  });

  it("should fail loudly when the supplied headless wait target wrapper is invalid", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessWaitRequest({
        headlessWaitTarget: {} as ExecutionSessionSpawnHeadlessWaitTarget
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessWaitRequest({
        headlessWaitTarget: {} as ExecutionSessionSpawnHeadlessWaitTarget
      })
    ).toThrow(
      "Execution session spawn headless wait request requires a headlessWaitTarget wrapper."
    );
  });

  it("should not mutate the supplied headless wait target and should keep the result shape minimal", () => {
    const headlessWaitTarget = createHeadlessWaitTarget({
      attemptId: "att_child_wait_request_shape",
      parentAttemptId: "att_parent_wait_request_shape",
      sessionId: "thr_child_wait_request_shape",
      sourceKind: "delegated"
    });
    const snapshot = structuredClone(headlessWaitTarget);
    const result = deriveExecutionSessionSpawnHeadlessWaitRequest({
      headlessWaitTarget
    }) as unknown as Record<string, unknown>;

    expect(headlessWaitTarget).toEqual(snapshot);
    expect(result).toEqual({
      headlessWaitTarget,
      request: {
        attemptId: "att_child_wait_request_shape",
        runtime: "codex-cli",
        sessionId: "thr_child_wait_request_shape"
      }
    });
    expect(result).not.toHaveProperty("waitTarget");
    expect(result).not.toHaveProperty("closeTarget");
    expect(result).not.toHaveProperty("results");
    expect(result).not.toHaveProperty("headlessWaitTargetBatch");
  });
});

function createHeadlessWaitTarget(overrides: {
  attemptId: string;
  sourceKind: "direct" | "fork" | "delegated";
  parentAttemptId?: string;
  sessionId?: string;
}) {
  const headlessContext = createHeadlessContext({
    attemptId: overrides.attemptId,
    sourceKind: overrides.sourceKind,
    ...(overrides.parentAttemptId === undefined
      ? {}
      : { parentAttemptId: overrides.parentAttemptId }),
    ...(overrides.sessionId === undefined
      ? {}
      : { sessionId: overrides.sessionId })
  });

  return deriveExecutionSessionSpawnHeadlessWaitTarget({
    headlessWaitCandidate: deriveExecutionSessionSpawnHeadlessWaitCandidate({
      headlessContext
    })
  });
}

function createHeadlessContext(overrides: {
  attemptId: string;
  sourceKind: "direct" | "fork" | "delegated";
  parentAttemptId?: string;
  sessionId?: string;
}) {
  const parentAttemptId =
    overrides.parentAttemptId ?? "att_parent_wait_request";
  const parentRecord = createRecord({
    attemptId: parentAttemptId,
    sessionId: "thr_parent_wait_request",
    sourceKind: "direct"
  });
  const headlessRecord = createHeadlessRecord({
    attemptId: overrides.attemptId,
    sourceKind: overrides.sourceKind,
    parentAttemptId,
    ...(overrides.sessionId === undefined
      ? {}
      : { sessionId: overrides.sessionId })
  });
  const headlessView = {
    descendantCoverage: "complete",
    headlessRecord,
    view: buildExecutionSessionView([parentRecord, headlessRecord.record])
  } satisfies ExecutionSessionSpawnHeadlessView;

  return deriveExecutionSessionSpawnHeadlessContext({
    headlessView
  });
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
    lifecycleState: "active",
    runCompleted: false,
    errorEventCount: 0,
    origin: "headless_result",
    ...rest
  };
}

function createHeadlessRecord(
  overrides: {
    attemptId: string;
    sourceKind: "direct" | "fork" | "delegated";
    parentAttemptId?: string;
    sessionId?: string;
  }
): ExecutionSessionSpawnHeadlessRecord {
  const requestSourceKind: "fork" | "delegated" =
    overrides.sourceKind === "direct" ? "fork" : overrides.sourceKind;
  const lineageSourceKind: "fork" | "delegated" =
    overrides.sourceKind === "direct" ? "fork" : overrides.sourceKind;

  return {
    headlessExecute: {
      headlessApply: {
        apply: {
          consume: {
            request: {
              parentAttemptId:
                overrides.parentAttemptId ?? "att_parent_wait_request",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_parent_wait_request",
              sourceKind: requestSourceKind
            },
            invoked: true
          },
          effects: {
            lineage: {
              attemptId: overrides.attemptId,
              sourceKind: lineageSourceKind,
              parentAttemptId:
                overrides.parentAttemptId ?? "att_parent_wait_request"
            },
            requestedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_parent_wait_request",
              runtime: "codex-cli",
              sessionId: "thr_parent_wait_request",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_parent_wait_request",
              runtime: "codex-cli",
              sessionId: "thr_parent_wait_request",
              lifecycleEventKind: "spawn_recorded"
            }
          }
        },
        headlessInput: {
          prompt: "Reply with exactly: ok",
          attempt: {
            attemptId: overrides.attemptId,
            sourceKind: lineageSourceKind,
            ...(overrides.parentAttemptId === undefined
              ? {}
              : { parentAttemptId: overrides.parentAttemptId })
          }
        }
      },
      executionResult: {
        command: {
          runtime: "codex-cli",
          executable: "codex",
          args: ["exec", "--json", "Reply with exactly: ok"],
          metadata: {
            executionMode: "headless_event_stream",
            machineReadable: true,
            promptIncluded: true,
            resumeRequested: false,
            safetyIntent: "workspace_write_with_approval"
          }
        },
        events: [],
        exitCode: 0,
        observation: {
          runCompleted: false,
          errorEventCount: 0,
          ...(overrides.sessionId === undefined
            ? {}
            : { threadId: overrides.sessionId })
        },
        stderr: "",
        stdout: ""
      }
    },
    record: createRecord({
      attemptId: overrides.attemptId,
      sourceKind: overrides.sourceKind,
      ...(overrides.parentAttemptId === undefined
        ? {}
        : { parentAttemptId: overrides.parentAttemptId }),
      ...(overrides.sessionId === undefined
        ? {}
        : { sessionId: overrides.sessionId })
    })
  };
}
