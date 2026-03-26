import { describe, expect, it } from "vitest";

import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnHeadlessContextBatch,
  deriveExecutionSessionSpawnHeadlessWaitCandidateBatch,
  deriveExecutionSessionWaitReadiness,
  type ExecutionSessionRecord,
  type ExecutionSessionSpawnHeadlessRecord,
  type ExecutionSessionSpawnHeadlessWaitCandidateBatch,
  type ExecutionSessionSpawnHeadlessViewBatch
} from "../../src/control-plane/internal.js";

describe(
  "control-plane runtime-state spawn-headless-wait-candidate-batch helpers",
  () => {
    it("should return an empty ordered result list for an empty headless-context batch", () => {
      const headlessContextBatch = deriveExecutionSessionSpawnHeadlessContextBatch({
        headlessViewBatch: {
          headlessRecordBatch: {
            results: []
          },
          view: buildExecutionSessionView([])
        }
      });

      const result = deriveExecutionSessionSpawnHeadlessWaitCandidateBatch({
        headlessContextBatch
      }) as unknown as Record<string, unknown>;

      expect(result.headlessContextBatch).toBe(headlessContextBatch);
      expect(result.results).toEqual([]);
      expect(result).not.toHaveProperty("summary");
      expect(result).not.toHaveProperty("count");
      expect(result).not.toHaveProperty("error");
      expect(result).not.toHaveProperty("errors");
    });

    it("should preserve batch ordering while bridging each headless context into a wait candidate", () => {
      const rootRecord = createRecord({
        attemptId: "att_root_wait_candidate_batch",
        sessionId: "thr_root_wait_candidate_batch",
        sourceKind: "direct"
      });
      const childRecordA = createHeadlessRecord({
        attemptId: "att_child_wait_candidate_batch_a",
        parentAttemptId: "att_root_wait_candidate_batch",
        sessionId: "thr_child_wait_candidate_batch_a",
        sourceKind: "fork"
      });
      const childRecordB = createHeadlessRecord({
        attemptId: "att_child_wait_candidate_batch_b",
        lifecycleState: "completed",
        parentAttemptId: "att_root_wait_candidate_batch",
        sourceKind: "delegated"
      });
      const grandchildRecord = createRecord({
        attemptId: "att_grandchild_wait_candidate_batch",
        parentAttemptId: "att_child_wait_candidate_batch_b",
        sessionId: "thr_grandchild_wait_candidate_batch",
        sourceKind: "delegated"
      });
      const headlessContextBatch = deriveExecutionSessionSpawnHeadlessContextBatch({
        headlessViewBatch: {
          headlessRecordBatch: {
            results: [childRecordA, childRecordB]
          },
          view: buildExecutionSessionView([
            rootRecord,
            childRecordA.record,
            childRecordB.record,
            grandchildRecord
          ])
        } satisfies ExecutionSessionSpawnHeadlessViewBatch
      });
      const firstContext = headlessContextBatch.results[0];
      const secondContext = headlessContextBatch.results[1];
      const sharedView = headlessContextBatch.headlessViewBatch.view;

      const result = deriveExecutionSessionSpawnHeadlessWaitCandidateBatch({
        headlessContextBatch
      }) as unknown as Record<string, unknown>;
      const typedResult = result as ExecutionSessionSpawnHeadlessWaitCandidateBatch &
        Record<string, unknown>;

      expect(typedResult.headlessContextBatch).toBe(headlessContextBatch);
      expect(typedResult.results).toHaveLength(2);
      expect(typedResult.results[0]?.headlessContext).toBe(
        headlessContextBatch.results[0]
      );
      expect(typedResult.results[1]?.headlessContext).toBe(
        headlessContextBatch.results[1]
      );
      expect(typedResult.results[0]?.candidate.context).toBe(
        headlessContextBatch.results[0]?.context
      );
      expect(typedResult.results[1]?.candidate.context).toBe(
        headlessContextBatch.results[1]?.context
      );
      expect(typedResult.results[0]?.candidate.readiness).toEqual(
        deriveExecutionSessionWaitReadiness({
          context: headlessContextBatch.results[0]!.context
        })
      );
      expect(typedResult.results[1]?.candidate.readiness).toEqual({
        blockingReasons: ["lifecycle_terminal", "session_unknown", "child_attempts_present"],
        canWait: false,
        hasBlockingReasons: true
      });
      expect(typedResult).not.toHaveProperty("headlessContext");
      expect(typedResult).not.toHaveProperty("candidate");
      expect(typedResult).not.toHaveProperty("summary");
      expect(typedResult).not.toHaveProperty("count");
      expect(typedResult).not.toHaveProperty("error");
      expect(typedResult).not.toHaveProperty("errors");
      expect(typedResult).not.toHaveProperty("spawnHeadlessWaitCandidate");
      expect(typedResult).not.toHaveProperty("spawnHeadlessWaitCandidateBatch");
      expect(headlessContextBatch.results[0]).toBe(firstContext);
      expect(headlessContextBatch.results[1]).toBe(secondContext);
      expect(headlessContextBatch.headlessViewBatch.view).toBe(sharedView);
    });
  }
);

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
    lifecycleState?: ExecutionSessionRecord["lifecycleState"];
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
                overrides.parentAttemptId ?? "att_root_wait_candidate_batch",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_root_wait_candidate_batch",
              sourceKind: requestSourceKind
            },
            invoked: true
          },
          effects: {
            lineage: {
              attemptId: overrides.attemptId,
              sourceKind: lineageSourceKind,
              parentAttemptId:
                overrides.parentAttemptId ?? "att_root_wait_candidate_batch"
            },
            requestedEvent: {
              attemptId:
                overrides.parentAttemptId ?? "att_root_wait_candidate_batch",
              runtime: "codex-cli",
              sessionId: "thr_root_wait_candidate_batch",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId:
                overrides.parentAttemptId ?? "att_root_wait_candidate_batch",
              runtime: "codex-cli",
              sessionId: "thr_root_wait_candidate_batch",
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
              overrides.parentAttemptId ?? "att_root_wait_candidate_batch"
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
      runtime: "codex-cli",
      sourceKind: overrides.sourceKind,
      ...(overrides.lifecycleState === undefined
        ? {}
        : { lifecycleState: overrides.lifecycleState }),
      ...(overrides.sessionId === undefined
        ? {}
        : { sessionId: overrides.sessionId }),
      ...(overrides.parentAttemptId === undefined
        ? {}
        : { parentAttemptId: overrides.parentAttemptId })
    })
  };
}
