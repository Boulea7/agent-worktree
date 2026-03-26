import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionSpawnHeadlessView,
  type ExecutionSessionSpawnHeadlessRecord
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-headless-view helpers", () => {
  it("should build an execution session view from existing headless record metadata", () => {
    const headlessRecord = createHeadlessRecord();
    const headlessRecordSnapshot = JSON.parse(
      JSON.stringify(headlessRecord)
    ) as ExecutionSessionSpawnHeadlessRecord;
    const result = deriveExecutionSessionSpawnHeadlessView({
      headlessRecord
    }) as unknown as Record<string, unknown>;
    const view = result.view as {
      childAttemptIdsByParent: Map<string, string[]>;
      index: {
        byAttemptId: Map<string, ExecutionSessionSpawnHeadlessRecord["record"]>;
        bySessionId: Map<string, ExecutionSessionSpawnHeadlessRecord["record"]>;
      };
    };

    expect(result.headlessRecord).toBe(headlessRecord);
    expect(view.index.byAttemptId.get("att_child_view")).toBe(
      headlessRecord.record
    );
    expect(view.index.bySessionId.get("thr_child_view")).toBe(
      headlessRecord.record
    );
    expect(view.childAttemptIdsByParent.get("att_parent_view")).toEqual([
      "att_child_view"
    ]);
    expect(result).not.toHaveProperty("record");
    expect(result).not.toHaveProperty("results");
    expect(result).not.toHaveProperty("selector");
    expect(result).not.toHaveProperty("context");
    expect(result).not.toHaveProperty("headlessView");
    expect(result).not.toHaveProperty("headlessViewBatch");
    expect(result).not.toHaveProperty("readiness");
    expect(result).not.toHaveProperty("runtimeState");
    expect(result).not.toHaveProperty("headlessRecordBatch");
    expect(result).not.toHaveProperty("spawnHeadlessView");
    expect(result).not.toHaveProperty("spawnHeadlessViewBatch");
    expect(result).not.toHaveProperty("spawnHeadlessContext");
    expect(result).not.toHaveProperty("spawnHeadlessContextBatch");
    expect(headlessRecord).toEqual(headlessRecordSnapshot);
  });

  it("should surface view derivation failures without wrapping them", () => {
    const headlessRecord = createHeadlessRecord({
      record: {
        parentAttemptId: "   "
      }
    });

    expect(() =>
      deriveExecutionSessionSpawnHeadlessView({
        headlessRecord
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessView({
        headlessRecord
      })
    ).toThrow(
      "Execution session view parentAttemptId must be a non-empty string when present."
    );
  });
});

function createHeadlessRecord(
  overrides: {
    record?: Partial<ExecutionSessionSpawnHeadlessRecord["record"]>;
  } = {}
): ExecutionSessionSpawnHeadlessRecord {
  const record: ExecutionSessionSpawnHeadlessRecord["record"] = {
    attemptId: "att_child_view",
    runtime: "codex-cli",
    sourceKind: "delegated",
    parentAttemptId: "att_parent_view",
    sessionId: "thr_child_view",
    lifecycleState: "active",
    runCompleted: false,
    errorEventCount: 0,
    origin: "headless_result" as const,
    ...overrides.record
  };

  return {
    headlessExecute: {
      headlessApply: {
        apply: {
          consume: {
            request: {
              parentAttemptId: "att_parent_view",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_parent_view",
              sourceKind: "delegated"
            },
            invoked: true
          },
          effects: {
            lineage: {
              attemptId: "att_child_view",
              parentAttemptId: "att_parent_view",
              sourceKind: "delegated"
            },
            requestedEvent: {
              attemptId: "att_parent_view",
              runtime: "codex-cli",
              sessionId: "thr_parent_view",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId: "att_parent_view",
              runtime: "codex-cli",
              sessionId: "thr_parent_view",
              lifecycleEventKind: "spawn_recorded"
            }
          }
        },
        headlessInput: {
          prompt: "Reply with exactly: ok",
          attempt: {
            attemptId: "att_child_view",
            parentAttemptId: "att_parent_view",
            sourceKind: "delegated"
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
          threadId: "thr_child_view"
        },
        stderr: "",
        stdout: ""
      }
    },
    record
  };
}
