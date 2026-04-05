import { describe, expect, it, vi } from "vitest";

import {
  type HeadlessExecutionInput,
  type HeadlessExecutionResult
} from "../../src/adapters/types.js";
import {
  executeExecutionSessionSpawnHeadlessBatch,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-headless-execute-batch helpers", () => {
  it("should return an empty batch result without invoking spawn or headless execution", async () => {
    const invokeSpawn = vi.fn(async () => undefined);
    const executeHeadless = vi.fn(async () =>
      createHeadlessExecutionResult({
        observation: {
          runCompleted: true,
          errorEventCount: 0
        }
      })
    );

    await expect(
      executeExecutionSessionSpawnHeadlessBatch({
        items: [],
        invokeSpawn,
        executeHeadless
      })
    ).resolves.toEqual({
      results: []
    });
    expect(invokeSpawn).not.toHaveBeenCalled();
    expect(executeHeadless).not.toHaveBeenCalled();
  });

  it("should preserve input order while composing headless execute results", async () => {
    const invokedSessionIds: string[] = [];
    const invokedAttemptIds: string[] = [];

    await expect(
      executeExecutionSessionSpawnHeadlessBatch({
        items: [
          {
            childAttemptId: "att_child_1",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_1",
              parentSessionId: "thr_parent_1",
              sourceKind: "fork"
            }),
            execution: {
              prompt: "child one"
            }
          },
          {
            childAttemptId: "att_child_2",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_2",
              parentSessionId: "thr_parent_2",
              sourceKind: "delegated",
              inheritedGuardrails: {
                maxChildren: 2,
                maxDepth: 3
              }
            }),
            execution: {
              prompt: "child two"
            }
          }
        ],
        invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
          invokedSessionIds.push(request.parentSessionId);
        },
        executeHeadless: async (input: HeadlessExecutionInput) => {
          const attemptId = input.attempt?.attemptId;

          if (attemptId === undefined) {
            throw new Error("missing attempt");
          }

          invokedAttemptIds.push(attemptId);

          return createHeadlessExecutionResult({
            observation: {
              threadId: `thr_${attemptId}`,
              runCompleted: true,
              errorEventCount: 0
            }
          });
        }
      })
    ).resolves.toEqual({
      results: [
        {
          headlessApply: {
            apply: {
              consume: {
                request: createSpawnRequest({
                  parentAttemptId: "att_parent_1",
                  parentSessionId: "thr_parent_1",
                  sourceKind: "fork"
                }),
                invoked: true
              },
              effects: {
                lineage: {
                  attemptId: "att_child_1",
                  parentAttemptId: "att_parent_1",
                  sourceKind: "fork"
                },
                requestedEvent: {
                  attemptId: "att_parent_1",
                  runtime: "codex-cli",
                  sessionId: "thr_parent_1",
                  lifecycleEventKind: "spawn_requested"
                },
                recordedEvent: {
                  attemptId: "att_parent_1",
                  runtime: "codex-cli",
                  sessionId: "thr_parent_1",
                  lifecycleEventKind: "spawn_recorded"
                }
              }
            },
            headlessInput: {
              prompt: "child one",
              attempt: {
                attemptId: "att_child_1",
                parentAttemptId: "att_parent_1",
                sourceKind: "fork"
              }
            }
          },
          executionResult: createHeadlessExecutionResult({
            observation: {
              threadId: "thr_att_child_1",
              runCompleted: true,
              errorEventCount: 0
            }
          })
        },
        {
          headlessApply: {
            apply: {
              consume: {
                request: createSpawnRequest({
                  parentAttemptId: "att_parent_2",
                  parentSessionId: "thr_parent_2",
                  sourceKind: "delegated",
                  inheritedGuardrails: {
                    maxChildren: 2,
                    maxDepth: 3
                  }
                }),
                invoked: true
              },
              effects: {
                lineage: {
                  attemptId: "att_child_2",
                  parentAttemptId: "att_parent_2",
                  sourceKind: "delegated",
                  guardrails: {
                    maxChildren: 2,
                    maxDepth: 3
                  }
                },
                requestedEvent: {
                  attemptId: "att_parent_2",
                  runtime: "codex-cli",
                  sessionId: "thr_parent_2",
                  lifecycleEventKind: "spawn_requested"
                },
                recordedEvent: {
                  attemptId: "att_parent_2",
                  runtime: "codex-cli",
                  sessionId: "thr_parent_2",
                  lifecycleEventKind: "spawn_recorded"
                }
              }
            },
            headlessInput: {
              prompt: "child two",
              attempt: {
                attemptId: "att_child_2",
                parentAttemptId: "att_parent_2",
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
              threadId: "thr_att_child_2",
              runCompleted: true,
              errorEventCount: 0
            }
          })
        }
      ]
    });
    expect(invokedSessionIds).toEqual(["thr_parent_1", "thr_parent_2"]);
    expect(invokedAttemptIds).toEqual(["att_child_1", "att_child_2"]);
  });

  it("should fail fast on the first invoker error", async () => {
    const expectedError = new Error("spawn failed");
    const invokedSessionIds: string[] = [];
    const executeHeadless = vi.fn(async () =>
      createHeadlessExecutionResult({
        observation: {
          runCompleted: true,
          errorEventCount: 0
        }
      })
    );

    await expect(
      executeExecutionSessionSpawnHeadlessBatch({
        items: [
          {
            childAttemptId: "att_child_1",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_1",
              parentSessionId: "thr_parent_1"
            }),
            execution: {
              prompt: "child one"
            }
          },
          {
            childAttemptId: "att_child_2",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_2",
              parentSessionId: "thr_parent_2"
            }),
            execution: {
              prompt: "child two"
            }
          }
        ],
        invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
          invokedSessionIds.push(request.parentSessionId);

          if (request.parentSessionId === "thr_parent_2") {
            throw expectedError;
          }
        },
        executeHeadless
      })
    ).rejects.toThrow(expectedError);
    expect(invokedSessionIds).toEqual(["thr_parent_1", "thr_parent_2"]);
    expect(executeHeadless).toHaveBeenCalledTimes(1);
  });

  it("should fail fast on the first headless execution error", async () => {
    const expectedError = new Error("execute failed");
    const invokedSessionIds: string[] = [];
    const invokedAttemptIds: string[] = [];

    await expect(
      executeExecutionSessionSpawnHeadlessBatch({
        items: [
          {
            childAttemptId: "att_child_1",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_1",
              parentSessionId: "thr_parent_1"
            }),
            execution: {
              prompt: "child one"
            }
          },
          {
            childAttemptId: "att_child_2",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_2",
              parentSessionId: "thr_parent_2"
            }),
            execution: {
              prompt: "child two"
            }
          },
          {
            childAttemptId: "att_child_3",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_3",
              parentSessionId: "thr_parent_3"
            }),
            execution: {
              prompt: "child three"
            }
          }
        ],
        invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
          invokedSessionIds.push(request.parentSessionId);
        },
        executeHeadless: async (input: HeadlessExecutionInput) => {
          const attemptId = input.attempt?.attemptId;

          if (attemptId === undefined) {
            throw new Error("missing attempt");
          }

          invokedAttemptIds.push(attemptId);

          if (attemptId === "att_child_2") {
            throw expectedError;
          }

          return createHeadlessExecutionResult({
            observation: {
              runCompleted: true,
              errorEventCount: 0
            }
          });
        }
      })
    ).rejects.toThrow(expectedError);
    expect(invokedSessionIds).toEqual(["thr_parent_1", "thr_parent_2"]);
    expect(invokedAttemptIds).toEqual(["att_child_1", "att_child_2"]);
  });

  it("should invoke spawn for the failing item before surfacing execution-seed bridge failures", async () => {
    const invokedSessionIds: string[] = [];
    const invokedAttemptIds: string[] = [];

    await expect(
      executeExecutionSessionSpawnHeadlessBatch({
        items: [
          {
            childAttemptId: "att_child_1",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_1",
              parentSessionId: "thr_parent_1"
            }),
            execution: {
              prompt: "child one"
            }
          },
          {
            childAttemptId: "att_child_2",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_2",
              parentSessionId: "thr_parent_2"
            }),
            get execution(): never {
              throw new Error("bridge failed");
            }
          },
          {
            childAttemptId: "att_child_3",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_3",
              parentSessionId: "thr_parent_3"
            }),
            execution: {
              prompt: "child three"
            }
          }
        ] as const,
        invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
          invokedSessionIds.push(request.parentSessionId);
        },
        executeHeadless: async (input: HeadlessExecutionInput) => {
          const attemptId = input.attempt?.attemptId;

          if (attemptId === undefined) {
            throw new Error("missing attempt");
          }

          invokedAttemptIds.push(attemptId);

          return createHeadlessExecutionResult({
            observation: {
              threadId: `thr_${attemptId}`,
              runCompleted: true,
              errorEventCount: 0
            }
          });
        }
      })
    ).rejects.toThrow("bridge failed");
    expect(invokedSessionIds).toEqual(["thr_parent_1", "thr_parent_2"]);
    expect(invokedAttemptIds).toEqual(["att_child_1"]);
  });

  it("should keep the batch result minimal and leave inputs untouched", async () => {
    const items = [
      {
        childAttemptId: "att_child_1",
        request: createSpawnRequest({
          parentAttemptId: "att_parent_1",
          parentSessionId: "thr_parent_1"
        }),
        execution: {
          prompt: "child one",
          cwd: "/tmp/child-one"
        }
      },
      {
        childAttemptId: "att_child_2",
        request: createSpawnRequest({
          parentAttemptId: "att_parent_2",
          parentSessionId: "thr_parent_2",
          sourceKind: "delegated",
          inheritedGuardrails: {
            maxChildren: 2,
            maxDepth: 3
          }
        }),
        execution: {
          prompt: "child two",
          timeoutMs: 9_000
        }
      }
    ];
    const itemsSnapshot = JSON.parse(JSON.stringify(items));
    const result = (await executeExecutionSessionSpawnHeadlessBatch({
      items,
      invokeSpawn: async () => undefined,
      executeHeadless: async () =>
        createHeadlessExecutionResult({
        observation: {
          runCompleted: true,
          errorEventCount: 0
        }
        })
    })) as unknown as Record<string, unknown>;

    expect(result).not.toHaveProperty("headlessApply");
    expect(result).not.toHaveProperty("executionResult");
    expect(result).not.toHaveProperty("execution");
    expect(result).not.toHaveProperty("result");
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("record");
    expect(result).not.toHaveProperty("records");
    expect(result).not.toHaveProperty("spawnHeadlessRecord");
    expect(result).not.toHaveProperty("spawnHeadlessRecordBatch");
    expect(result).not.toHaveProperty("stdout");
    expect(result).not.toHaveProperty("stderr");
    expect(result).not.toHaveProperty("exitCode");
    expect(result).not.toHaveProperty("events");
    expect(items).toEqual(itemsSnapshot);
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
