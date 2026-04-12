import { describe, expect, it } from "vitest";

import type { HeadlessExecutionResult } from "../../src/adapters/types.js";
import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionSpawnHeadlessRecordBatch,
  type ExecutionSessionSpawnHeadlessExecute
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-headless-record-batch helpers", () => {
  it("should fail loudly when the top-level headless-record batch input is malformed", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessRecordBatch(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessRecordBatch(undefined as never)
    ).toThrow(
      "Execution session spawn headless record batch input must be an object."
    );
  });

  it("should return an empty batch result when given no items", () => {
    expect(
      deriveExecutionSessionSpawnHeadlessRecordBatch({
        items: []
      })
    ).toEqual({
      results: []
    });
  });

  it("should preserve input order while deriving headless record results", () => {
    const items = [
      createHeadlessExecute({
        attemptId: "att_child_record_1",
        parentAttemptId: "att_parent_record_1",
        sessionId: "thr_child_record_1",
        prompt: "child one",
        sourceKind: "fork"
      }),
      createHeadlessExecute({
        attemptId: "att_child_record_2",
        parentAttemptId: "att_parent_record_2",
        sessionId: "thr_child_record_2",
        prompt: "child two",
        sourceKind: "delegated"
      })
    ];
    const itemsSnapshot = JSON.parse(
      JSON.stringify(items)
    ) as ExecutionSessionSpawnHeadlessExecute[];
    const result =
      deriveExecutionSessionSpawnHeadlessRecordBatch({
        items
      }) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      results: [
        {
          headlessExecute: items[0],
          record: {
            attemptId: "att_child_record_1",
            runtime: "codex-cli",
            sourceKind: "fork",
            parentAttemptId: "att_parent_record_1",
            sessionId: "thr_child_record_1",
            lifecycleState: "active",
            runCompleted: false,
            errorEventCount: 0,
            origin: "headless_result"
          }
        },
        {
          headlessExecute: items[1],
          record: {
            attemptId: "att_child_record_2",
            runtime: "codex-cli",
            sourceKind: "delegated",
            parentAttemptId: "att_parent_record_2",
            sessionId: "thr_child_record_2",
            lifecycleState: "active",
            runCompleted: false,
            errorEventCount: 0,
            origin: "headless_result"
          }
        }
      ]
    });
    expect(result).not.toHaveProperty("record");
    expect(result).not.toHaveProperty("records");
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("view");
    expect(result).not.toHaveProperty("index");
    expect(result).not.toHaveProperty("context");
    expect(result).not.toHaveProperty("runtimeState");
    expect(result).not.toHaveProperty("spawnHeadlessRecord");
    expect(result).not.toHaveProperty("spawnHeadlessRecordBatch");
    expect(result).not.toHaveProperty("spawnHeadlessView");
    expect(result).not.toHaveProperty("spawnHeadlessViewBatch");
    expect(items).toEqual(itemsSnapshot);
  });

  it("should fail loudly when a batch entry is not an object", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessRecordBatch({
        items: [null] as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessRecordBatch({
        items: [null] as never
      })
    ).toThrow(
      "Execution session spawn headless record batch requires items entries to be objects."
    );
  });

  it("should fail fast on the first record derivation error", () => {
    const invalidItem = createHeadlessExecute() as ExecutionSessionSpawnHeadlessExecute & {
      headlessApply: {
        headlessInput: {
          attempt?: unknown;
        };
      };
    };

    delete (
      invalidItem.headlessApply.headlessInput as {
        attempt?: unknown;
      }
    ).attempt;

    const untouchedItem = {
      get headlessApply(): never {
        throw new Error("should not reach later batch items");
      },
      executionResult: createHeadlessExecutionResult()
    } as unknown as ExecutionSessionSpawnHeadlessExecute;

    expect(() =>
      deriveExecutionSessionSpawnHeadlessRecordBatch({
        items: [createHeadlessExecute(), invalidItem, untouchedItem]
      })
    ).toThrow("Execution session spawn headless record requires attempt lineage.");
  });
});

function createHeadlessExecute(
  overrides: {
    attemptId?: string;
    parentAttemptId?: string;
    prompt?: string;
    sessionId?: string;
    sourceKind?: "fork" | "delegated";
  } = {}
): ExecutionSessionSpawnHeadlessExecute {
  const attemptId = overrides.attemptId ?? "att_child_record";
  const parentAttemptId = overrides.parentAttemptId ?? "att_parent_record";
  const prompt = overrides.prompt ?? "Reply with exactly: ok";
  const sessionId = overrides.sessionId ?? "thr_child_record";
  const sourceKind = overrides.sourceKind ?? "delegated";

  return {
    headlessApply: {
      apply: {
        consume: {
          request: {
            parentAttemptId,
            parentRuntime: "codex-cli",
            parentSessionId: `parent_${sessionId}`,
            sourceKind
          },
          invoked: true
        },
        effects: {
          lineage: {
            attemptId,
            parentAttemptId,
            sourceKind
          },
          requestedEvent: {
            attemptId: parentAttemptId,
            runtime: "codex-cli",
            sessionId: `parent_${sessionId}`,
            lifecycleEventKind: "spawn_requested"
          },
          recordedEvent: {
            attemptId: parentAttemptId,
            runtime: "codex-cli",
            sessionId: `parent_${sessionId}`,
            lifecycleEventKind: "spawn_recorded"
          }
        }
      },
      headlessInput: {
        prompt,
        attempt: {
          attemptId,
          parentAttemptId,
          sourceKind
        }
      }
    },
    executionResult: createHeadlessExecutionResult({
      observation: {
        threadId: sessionId,
        runCompleted: false,
        errorEventCount: 0
      }
    })
  };
}

function createHeadlessExecutionResult(
  overrides: Partial<HeadlessExecutionResult> = {}
): HeadlessExecutionResult {
  return {
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
      runCompleted: true,
      errorEventCount: 0
    },
    stderr: "",
    stdout: "",
    ...overrides
  };
}
