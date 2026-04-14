import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionSpawnBatch,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-apply-batch helpers", () => {
  it("should fail loudly when the top-level spawn-apply batch input is malformed", async () => {
    await expect(
      applyExecutionSessionSpawnBatch(null as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionSpawnBatch([] as never)
    ).rejects.toThrow(
      "Execution session spawn apply batch input must be an object."
    );
    await expect(
      applyExecutionSessionSpawnBatch({
        items: [],
        invokeSpawn: "nope"
      } as never)
    ).rejects.toThrow(
      "Execution session spawn apply batch requires invokeSpawn to be a function."
    );
  });

  it("should fail closed when items only exist on the prototype chain", async () => {
    const input = Object.create({
      items: [],
      invokeSpawn: async () => undefined
    });

    await expect(
      applyExecutionSessionSpawnBatch(input as never)
    ).rejects.toThrow(
      "Execution session spawn apply batch requires items to be an array."
    );
  });

  it("should return an empty batch result without invoking spawn", async () => {
    const invokeSpawn = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionSpawnBatch({
        items: [],
        invokeSpawn
      })
    ).resolves.toEqual({
      results: []
    });
    expect(invokeSpawn).not.toHaveBeenCalled();
  });

  it("should preserve input order while composing apply results", async () => {
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionSpawnBatch({
        items: [
          {
            childAttemptId: "att_child_1",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_1",
              parentSessionId: "thr_parent_1",
              sourceKind: "fork"
            })
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
            })
          }
        ],
        invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
          invokedSessionIds.push(request.parentSessionId);
        }
      })
    ).resolves.toEqual({
      results: [
        {
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
        {
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
        }
      ]
    });
    expect(invokedSessionIds).toEqual(["thr_parent_1", "thr_parent_2"]);
  });

  it("should fail fast on the first invoker error", async () => {
    const expectedError = new Error("spawn failed");
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionSpawnBatch({
        items: [
          {
            childAttemptId: "att_child_1",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_1",
              parentSessionId: "thr_parent_1"
            })
          },
          {
            childAttemptId: "att_child_2",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_2",
              parentSessionId: "thr_parent_2"
            })
          },
          {
            childAttemptId: "att_child_3",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_3",
              parentSessionId: "thr_parent_3"
            })
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

  it("should fail before invoking when a sparse or inherited batch entry is encountered", async () => {
    const invokeSpawn = vi.fn(async () => undefined);
    const items = new Array(1);
    Object.setPrototypeOf(
      items,
      Object.assign([], {
        0: {
          childAttemptId: "att_child_inherited",
          request: createSpawnRequest({
            parentAttemptId: "att_parent_inherited",
            parentSessionId: "thr_parent_inherited"
          })
        }
      })
    );

    await expect(
      applyExecutionSessionSpawnBatch({
        items: items as never,
        invokeSpawn
      })
    ).rejects.toThrow(
      "Execution session spawn apply batch requires items entries to be objects."
    );
    expect(invokeSpawn).not.toHaveBeenCalled();
  });

  it("should keep the batch result minimal and leave inputs untouched", async () => {
    const items = [
      {
        childAttemptId: "att_child_1",
        request: createSpawnRequest({
          parentAttemptId: "att_parent_1",
          parentSessionId: "thr_parent_1"
        })
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
        })
      }
    ];
    const itemsSnapshot = JSON.parse(JSON.stringify(items));
    const result = (await applyExecutionSessionSpawnBatch({
      items,
      invokeSpawn: async () => undefined
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      results: [
        {
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
        {
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
        }
      ]
    });
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("request");
    expect(result).not.toHaveProperty("spawnApply");
    expect(result).not.toHaveProperty("spawnEffects");
    expect(result).not.toHaveProperty("manifest");
    expect(items).toEqual(itemsSnapshot);
  });

  it("should stop later items before invokeSpawn when preflight effects fail", async () => {
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionSpawnBatch({
        items: [
          {
            childAttemptId: "att_child_1",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_1",
              parentSessionId: "thr_parent_1"
            })
          },
          {
            childAttemptId: "  ",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_2",
              parentSessionId: "thr_parent_2"
            })
          },
          {
            childAttemptId: "att_child_3",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_3",
              parentSessionId: "thr_parent_3"
            })
          }
        ],
        invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
          invokedSessionIds.push(request.parentSessionId);
        }
      })
    ).rejects.toThrow(/childAttemptId/i);
    expect(invokedSessionIds).toEqual(["thr_parent_1"]);
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
