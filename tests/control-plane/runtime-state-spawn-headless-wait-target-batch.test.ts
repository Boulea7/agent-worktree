import { describe, expect, it } from "vitest";

import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnHeadlessContext,
  deriveExecutionSessionSpawnHeadlessContextBatch,
  deriveExecutionSessionSpawnHeadlessWaitCandidate,
  deriveExecutionSessionSpawnHeadlessWaitTargetBatch,
  type ExecutionSessionRecord,
  type ExecutionSessionSpawnHeadlessRecord,
  type ExecutionSessionSpawnHeadlessView,
  type ExecutionSessionSpawnHeadlessViewBatch,
  type ExecutionSessionSpawnHeadlessWaitCandidateBatch
} from "../../src/control-plane/internal.js";

describe(
  "control-plane runtime-state spawn-headless-wait-target-batch helpers",
  () => {
    it("should return an empty ordered result list for an empty headless wait-candidate batch", () => {
      const headlessWaitCandidateBatch = {
        headlessContextBatch: deriveExecutionSessionSpawnHeadlessContextBatch({
          headlessViewBatch: {
            headlessRecordBatch: {
              results: []
            },
            view: buildExecutionSessionView([])
          }
        }),
        results: []
      } satisfies ExecutionSessionSpawnHeadlessWaitCandidateBatch;

      const result = deriveExecutionSessionSpawnHeadlessWaitTargetBatch({
        headlessWaitCandidateBatch
      }) as unknown as Record<string, unknown>;

      expect(result.headlessWaitCandidateBatch).toBe(headlessWaitCandidateBatch);
      expect(result.results).toEqual([]);
      expect(result).not.toHaveProperty("summary");
      expect(result).not.toHaveProperty("count");
      expect(result).not.toHaveProperty("error");
      expect(result).not.toHaveProperty("errors");
    });

    it("should preserve ordering while keeping blocked headless wait candidates in place", () => {
      const headlessWaitCandidateBatch = createHeadlessWaitCandidateBatch({
        candidates: [
          {
            attemptId: "att_child_wait_target_batch_a",
            parentAttemptId: "att_root_wait_target_batch",
            sessionId: "thr_child_wait_target_batch_a",
            sourceKind: "fork"
          },
          {
            attemptId: "att_child_wait_target_batch_b",
            parentAttemptId: "att_root_wait_target_batch",
            sourceKind: "delegated"
          }
        ]
      });
      const batchSnapshot = structuredClone(headlessWaitCandidateBatch);

      const result = deriveExecutionSessionSpawnHeadlessWaitTargetBatch({
        headlessWaitCandidateBatch
      }) as unknown as Record<string, unknown> & {
        results: Array<Record<string, unknown>>;
      };

      expect(result.headlessWaitCandidateBatch).toBe(headlessWaitCandidateBatch);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.headlessWaitCandidate).toBe(
        headlessWaitCandidateBatch.results[0]
      );
      expect(result.results[1]?.headlessWaitCandidate).toBe(
        headlessWaitCandidateBatch.results[1]
      );
      expect(result.results[0]?.target).toEqual({
        attemptId: "att_child_wait_target_batch_a",
        runtime: "codex-cli",
        sessionId: "thr_child_wait_target_batch_a"
      });
      expect(result.results[1]).not.toHaveProperty("target");
      expect(result.results[0]).not.toHaveProperty("headlessContext");
      expect(result.results[0]).not.toHaveProperty("candidate");
      expect(result.results[0]).not.toHaveProperty("waitTarget");
      expect(result.results[1]).not.toHaveProperty("headlessContext");
      expect(result.results[1]).not.toHaveProperty("candidate");
      expect(result.results[1]).not.toHaveProperty("waitTarget");
      expect(result).not.toHaveProperty("headlessWaitCandidate");
      expect(result).not.toHaveProperty("candidate");
      expect(result).not.toHaveProperty("headlessContext");
      expect(result).not.toHaveProperty("summary");
      expect(result).not.toHaveProperty("count");
      expect(result).not.toHaveProperty("error");
      expect(result).not.toHaveProperty("errors");
      expect(result).not.toHaveProperty("request");
      expect(result).not.toHaveProperty("consumer");
      expect(result).not.toHaveProperty("consume");
      expect(batchSnapshot).toEqual(headlessWaitCandidateBatch);
    });

    it("should fail fast on the first wait-target derivation error and stop later items", () => {
      const validHeadlessWaitCandidate = createHeadlessWaitCandidate({
        attemptId: "att_child_wait_target_batch_valid",
        parentAttemptId: "att_root_wait_target_batch_fail",
        sessionId: "thr_child_wait_target_batch_valid",
        sourceKind: "fork"
      });
      let tailCandidateAccessed = false;

      const failingHeadlessWaitCandidate = {
        headlessContext: validHeadlessWaitCandidate.headlessContext,
        get candidate() {
          throw new Error("wait target derivation failed");
        }
      };
      const tailHeadlessWaitCandidate = {
        headlessContext: validHeadlessWaitCandidate.headlessContext,
        get candidate() {
          tailCandidateAccessed = true;
          return validHeadlessWaitCandidate.candidate;
        }
      };

      expect(() =>
        deriveExecutionSessionSpawnHeadlessWaitTargetBatch({
          headlessWaitCandidateBatch: {
            headlessContextBatch: {
              headlessViewBatch: {
                headlessRecordBatch: {
                  results: []
                },
                view: buildExecutionSessionView([])
              },
              results: []
            },
            results: [
              validHeadlessWaitCandidate,
              failingHeadlessWaitCandidate,
              tailHeadlessWaitCandidate
            ]
          } as unknown as ExecutionSessionSpawnHeadlessWaitCandidateBatch
        })
      ).toThrow("wait target derivation failed");
      expect(tailCandidateAccessed).toBe(false);
    });
  }
);

