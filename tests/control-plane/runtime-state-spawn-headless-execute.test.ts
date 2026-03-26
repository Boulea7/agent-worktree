import { describe, expect, it, vi } from "vitest";

import {
  type HeadlessExecutionInput,
  type HeadlessExecutionResult
} from "../../src/adapters/types.js";
import {
  executeExecutionSessionSpawnHeadless,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-headless-execute helpers", () => {
  it("should compose headless apply first and then invoke headless execution", async () => {
    const request = createSpawnRequest({
      sourceKind: "delegated",
      inheritedGuardrails: {
        maxChildren: 2,
        maxDepth: 3
      }
    });
    const invokeSpawn = vi.fn(async () => undefined);
    let seenExecution: HeadlessExecutionInput | undefined;
    const executeHeadless = vi.fn(
      async (input: HeadlessExecutionInput) => {
        seenExecution = input;

        return createHeadlessExecutionResult({
          observation: {
            threadId: "thr_child_runtime",
            runCompleted: true,
            errorEventCount: 0,
            lastAgentMessage: "ok"
          }
        });
      }
    );

    await expect(
      executeExecutionSessionSpawnHeadless({
        childAttemptId: "att_child_headless_execute",
        request,
        execution: {
          prompt: "Reply with exactly: ok",
          cwd: "/tmp/headless-child",
          timeoutMs: 5_000
        },
        invokeSpawn,
        executeHeadless
      })
    ).resolves.toEqual({
      headlessApply: {
        apply: {
          consume: {
            request: {
              parentAttemptId: "att_parent",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_parent",
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
              attemptId: "att_child_headless_execute",
              parentAttemptId: "att_parent",
              sourceKind: "delegated",
              guardrails: {
                maxChildren: 2,
                maxDepth: 3
              }
            },
            requestedEvent: {
              attemptId: "att_parent",
              runtime: "codex-cli",
              sessionId: "thr_parent",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId: "att_parent",
              runtime: "codex-cli",
              sessionId: "thr_parent",
              lifecycleEventKind: "spawn_recorded"
            }
          }
        },
        headlessInput: {
          prompt: "Reply with exactly: ok",
          cwd: "/tmp/headless-child",
          timeoutMs: 5_000,
          attempt: {
            attemptId: "att_child_headless_execute",
            parentAttemptId: "att_parent",
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
          threadId: "thr_child_runtime",
          runCompleted: true,
          errorEventCount: 0,
          lastAgentMessage: "ok"
        }
      })
    });
    expect(invokeSpawn).toHaveBeenCalledTimes(1);
    expect(invokeSpawn).toHaveBeenCalledWith(request);
    expect(executeHeadless).toHaveBeenCalledTimes(1);
    expect(seenExecution).toEqual({
      prompt: "Reply with exactly: ok",
      cwd: "/tmp/headless-child",
      timeoutMs: 5_000,
      attempt: {
        attemptId: "att_child_headless_execute",
        parentAttemptId: "att_parent",
        sourceKind: "delegated",
        guardrails: {
          maxChildren: 2,
          maxDepth: 3
        }
      }
    });
  });

  it("should keep the execute result minimal and leave request plus execution untouched", async () => {
    const request = createSpawnRequest({
      parentAttemptId: "att_parent_execute",
      parentSessionId: "thr_parent_execute",
      sourceKind: "delegated",
      inheritedGuardrails: {
        maxChildren: 2,
        maxDepth: 3
      }
    });
    const execution = {
      prompt: "Bridge child runtime",
      timeoutMs: 7_500
    };
    const requestSnapshot = JSON.parse(JSON.stringify(request));
    const executionSnapshot = JSON.parse(JSON.stringify(execution));
    const result = (await executeExecutionSessionSpawnHeadless({
      childAttemptId: "att_child_execute",
      request,
      execution,
      invokeSpawn: async () => undefined,
      executeHeadless: async () =>
        createHeadlessExecutionResult({
        observation: {
          runCompleted: false,
          errorEventCount: 1,
          lastErrorMessage: "codex failed"
        }
        })
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      headlessApply: {
        apply: {
          consume: {
            request: {
              parentAttemptId: "att_parent_execute",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_parent_execute",
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
              attemptId: "att_child_execute",
              parentAttemptId: "att_parent_execute",
              sourceKind: "delegated",
              guardrails: {
                maxChildren: 2,
                maxDepth: 3
              }
            },
            requestedEvent: {
              attemptId: "att_parent_execute",
              runtime: "codex-cli",
              sessionId: "thr_parent_execute",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId: "att_parent_execute",
              runtime: "codex-cli",
              sessionId: "thr_parent_execute",
              lifecycleEventKind: "spawn_recorded"
            }
          }
        },
        headlessInput: {
          prompt: "Bridge child runtime",
          timeoutMs: 7_500,
          attempt: {
            attemptId: "att_child_execute",
            parentAttemptId: "att_parent_execute",
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
          runCompleted: false,
          errorEventCount: 1,
          lastErrorMessage: "codex failed"
        }
      })
    });
    expect(result).not.toHaveProperty("apply");
    expect(result).not.toHaveProperty("headlessInput");
    expect(result).not.toHaveProperty("execution");
    expect(result).not.toHaveProperty("result");
    expect(result).not.toHaveProperty("request");
    expect(result).not.toHaveProperty("stdout");
    expect(result).not.toHaveProperty("stderr");
    expect(result).not.toHaveProperty("exitCode");
    expect(result).not.toHaveProperty("events");
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("record");
    expect(result).not.toHaveProperty("spawnHeadlessRecord");
    expect(result).not.toHaveProperty("spawnHeadlessRecordBatch");
    expect(request).toEqual(requestSnapshot);
    expect(execution).toEqual(executionSnapshot);
  });

  it("should preserve control-plane execution metadata only inside executionResult", async () => {
    const result = (await executeExecutionSessionSpawnHeadless({
      childAttemptId: "att_child",
      request: createSpawnRequest({
        sourceKind: "fork"
      }),
      execution: {
        prompt: "Keep bridge metadata scoped"
      },
      invokeSpawn: async () => undefined,
      executeHeadless: async () =>
        createHeadlessExecutionResult({
        observation: {
          threadId: "thr_child_runtime",
          runCompleted: true,
          errorEventCount: 0
        },
        controlPlane: {
          sessionSnapshot: {
            node: {
              attemptId: "att_child",
              nodeKind: "child",
              sourceKind: "fork",
              parentAttemptId: "att_parent"
            },
            lifecycleState: "completed",
            runCompleted: true,
            errorEventCount: 0,
            sessionRef: {
              runtime: "codex-cli",
              sessionId: "thr_child_runtime"
            }
          }
        }
        })
    })) as unknown as Record<string, unknown>;

    expect(result).not.toHaveProperty("controlPlane");
    expect((result.executionResult as Record<string, unknown>).controlPlane).toEqual({
      sessionSnapshot: {
        node: {
          attemptId: "att_child",
          nodeKind: "child",
          sourceKind: "fork",
          parentAttemptId: "att_parent"
        },
        lifecycleState: "completed",
        runCompleted: true,
        errorEventCount: 0,
        sessionRef: {
          runtime: "codex-cli",
          sessionId: "thr_child_runtime"
        }
      }
    });
  });

  it("should surface invoker failures without invoking headless execution", async () => {
    const expectedError = new Error("spawn failed");
    const executeHeadless = vi.fn(async () =>
      createHeadlessExecutionResult({
        observation: {
          runCompleted: true,
          errorEventCount: 0
        }
      })
    );

    await expect(
      executeExecutionSessionSpawnHeadless({
        childAttemptId: "att_child_failed",
        request: createSpawnRequest({
          sourceKind: "fork"
        }),
        execution: {
          prompt: "Reply with ok"
        },
        invokeSpawn: async () => {
          throw expectedError;
        },
        executeHeadless
      })
    ).rejects.toThrow(expectedError);
    expect(executeHeadless).not.toHaveBeenCalled();
  });

  it("should surface headless executor failures without returning partial execution output", async () => {
    const expectedError = new Error("execute failed");

    await expect(
      executeExecutionSessionSpawnHeadless({
        childAttemptId: "att_child_execute_failed",
        request: createSpawnRequest({
          sourceKind: "fork"
        }),
        execution: {
          prompt: "Reply with ok"
        },
        invokeSpawn: async () => undefined,
        executeHeadless: async () => {
          throw expectedError;
        }
      })
    ).rejects.toThrow(expectedError);
  });
});

function createSpawnRequest(
  overrides: Partial<ExecutionSessionSpawnRequest> = {}
): ExecutionSessionSpawnRequest {
  return {
    parentAttemptId: "att_parent",
    parentRuntime: "codex-cli",
    parentSessionId: "thr_parent",
    sourceKind: "fork",
    ...overrides
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
