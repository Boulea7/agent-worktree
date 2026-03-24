import { describe, expect, it } from "vitest";

import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnHeadlessContext,
  deriveExecutionSessionSpawnHeadlessWaitCandidate,
  deriveExecutionSessionWaitTarget,
  type ExecutionSessionRecord,
  type ExecutionSessionSpawnHeadlessRecord,
  type ExecutionSessionSpawnHeadlessView
} from "../../src/control-plane/index.js";
import { deriveExecutionSessionSpawnHeadlessWaitTarget } from "../../src/control-plane/runtime-state-spawn-headless-wait-target.js";

describe(
  "control-plane runtime-state spawn-headless-wait-target helpers",
  () => {
    it("should derive a wrapped wait target from a waitable headless wait candidate", () => {
      const headlessWaitCandidate = createHeadlessWaitCandidate({
        attemptId: "att_child_wait_target",
        parentAttemptId: "att_parent_wait_target",
        sessionId: "thr_child_wait_target",
        sourceKind: "delegated"
      });
      const inputSnapshot = structuredClone(headlessWaitCandidate);

      const result = deriveExecutionSessionSpawnHeadlessWaitTarget({
        headlessWaitCandidate
      }) as unknown as Record<string, unknown>;

      expect(result.headlessWaitCandidate).toBe(headlessWaitCandidate);
      expect(result.target).toEqual(
        deriveExecutionSessionWaitTarget({
          candidate: headlessWaitCandidate.candidate
        })
      );
      expect(result).not.toHaveProperty("headlessContext");
      expect(result).not.toHaveProperty("candidate");
      expect(result).not.toHaveProperty("context");
      expect(result).not.toHaveProperty("readiness");
      expect(result).not.toHaveProperty("selector");
      expect(result).not.toHaveProperty("view");
      expect(result).not.toHaveProperty("request");
      expect(result).not.toHaveProperty("consumer");
      expect(result).not.toHaveProperty("consume");
      expect(result).not.toHaveProperty("results");
      expect(result).not.toHaveProperty("headlessWaitCandidateBatch");
      expect(result).not.toHaveProperty("waitTarget");
      expect(result).not.toHaveProperty("closeTarget");
      expect(headlessWaitCandidate).toEqual(inputSnapshot);
    });

    it("should preserve a blocked headless wait candidate while omitting target output", () => {
      const headlessWaitCandidate = createHeadlessWaitCandidate({
        attemptId: "att_child_wait_target_blocked",
        parentAttemptId: "att_parent_wait_target_blocked",
        sourceKind: "fork"
      });

      const result = deriveExecutionSessionSpawnHeadlessWaitTarget({
        headlessWaitCandidate
      }) as unknown as Record<string, unknown>;

      expect(result.headlessWaitCandidate).toBe(headlessWaitCandidate);
      expect(result).not.toHaveProperty("target");
      expect(result).not.toHaveProperty("waitTarget");
      expect(result).not.toHaveProperty("closeTarget");
    });

    it("should preserve an unknown-session headless wait candidate while omitting target output", () => {
      const headlessWaitCandidate = createHeadlessWaitCandidate({
        attemptId: "att_child_wait_target_sessionless",
        parentAttemptId: "att_parent_wait_target_sessionless",
        sourceKind: "delegated"
      });

      const result = deriveExecutionSessionSpawnHeadlessWaitTarget({
        headlessWaitCandidate
      }) as unknown as Record<string, unknown>;

      expect(result.headlessWaitCandidate).toBe(headlessWaitCandidate);
      expect(result).not.toHaveProperty("target");
      expect(result).not.toHaveProperty("waitTarget");
      expect(result).not.toHaveProperty("closeTarget");
    });
  }
);

function createHeadlessWaitCandidate(overrides: {
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

  return deriveExecutionSessionSpawnHeadlessWaitCandidate({
    headlessContext
  });
}

function createHeadlessContext(overrides: {
  attemptId: string;
  sourceKind: "direct" | "fork" | "delegated";
  parentAttemptId?: string;
  sessionId?: string;
}) {
  const parentAttemptId =
    overrides.parentAttemptId ?? "att_parent_wait_target";
  const parentRecord = createRecord({
    attemptId: parentAttemptId,
    sessionId: "thr_parent_wait_target",
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
                overrides.parentAttemptId ?? "att_parent_wait_target",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_parent_wait_target",
              sourceKind: requestSourceKind
            },
            invoked: true
          },
          effects: {
            lineage: {
              attemptId: overrides.attemptId,
              sourceKind: lineageSourceKind,
              parentAttemptId:
                overrides.parentAttemptId ?? "att_parent_wait_target"
            },
            requestedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_parent_wait_target",
              runtime: "codex-cli",
              sessionId: "thr_parent_wait_target",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_parent_wait_target",
              runtime: "codex-cli",
              sessionId: "thr_parent_wait_target",
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
