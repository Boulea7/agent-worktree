import { describe, expect, it } from "vitest";

import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnHeadlessCloseCandidateBatch,
  deriveExecutionSessionSpawnHeadlessContextBatch,
  type ExecutionSessionRecord,
  type ExecutionSessionSpawnHeadlessContextBatch,
  type ExecutionSessionSpawnHeadlessContextBatchInput,
  type ExecutionSessionSpawnHeadlessRecord,
  type ExecutionSessionSpawnHeadlessViewBatch
} from "../../src/control-plane/index.js";

describe(
  "control-plane runtime-state spawn-headless-close-candidate-batch helpers",
  () => {
    it("should return an empty ordered result list for an empty headless-context batch", () => {
      const headlessContextBatch = deriveEmptyHeadlessContextBatch();

      const result = deriveExecutionSessionSpawnHeadlessCloseCandidateBatch({
        headlessContextBatch
      }) as unknown as Record<string, unknown>;

      expect(result.headlessContextBatch).toBe(headlessContextBatch);
      expect(result.results).toEqual([]);
      expect(result).not.toHaveProperty("summary");
      expect(result).not.toHaveProperty("count");
      expect(result).not.toHaveProperty("error");
      expect(result).not.toHaveProperty("errors");
    });

    it("should preserve ordering while reusing each supplied headless context", () => {
      const headlessContextBatch = createHeadlessContextBatch({
        records: [
          {
            attemptId: "att_child_close_candidate_batch_a",
            parentAttemptId: "att_root_close_candidate_batch",
            sessionId: "thr_child_close_candidate_batch_a",
            sourceKind: "fork"
          },
          {
            attemptId: "att_child_close_candidate_batch_b",
            parentAttemptId: "att_root_close_candidate_batch",
            sessionId: "thr_child_close_candidate_batch_b",
            sourceKind: "delegated"
          }
        ]
      });

      const result = deriveExecutionSessionSpawnHeadlessCloseCandidateBatch({
        headlessContextBatch,
        resolveSessionLifecycleCapability: () => true
      }) as unknown as ExecutionSessionSpawnHeadlessContextBatch &
        Record<string, unknown> & {
          results: Array<{
            candidate: {
              context: unknown;
              readiness: unknown;
            };
            headlessContext: unknown;
          }>;
        };

      expect(result.headlessContextBatch).toBe(headlessContextBatch);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.headlessContext).toBe(
        headlessContextBatch.results[0]
      );
      expect(result.results[1]?.headlessContext).toBe(
        headlessContextBatch.results[1]
      );
      expect(result.results[0]?.candidate.context).toBe(
        headlessContextBatch.results[0]?.context
      );
      expect(result.results[1]?.candidate.context).toBe(
        headlessContextBatch.results[1]?.context
      );
      expect(result.results[0]?.candidate.readiness).toEqual({
        blockingReasons: [],
        sessionLifecycleSupported: true,
        alreadyFinal: false,
        wouldAffectDescendants: false,
        canClose: true,
        hasBlockingReasons: false
      });
      expect(result.results[1]?.candidate.readiness).toEqual({
        blockingReasons: [],
        sessionLifecycleSupported: true,
        alreadyFinal: false,
        wouldAffectDescendants: false,
        canClose: true,
        hasBlockingReasons: false
      });
      expect(result).not.toHaveProperty("headlessContext");
      expect(result).not.toHaveProperty("candidate");
      expect(result).not.toHaveProperty("summary");
      expect(result).not.toHaveProperty("count");
      expect(result).not.toHaveProperty("error");
      expect(result).not.toHaveProperty("errors");
    });

    it("should fail fast when any item readiness derivation throws", () => {
      const headlessContextBatch = createHeadlessContextBatch({
        records: [
          {
            attemptId: "att_child_close_candidate_batch_fail_a",
            parentAttemptId: "att_root_close_candidate_batch_fail",
            sessionId: "thr_child_close_candidate_batch_fail_a",
            sourceKind: "fork"
          },
          {
            attemptId: "att_child_close_candidate_batch_fail_b",
            parentAttemptId: "att_root_close_candidate_batch_fail",
            sessionId: "thr_child_close_candidate_batch_fail_b",
            sourceKind: "delegated"
          },
          {
            attemptId: "att_child_close_candidate_batch_fail_c",
            parentAttemptId: "att_root_close_candidate_batch_fail",
            sessionId: "thr_child_close_candidate_batch_fail_c",
            sourceKind: "fork"
          }
        ]
      });
      let calls = 0;

      expect(() =>
        deriveExecutionSessionSpawnHeadlessCloseCandidateBatch({
          headlessContextBatch,
          resolveSessionLifecycleCapability: () => {
            calls += 1;

            if (calls === 2) {
              throw new Error("resolver failed");
            }

            return true;
          }
        })
      ).toThrow("resolver failed");
      expect(calls).toBe(2);
    });
  }
);

function deriveEmptyHeadlessContextBatch() {
  return deriveExecutionSessionSpawnHeadlessContextBatch({
    headlessViewBatch: {
      headlessRecordBatch: {
        results: []
      },
      view: buildExecutionSessionView([])
    }
  });
}

function createHeadlessContextBatch(input: {
  records: Array<{
    attemptId: string;
    parentAttemptId: string;
    sessionId: string;
    sourceKind: "direct" | "fork" | "delegated";
  }>;
}) {
  const rootAttemptId = input.records[0]?.parentAttemptId ?? "att_root_default";
  const rootRecord = createRecord({
    attemptId: rootAttemptId,
    sessionId: "thr_root_close_candidate_batch",
    sourceKind: "direct"
  });
  const headlessRecords = input.records.map((record) =>
    createHeadlessRecord(record)
  );
  const headlessViewBatch = {
    headlessRecordBatch: {
      results: headlessRecords
    },
    view: buildExecutionSessionView([rootRecord, ...headlessRecords.map((item) => item.record)])
  } satisfies ExecutionSessionSpawnHeadlessViewBatch;

  return deriveExecutionSessionSpawnHeadlessContextBatch({
    headlessViewBatch
  } satisfies ExecutionSessionSpawnHeadlessContextBatchInput);
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
                overrides.parentAttemptId ?? "att_root_close_candidate_batch",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_root_close_candidate_batch",
              sourceKind: requestSourceKind
            },
            invoked: true
          },
          effects: {
            lineage: {
              attemptId: overrides.attemptId,
              sourceKind: lineageSourceKind,
              parentAttemptId:
                overrides.parentAttemptId ?? "att_root_close_candidate_batch"
            },
            requestedEvent: {
              attemptId:
                overrides.parentAttemptId ?? "att_root_close_candidate_batch",
              runtime: "codex-cli",
              sessionId: "thr_root_close_candidate_batch",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId:
                overrides.parentAttemptId ?? "att_root_close_candidate_batch",
              runtime: "codex-cli",
              sessionId: "thr_root_close_candidate_batch",
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
              overrides.parentAttemptId ?? "att_root_close_candidate_batch"
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
