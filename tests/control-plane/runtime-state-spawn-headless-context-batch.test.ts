import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnHeadlessContextBatch,
  type ExecutionSessionRecord,
  type ExecutionSessionSpawnHeadlessContextBatch,
  type ExecutionSessionSpawnHeadlessRecord,
  type ExecutionSessionSpawnHeadlessRecordBatch,
  type ExecutionSessionSpawnHeadlessViewBatch
} from "../../src/control-plane/internal.js";

describe(
  "control-plane runtime-state spawn-headless-context-batch helpers",
  () => {
    it("should return an empty ordered result list for an empty headless-view batch", () => {
      const headlessViewBatch = {
        descendantCoverage: "complete",
        headlessRecordBatch: {
          results: []
        },
        view: buildExecutionSessionView([])
      } satisfies ExecutionSessionSpawnHeadlessViewBatch;

      const result = deriveExecutionSessionSpawnHeadlessContextBatch({
        headlessViewBatch
      }) as unknown as Record<string, unknown>;

      expect(result.headlessViewBatch).toBe(headlessViewBatch);
      expect(result.results).toEqual([]);
      expect(result).not.toHaveProperty("summary");
      expect(result).not.toHaveProperty("count");
      expect(result).not.toHaveProperty("error");
      expect(result).not.toHaveProperty("errors");
    });

    it("should preserve result ordering while reusing the supplied shared view", () => {
      const rootRecord = createRecord({
        attemptId: "att_root_context_batch",
        sessionId: "thr_root_context_batch",
        sourceKind: "direct"
      });
      const childRecordA = createHeadlessRecord({
        attemptId: "att_child_context_batch_a",
        parentAttemptId: "att_root_context_batch",
        sessionId: "thr_child_context_batch_a",
        sourceKind: "fork"
      });
      const childRecordB = createHeadlessRecord({
        attemptId: "att_child_context_batch_b",
        parentAttemptId: "att_root_context_batch",
        sessionId: "thr_child_context_batch_b",
        sourceKind: "delegated"
      });
      const grandchildRecord = createRecord({
        attemptId: "att_grandchild_context_batch",
        parentAttemptId: "att_child_context_batch_a",
        sessionId: "thr_grandchild_context_batch",
        sourceKind: "delegated"
      });
      const headlessViewBatch = {
        descendantCoverage: "complete",
        headlessRecordBatch: {
          results: [childRecordA, childRecordB]
        },
        view: buildExecutionSessionView([
          rootRecord,
          childRecordA.record,
          childRecordB.record,
          grandchildRecord
        ])
      } satisfies ExecutionSessionSpawnHeadlessViewBatch;
      const batchSnapshot = JSON.parse(
        JSON.stringify(headlessViewBatch.headlessRecordBatch)
      ) as ExecutionSessionSpawnHeadlessRecordBatch;

      const result = deriveExecutionSessionSpawnHeadlessContextBatch({
        headlessViewBatch
      }) as unknown as Record<string, unknown>;
      const typedResult =
        result as ExecutionSessionSpawnHeadlessContextBatch & Record<string, unknown>;

      expect(typedResult.headlessViewBatch).toBe(headlessViewBatch);
      expect(typedResult.results).toHaveLength(2);
      expect(typedResult.results[0]?.headlessView.headlessRecord).toBe(childRecordA);
      expect(typedResult.results[1]?.headlessView.headlessRecord).toBe(childRecordB);
      expect(typedResult.results[0]?.headlessView.view).toBe(headlessViewBatch.view);
      expect(typedResult.results[1]?.headlessView.view).toBe(headlessViewBatch.view);
      expect(typedResult.results[0]?.context).toEqual({
        record: childRecordA.record,
        selectedBy: "attemptId",
        parentRecord: rootRecord,
        childRecords: [grandchildRecord],
        hasKnownSession: true,
        hasParent: true,
        hasResolvedParent: true,
        hasChildren: true
      });
      expect(typedResult.results[1]?.context).toEqual({
        record: childRecordB.record,
        selectedBy: "attemptId",
        parentRecord: rootRecord,
        childRecords: [],
        hasKnownSession: true,
        hasParent: true,
        hasResolvedParent: true,
        hasChildren: false
      });
      expect(typedResult.results[0]).not.toHaveProperty("candidate");
      expect(typedResult.results[1]).not.toHaveProperty("candidate");
      expect(typedResult).not.toHaveProperty("candidate");
      expect(typedResult).not.toHaveProperty("headlessView");
      expect(typedResult).not.toHaveProperty("candidate");
      expect(typedResult).not.toHaveProperty("summary");
      expect(typedResult).not.toHaveProperty("count");
      expect(typedResult).not.toHaveProperty("error");
      expect(typedResult).not.toHaveProperty("errors");
      expect(typedResult).not.toHaveProperty("spawnHeadlessWaitCandidate");
      expect(typedResult).not.toHaveProperty("spawnHeadlessWaitCandidateBatch");
      expect(headlessViewBatch.headlessRecordBatch).toEqual(batchSnapshot);
    });

    it("should fail fast when any headless view item cannot resolve its selected record", () => {
      const validSecondRecord = createHeadlessRecord({
        attemptId: "att_valid_context_batch",
        parentAttemptId: "att_root_context_batch",
        sessionId: "thr_valid_context_batch",
        sourceKind: "fork"
      });
      const invalidFirstRecord = createHeadlessRecord({
        attemptId: "att_missing_context_batch",
        parentAttemptId: "att_root_context_batch",
        sessionId: "thr_missing_context_batch",
        sourceKind: "delegated"
      });
      const headlessViewBatch = {
        descendantCoverage: "complete",
        headlessRecordBatch: {
          results: [invalidFirstRecord, validSecondRecord]
        },
        view: buildExecutionSessionView([
          createRecord({
            attemptId: "att_root_context_batch",
            sessionId: "thr_root_context_batch",
            sourceKind: "direct"
          }),
          validSecondRecord.record
        ])
      } satisfies ExecutionSessionSpawnHeadlessViewBatch;

      expect(() =>
        deriveExecutionSessionSpawnHeadlessContextBatch({
          headlessViewBatch
        })
      ).toThrow(ValidationError);
      expect(() =>
        deriveExecutionSessionSpawnHeadlessContextBatch({
          headlessViewBatch
        })
      ).toThrow(
        "Execution session spawn headless context requires a selected record."
      );
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
                overrides.parentAttemptId ?? "att_root_context_batch",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_root_context_batch",
              sourceKind: requestSourceKind
            },
            invoked: true
          },
          effects: {
            lineage: {
              attemptId: overrides.attemptId,
              sourceKind: lineageSourceKind,
              parentAttemptId:
                overrides.parentAttemptId ?? "att_root_context_batch"
            },
            requestedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_root_context_batch",
              runtime: "codex-cli",
              sessionId: "thr_root_context_batch",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_root_context_batch",
              runtime: "codex-cli",
              sessionId: "thr_root_context_batch",
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
              overrides.parentAttemptId ?? "att_root_context_batch"
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
