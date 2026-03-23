import { describe, expect, it, vi } from "vitest";

import {
  applyExecutionSessionSpawnHeadlessInputBatch,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state spawn-headless-apply-batch helpers", () => {
  it("should return an empty batch result without invoking spawn", async () => {
    const invokeSpawn = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionSpawnHeadlessInputBatch({
        items: [],
        invokeSpawn
      })
    ).resolves.toEqual({
      results: []
    });
    expect(invokeSpawn).not.toHaveBeenCalled();
  });

  it("should preserve input order while composing headless apply results", async () => {
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionSpawnHeadlessInputBatch({
        items: [
          {
            childAttemptId: "att_child_1",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_1",
              parentSessionId: "thr_parent_1",
              sourceKind: "fork"
            }),
            execution: {
              prompt: "child one",
              cwd: "/tmp/headless-one",
              timeoutMs: 1_000
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
        }
      })
    ).resolves.toEqual({
      results: [
        {
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
            cwd: "/tmp/headless-one",
            timeoutMs: 1_000,
            attempt: {
              attemptId: "att_child_1",
              parentAttemptId: "att_parent_1",
              sourceKind: "fork"
            }
          }
        },
        {
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
        }
      ]
    });
    expect(invokedSessionIds).toEqual(["thr_parent_1", "thr_parent_2"]);
  });

  it("should fail fast on the first invoker error", async () => {
    const expectedError = new Error("spawn failed");
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionSpawnHeadlessInputBatch({
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

          if (request.parentSessionId === "thr_parent_2") {
            throw expectedError;
          }
        }
      })
    ).rejects.toThrow(expectedError);
    expect(invokedSessionIds).toEqual(["thr_parent_1", "thr_parent_2"]);
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
          cwd: "/tmp/headless-one"
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
    const result = (await applyExecutionSessionSpawnHeadlessInputBatch({
      items,
      invokeSpawn: async () => undefined
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      results: [
        {
          apply: {
            consume: {
              request: createSpawnRequest({
                parentAttemptId: "att_parent_1",
                parentSessionId: "thr_parent_1"
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
            cwd: "/tmp/headless-one",
            attempt: {
              attemptId: "att_child_1",
              parentAttemptId: "att_parent_1",
              sourceKind: "fork"
            }
          }
        },
        {
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
            timeoutMs: 9_000,
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
        }
      ]
    });
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("apply");
    expect(result).not.toHaveProperty("headlessInput");
    expect(result).not.toHaveProperty("result");
    expect(result).not.toHaveProperty("controlPlane");
    expect(result).not.toHaveProperty("manifest");
    expect(items).toEqual(itemsSnapshot);
  });

  it("should stop later items when headless-input derivation fails after spawn apply succeeds", async () => {
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionSpawnHeadlessInputBatch({
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
            get execution() {
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
        }
      })
    ).rejects.toThrow("bridge failed");
    expect(invokedSessionIds).toEqual(["thr_parent_1", "thr_parent_2"]);
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
