import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionSpawnHeadlessViewBatch,
  type ExecutionSessionSpawnHeadlessRecord,
  type ExecutionSessionSpawnHeadlessRecordBatch
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-headless-view-batch helpers", () => {
  it("should return an empty view for an empty headless-record batch", () => {
    const headlessRecordBatch = {
      results: []
    } satisfies ExecutionSessionSpawnHeadlessRecordBatch;
    const result = deriveExecutionSessionSpawnHeadlessViewBatch({
      headlessRecordBatch
    }) as unknown as Record<string, unknown>;
    const view = result.view as {
      childAttemptIdsByParent: Map<string, string[]>;
      index: {
        byAttemptId: Map<string, ExecutionSessionSpawnHeadlessRecord["record"]>;
        bySessionId: Map<string, ExecutionSessionSpawnHeadlessRecord["record"]>;
      };
    };

    expect(result.headlessRecordBatch).toBe(headlessRecordBatch);
    expect(view.index.byAttemptId.size).toBe(0);
    expect(view.index.bySessionId.size).toBe(0);
    expect(view.childAttemptIdsByParent.size).toBe(0);
  });

  it("should preserve record ordering while composing a shared execution session view", () => {
    const headlessRecordBatch = createHeadlessRecordBatch();
    const batchSnapshot = JSON.parse(
      JSON.stringify(headlessRecordBatch)
    ) as ExecutionSessionSpawnHeadlessRecordBatch;
    const result = deriveExecutionSessionSpawnHeadlessViewBatch({
      headlessRecordBatch
    }) as unknown as Record<string, unknown>;
    const view = result.view as {
      childAttemptIdsByParent: Map<string, string[]>;
      index: {
        byAttemptId: Map<string, ExecutionSessionSpawnHeadlessRecord["record"]>;
        bySessionId: Map<string, ExecutionSessionSpawnHeadlessRecord["record"]>;
      };
    };

    expect(result.headlessRecordBatch).toBe(headlessRecordBatch);
    expect(view.index.byAttemptId.get("att_root_view")).toBe(
      headlessRecordBatch.results[0]?.record
    );
    expect(view.index.bySessionId.get("thr_child_view_a")).toBe(
      headlessRecordBatch.results[1]?.record
    );
    expect(view.index.bySessionId.get("thr_child_view_b")).toBe(
      headlessRecordBatch.results[2]?.record
    );
    expect(view.childAttemptIdsByParent.get("att_root_view")).toEqual([
      "att_child_view_a",
      "att_child_view_b"
    ]);
    expect(result.descendantCoverage).toBe("incomplete");
    expect(result).not.toHaveProperty("record");
    expect(result).not.toHaveProperty("records");
    expect(result).not.toHaveProperty("selector");
    expect(result).not.toHaveProperty("context");
    expect(result).not.toHaveProperty("headlessView");
    expect(result).not.toHaveProperty("headlessViewBatch");
    expect(result).not.toHaveProperty("readiness");
    expect(result).not.toHaveProperty("runtimeState");
    expect(result).not.toHaveProperty("headlessRecord");
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("spawnHeadlessView");
    expect(result).not.toHaveProperty("spawnHeadlessViewBatch");
    expect(result).not.toHaveProperty("spawnHeadlessContext");
    expect(result).not.toHaveProperty("spawnHeadlessContextBatch");
    expect(headlessRecordBatch).toEqual(batchSnapshot);
  });

  it("should surface view derivation failures for duplicate records", () => {
    const duplicateBatch = createHeadlessRecordBatch({
      childAttemptIdB: "att_child_view_a"
    });

    expect(() =>
      deriveExecutionSessionSpawnHeadlessViewBatch({
        headlessRecordBatch: duplicateBatch
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessViewBatch({
        headlessRecordBatch: duplicateBatch
      })
    ).toThrow("Duplicate execution session record for attempt att_child_view_a.");
  });
});

function createHeadlessRecordBatch(
  overrides: {
    childAttemptIdB?: string;
  } = {}
): ExecutionSessionSpawnHeadlessRecordBatch {
  return {
    results: [
      createHeadlessRecord({
        attemptId: "att_root_view",
        sessionId: "thr_root_view",
        sourceKind: "direct"
      }),
      createHeadlessRecord({
        attemptId: "att_child_view_a",
        parentAttemptId: "att_root_view",
        sessionId: "thr_child_view_a",
        sourceKind: "fork"
      }),
      createHeadlessRecord({
        attemptId: overrides.childAttemptIdB ?? "att_child_view_b",
        parentAttemptId: "att_root_view",
        sessionId: "thr_child_view_b",
        sourceKind: "delegated"
      })
    ]
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
              parentAttemptId: overrides.parentAttemptId ?? "att_parent_view",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_parent_view",
              sourceKind: requestSourceKind
            },
            invoked: true
          },
          effects: {
            lineage: {
              attemptId: overrides.attemptId,
              sourceKind: lineageSourceKind,
              parentAttemptId: overrides.parentAttemptId ?? "att_parent_view"
            },
            requestedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_parent_view",
              runtime: "codex-cli",
              sessionId: "thr_parent_view",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_parent_view",
              runtime: "codex-cli",
              sessionId: "thr_parent_view",
              lifecycleEventKind: "spawn_recorded"
            }
          }
        },
        headlessInput: {
          prompt: "Reply with exactly: ok",
          attempt: {
            attemptId: overrides.attemptId,
            sourceKind: lineageSourceKind,
            parentAttemptId: overrides.parentAttemptId ?? "att_parent_view"
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
    record: {
      attemptId: overrides.attemptId,
      runtime: "codex-cli",
      sourceKind: overrides.sourceKind,
      lifecycleState: "active",
      runCompleted: false,
      errorEventCount: 0,
      origin: "headless_result",
      sessionId: overrides.sessionId,
      ...(overrides.parentAttemptId === undefined
        ? {}
        : { parentAttemptId: overrides.parentAttemptId })
    }
  };
}
