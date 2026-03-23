import { describe, expect, it } from "vitest";

import type { HeadlessExecutionResult } from "../../src/adapters/types.js";
import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionSpawnHeadlessRecord,
  type ExecutionSessionSpawnHeadlessExecute
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state spawn-headless-record helpers", () => {
  it("should derive an execution session record from existing headless execute metadata", () => {
    const headlessExecute = createHeadlessExecute();
    const headlessExecuteSnapshot = JSON.parse(
      JSON.stringify(headlessExecute)
    ) as ExecutionSessionSpawnHeadlessExecute;
    const result = deriveExecutionSessionSpawnHeadlessRecord({
      headlessExecute
    }) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      headlessExecute,
      record: {
        attemptId: "att_child_record",
        runtime: "codex-cli",
        sourceKind: "delegated",
        parentAttemptId: "att_parent_record",
        sessionId: "thr_child_record",
        lifecycleState: "active",
        runCompleted: false,
        errorEventCount: 0,
        origin: "headless_result",
        guardrails: {
          maxChildren: 2,
          maxDepth: 3
        },
        lastAgentMessage: "child running",
        turnStatus: "running"
      }
    });
    expect(result).not.toHaveProperty("results");
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
    expect(headlessExecute).toEqual(headlessExecuteSnapshot);
  });

  it("should require attempt lineage from the existing headless execute input", () => {
    const headlessExecute = createHeadlessExecute() as ExecutionSessionSpawnHeadlessExecute & {
      headlessApply: {
        headlessInput: {
          attempt?: unknown;
        };
      };
    };

    delete (
      headlessExecute.headlessApply.headlessInput as {
        attempt?: unknown;
      }
    ).attempt;

    expect(() =>
      deriveExecutionSessionSpawnHeadlessRecord({
        headlessExecute: headlessExecute as ExecutionSessionSpawnHeadlessExecute
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessRecord({
        headlessExecute: headlessExecute as ExecutionSessionSpawnHeadlessExecute
      })
    ).toThrow("Execution session spawn headless record requires attempt lineage.");
  });

  it("should surface execution-session derivation failures without wrapping them", () => {
    const headlessExecute = createHeadlessExecute();
    headlessExecute.executionResult = createHeadlessExecutionResult({
      observation: {
        threadId: "thr_child_record",
        runCompleted: false,
        errorEventCount: 0
      },
      controlPlane: {
        sessionSnapshot: {
          node: {
            attemptId: "att_other_child",
            nodeKind: "child",
            parentAttemptId: "att_parent_record",
            sourceKind: "delegated"
          },
          lifecycleState: "active",
          runCompleted: false,
          errorEventCount: 0,
          sessionRef: {
            runtime: "codex-cli",
            sessionId: "thr_child_record"
          }
        }
      }
    });

    expect(() =>
      deriveExecutionSessionSpawnHeadlessRecord({
        headlessExecute
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessRecord({
        headlessExecute
      })
    ).toThrow(
      "Execution session snapshot attemptId must match the supplied attempt lineage."
    );
  });
});

function createHeadlessExecute(): ExecutionSessionSpawnHeadlessExecute {
  return {
    headlessApply: {
      apply: {
        consume: {
          request: {
            parentAttemptId: "att_parent_record",
            parentRuntime: "codex-cli",
            parentSessionId: "thr_parent_record",
            sourceKind: "delegated",
            inheritedGuardrails: {
              maxChildren: 2,
              maxDepth: 3
            }
          },
          invoked: true
        },
        effects: {
          lineage: {
            attemptId: "att_child_record",
            parentAttemptId: "att_parent_record",
            sourceKind: "delegated",
            guardrails: {
              maxChildren: 2,
              maxDepth: 3
            }
          },
          requestedEvent: {
            attemptId: "att_parent_record",
            runtime: "codex-cli",
            sessionId: "thr_parent_record",
            lifecycleEventKind: "spawn_requested"
          },
          recordedEvent: {
            attemptId: "att_parent_record",
            runtime: "codex-cli",
            sessionId: "thr_parent_record",
            lifecycleEventKind: "spawn_recorded"
          }
        }
      },
      headlessInput: {
        prompt: "Reply with exactly: ok",
        timeoutMs: 5_000,
        attempt: {
          attemptId: "att_child_record",
          parentAttemptId: "att_parent_record",
          sourceKind: "delegated",
          guardrails: {
            maxChildren: 2,
            maxDepth: 3
          }
        }
      }
    },
    executionResult: createHeadlessExecutionResult({
      observation: {
        threadId: "thr_child_record",
        runCompleted: false,
        errorEventCount: 0,
        lastAgentMessage: "child running",
        turnStatus: "running"
      },
      controlPlane: {
        sessionSnapshot: {
          node: {
            attemptId: "att_child_record",
            nodeKind: "child",
            parentAttemptId: "att_parent_record",
            sourceKind: "delegated"
          },
          lifecycleState: "active",
          runCompleted: false,
          errorEventCount: 0,
          guardrails: {
            maxChildren: 2,
            maxDepth: 3
          },
          sessionRef: {
            runtime: "codex-cli",
            sessionId: "thr_child_record"
          },
          lastAgentMessage: "child running",
          turnStatus: "running"
        }
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
