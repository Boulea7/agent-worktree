import { describe, expect, it } from "vitest";

import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnHeadlessCloseCandidate,
  deriveExecutionSessionSpawnHeadlessContext,
  deriveExecutionSessionSpawnHeadlessView,
  type ExecutionSessionRecord,
  type ExecutionSessionSpawnHeadlessRecord,
  type ExecutionSessionSpawnHeadlessView
} from "../../src/control-plane/internal.js";

describe(
  "control-plane runtime-state spawn-headless-close-candidate helpers",
  () => {
    it("should derive a close candidate from the supplied headless context while preserving default close readiness behavior", () => {
      const headlessContext = createHeadlessContext({
        attemptId: "att_child_close_candidate",
        parentAttemptId: "att_parent_close_candidate",
        sessionId: "thr_child_close_candidate",
        sourceKind: "delegated"
      });
      const inputSnapshot = structuredClone(headlessContext);

      const result = deriveExecutionSessionSpawnHeadlessCloseCandidate({
        headlessContext
      }) as unknown as Record<string, unknown>;

      expect(result.headlessContext).toBe(headlessContext);
      expect(result.candidate).toEqual({
        context: headlessContext.context,
        readiness: {
          blockingReasons: ["session_lifecycle_unsupported"],
          sessionLifecycleSupported: false,
          alreadyFinal: false,
          wouldAffectDescendants: false,
          canClose: false,
          hasBlockingReasons: true
        }
      });
      expect(
        (result.candidate as { context: unknown }).context
      ).toBe(headlessContext.context);
      expect(result).not.toHaveProperty("context");
      expect(result).not.toHaveProperty("view");
      expect(result).not.toHaveProperty("selector");
      expect(result).not.toHaveProperty("readiness");
      expect(result).not.toHaveProperty("results");
      expect(result).not.toHaveProperty("headlessContextBatch");
      expect(result).not.toHaveProperty("target");
      expect(result).not.toHaveProperty("request");
      expect(headlessContext).toEqual(inputSnapshot);
    });

    it("should pass an explicit session lifecycle resolver through to close readiness", () => {
      const headlessContext = createHeadlessContext({
        attemptId: "att_child_close_candidate_supported",
        parentAttemptId: "att_parent_close_candidate_supported",
        sessionId: "thr_child_close_candidate_supported",
        sourceKind: "fork"
      });

      const result = deriveExecutionSessionSpawnHeadlessCloseCandidate({
        headlessContext,
        resolveSessionLifecycleCapability: () => true
      });

      expect(result.headlessContext).toBe(headlessContext);
      expect(result.candidate.context).toBe(headlessContext.context);
      expect(result.candidate.readiness).toEqual({
        blockingReasons: [],
        sessionLifecycleSupported: true,
        alreadyFinal: false,
        wouldAffectDescendants: false,
        canClose: true,
        hasBlockingReasons: false
      });
    });

    it("should fail closed when the headless context comes from an incomplete default headless view", () => {
      const headlessRecord = createHeadlessRecord({
        attemptId: "att_child_close_candidate_incomplete",
        parentAttemptId: "att_parent_close_candidate_incomplete",
        sessionId: "thr_child_close_candidate_incomplete",
        sourceKind: "fork"
      });
      const headlessContext = deriveExecutionSessionSpawnHeadlessContext({
        headlessView: deriveExecutionSessionSpawnHeadlessView({
          headlessRecord
        })
      });

      expect(
        deriveExecutionSessionSpawnHeadlessCloseCandidate({
          headlessContext,
          resolveSessionLifecycleCapability: () => true
        })
      ).toEqual({
        headlessContext,
        candidate: {
          context: headlessContext.context,
          readiness: {
            blockingReasons: ["descendant_coverage_incomplete"],
            sessionLifecycleSupported: true,
            alreadyFinal: false,
            wouldAffectDescendants: false,
            canClose: false,
            hasBlockingReasons: true
          }
        }
      });
    });
  }
);

function createHeadlessContext(overrides: {
  attemptId: string;
  sessionId: string;
  sourceKind: "direct" | "fork" | "delegated";
  parentAttemptId?: string;
}) {
  const parentAttemptId =
    overrides.parentAttemptId ?? "att_parent_close_candidate";
  const parentRecord = createRecord({
    attemptId: parentAttemptId,
    sessionId: "thr_parent_close_candidate",
    sourceKind: "direct"
  });
  const headlessRecord = createHeadlessRecord({
    attemptId: overrides.attemptId,
    parentAttemptId,
    sessionId: overrides.sessionId,
    sourceKind: overrides.sourceKind
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
    sessionId: string;
    sourceKind: "direct" | "fork" | "delegated";
    parentAttemptId?: string;
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
                overrides.parentAttemptId ?? "att_parent_close_candidate",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_parent_close_candidate",
              sourceKind: requestSourceKind
            },
            invoked: true
          },
          effects: {
            lineage: {
              attemptId: overrides.attemptId,
              sourceKind: lineageSourceKind,
              parentAttemptId:
                overrides.parentAttemptId ?? "att_parent_close_candidate"
            },
            requestedEvent: {
              attemptId:
                overrides.parentAttemptId ?? "att_parent_close_candidate",
              runtime: "codex-cli",
              sessionId: "thr_parent_close_candidate",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId:
                overrides.parentAttemptId ?? "att_parent_close_candidate",
              runtime: "codex-cli",
              sessionId: "thr_parent_close_candidate",
              lifecycleEventKind: "spawn_recorded"
            }
          }
        },
        headlessInput: {
          prompt: "Reply with exactly: ok",
          attempt: {
            attemptId: overrides.attemptId,
            sourceKind: lineageSourceKind,
            parentAttemptId:
              overrides.parentAttemptId ?? "att_parent_close_candidate"
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
          threadId: overrides.sessionId
        },
        stderr: "",
        stdout: ""
      }
    },
    record: createRecord({
      attemptId: overrides.attemptId,
      runtime: "codex-cli",
      sourceKind: overrides.sourceKind,
      sessionId: overrides.sessionId,
      ...(overrides.parentAttemptId === undefined
        ? {}
        : { parentAttemptId: overrides.parentAttemptId })
    })
  };
}