function createHeadlessWaitCandidateBatch(input: {
  candidates: Array<{
    attemptId: string;
    sourceKind: "direct" | "fork" | "delegated";
    parentAttemptId?: string;
    sessionId?: string;
  }>;
}) {
  const headlessViewBatch = buildHeadlessViewBatch(input.candidates);
  const headlessContextBatch = deriveExecutionSessionSpawnHeadlessContextBatch({
    headlessViewBatch
  });

  return {
    headlessContextBatch,
    results: input.candidates.map((candidate, index) =>
      deriveExecutionSessionSpawnHeadlessWaitCandidate({
        headlessContext: headlessContextBatch.results[index]!
      })
    )
  } satisfies ExecutionSessionSpawnHeadlessWaitCandidateBatch;
}

function buildHeadlessViewBatch(
  candidates: Array<{
    attemptId: string;
    sourceKind: "direct" | "fork" | "delegated";
    parentAttemptId?: string;
    sessionId?: string;
  }>
) {
  const rootRecord = createRecord({
    attemptId: "att_root_wait_target_batch",
    sessionId: "thr_root_wait_target_batch",
    sourceKind: "direct"
  });
  const headlessRecords = candidates.map((candidate) =>
    createHeadlessRecord({
      attemptId: candidate.attemptId,
      sourceKind: candidate.sourceKind,
      ...(candidate.parentAttemptId === undefined
        ? {}
        : { parentAttemptId: candidate.parentAttemptId }),
      ...(candidate.sessionId === undefined
        ? {}
        : { sessionId: candidate.sessionId })
    })
  );

  return {
    headlessRecordBatch: {
      results: headlessRecords
    },
    view: buildExecutionSessionView([
      rootRecord,
      ...headlessRecords.map((headlessRecord) => headlessRecord.record)
    ])
  } satisfies ExecutionSessionSpawnHeadlessViewBatch;
}

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
    overrides.parentAttemptId ?? "att_parent_wait_target_batch";
  const parentRecord = createRecord({
    attemptId: parentAttemptId,
    sessionId: "thr_parent_wait_target_batch",
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
                overrides.parentAttemptId ?? "att_parent_wait_target_batch",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_parent_wait_target_batch",
              sourceKind: requestSourceKind
            },
            invoked: true
          },
          effects: {
            lineage: {
              attemptId: overrides.attemptId,
              sourceKind: lineageSourceKind,
              parentAttemptId:
                overrides.parentAttemptId ?? "att_parent_wait_target_batch"
            },
            requestedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_parent_wait_target_batch",
              runtime: "codex-cli",
              sessionId: "thr_parent_wait_target_batch",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_parent_wait_target_batch",
              runtime: "codex-cli",
              sessionId: "thr_parent_wait_target_batch",
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
