import { describe, expect, it, vi } from "vitest";

import {
  applyExecutionSessionSpawnBatch,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state spawn-apply-batch helpers", () => {
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

  it("should stop later items when effects fail after consume succeeds", async () => {
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
