import { describe, expect, it, vi } from "vitest";

import {
  applyExecutionSessionSpawnBatch,
  applyExecutionSessionSpawnBatchItems,
  buildExecutionSessionView,
  deriveExecutionSessionSpawnBatchItems,
  deriveExecutionSessionSpawnBatchPlan,
  deriveExecutionSessionSpawnCandidate,
  type ExecutionSessionRecord,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-batch-items-apply helpers", () => {
  it("should preserve a blocked plan without invoking spawn or projecting apply results", async () => {
    const invokeSpawn = vi.fn(async () => undefined);
    const batchItems = deriveExecutionSessionSpawnBatchItems({
      plan: createPlan({
        requestedCount: 1,
        records: [
          createRecord({
            attemptId: "att_blocked_parent",
            sessionId: "thr_blocked_parent",
            sourceKind: "direct",
            lifecycleState: "failed"
          })
        ]
      }),
      childAttemptIds: ["att_child_blocked"],
      sourceKind: "fork"
    });
    const result = (await applyExecutionSessionSpawnBatchItems({
      batchItems,
      invokeSpawn
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      batchItems
    });
    expect(invokeSpawn).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("apply");
    expect(result).not.toHaveProperty("request");
    expect(result).not.toHaveProperty("requests");
    expect(result).not.toHaveProperty("queue");
    expect(result).not.toHaveProperty("scheduler");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("headlessInput");
  });

  it("should bridge derived batch items into the existing spawn apply batch helper", async () => {
    const batchItems = deriveExecutionSessionSpawnBatchItems({
      plan: createPlan({
        requestedCount: 2,
        records: [
          createRecord({
            attemptId: "att_parent",
            sessionId: "thr_parent",
            sourceKind: "direct",
            lifecycleState: "active"
          })
        ]
      }),
      childAttemptIds: ["att_child_1", "att_child_2"],
      sourceKind: "fork"
    });
    const invokedSessionIds: string[] = [];
    const invokeSpawn = async (request: ExecutionSessionSpawnRequest) => {
      invokedSessionIds.push(request.parentSessionId);
    };

    const manualApply = await applyExecutionSessionSpawnBatch({
      items: batchItems.items ?? [],
      invokeSpawn
    });
    invokedSessionIds.length = 0;

    await expect(
      applyExecutionSessionSpawnBatchItems({
        batchItems,
        invokeSpawn
      })
    ).resolves.toEqual({
      batchItems,
      apply: manualApply
    });
    expect(invokedSessionIds).toEqual(["thr_parent", "thr_parent"]);
  });

  it("should preserve input order and inherited guardrails across delegated batch apply", async () => {
    const invokedSessionIds: string[] = [];
    const batchItems = deriveExecutionSessionSpawnBatchItems({
      plan: createPlan({
        requestedCount: 2,
        records: [
          createRecord({
            attemptId: "att_guarded_parent",
            sessionId: "thr_guarded_parent",
            sourceKind: "direct",
            lifecycleState: "active",
            guardrails: {
              maxChildren: 4,
              maxDepth: 3
            }
          })
        ]
      }),
      childAttemptIds: ["att_child_a", "att_child_b"],
      sourceKind: "delegated"
    });

    await expect(
      applyExecutionSessionSpawnBatchItems({
        batchItems,
        invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
          invokedSessionIds.push(request.parentSessionId);
        }
      })
    ).resolves.toEqual({
      batchItems,
      apply: {
        results: [
          {
            consume: {
              request: {
                parentAttemptId: "att_guarded_parent",
                parentRuntime: "codex-cli",
                parentSessionId: "thr_guarded_parent",
                sourceKind: "delegated",
                inheritedGuardrails: {
                  maxChildren: 4,
                  maxDepth: 3
                }
              },
              invoked: true
            },
            effects: {
              lineage: {
                attemptId: "att_child_a",
                parentAttemptId: "att_guarded_parent",
                sourceKind: "delegated",
                guardrails: {
                  maxChildren: 4,
                  maxDepth: 3
                }
              },
              requestedEvent: {
                attemptId: "att_guarded_parent",
                runtime: "codex-cli",
                sessionId: "thr_guarded_parent",
                lifecycleEventKind: "spawn_requested"
              },
              recordedEvent: {
                attemptId: "att_guarded_parent",
                runtime: "codex-cli",
                sessionId: "thr_guarded_parent",
                lifecycleEventKind: "spawn_recorded"
              }
            }
          },
          {
            consume: {
              request: {
                parentAttemptId: "att_guarded_parent",
                parentRuntime: "codex-cli",
                parentSessionId: "thr_guarded_parent",
                sourceKind: "delegated",
                inheritedGuardrails: {
                  maxChildren: 4,
                  maxDepth: 3
                }
              },
              invoked: true
            },
            effects: {
              lineage: {
                attemptId: "att_child_b",
                parentAttemptId: "att_guarded_parent",
                sourceKind: "delegated",
                guardrails: {
                  maxChildren: 4,
                  maxDepth: 3
                }
              },
              requestedEvent: {
                attemptId: "att_guarded_parent",
                runtime: "codex-cli",
                sessionId: "thr_guarded_parent",
                lifecycleEventKind: "spawn_requested"
              },
              recordedEvent: {
                attemptId: "att_guarded_parent",
                runtime: "codex-cli",
                sessionId: "thr_guarded_parent",
                lifecycleEventKind: "spawn_recorded"
              }
            }
          }
        ]
      }
    });
    expect(invokedSessionIds).toEqual(["thr_guarded_parent", "thr_guarded_parent"]);
  });

  it("should fail fast on the first invoker error", async () => {
    const expectedError = new Error("spawn failed");
    const invokedSessionIds: string[] = [];
    const batchItems = deriveExecutionSessionSpawnBatchItems({
      plan: createPlan({
        requestedCount: 3,
        records: [
          createRecord({
            attemptId: "att_parent",
            sessionId: "thr_parent",
            sourceKind: "direct",
            lifecycleState: "active"
          })
        ]
      }),
      childAttemptIds: ["att_child_1", "att_child_2", "att_child_3"],
      sourceKind: "fork"
    });

    await expect(
      applyExecutionSessionSpawnBatchItems({
        batchItems,
        invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
          invokedSessionIds.push(request.parentSessionId);

          if (invokedSessionIds.length === 2) {
            throw expectedError;
          }
        }
      })
    ).rejects.toThrow(expectedError);
    expect(invokedSessionIds).toEqual(["thr_parent", "thr_parent"]);
  });

  it("should reject malformed projected items before invoking spawn", async () => {
    const invokeSpawn = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionSpawnBatchItems({
        batchItems: {
          plan: createPlan({
            requestedCount: 1,
            records: [
              createRecord({
                attemptId: "att_parent",
                sessionId: "thr_parent",
                sourceKind: "direct",
                lifecycleState: "active"
              })
            ]
          }),
          items: [
            {
              childAttemptId: "att_child_1",
              request: {
                parentAttemptId: "att_parent",
                parentRuntime: "codex-cli",
                parentSessionId: "   ",
                sourceKind: "fork"
              }
            }
          ]
        },
        invokeSpawn
      })
    ).rejects.toThrow(/sessionId/i);
    expect(invokeSpawn).not.toHaveBeenCalled();
  });

  it("should keep the result minimal and leave batchItems untouched", async () => {
    const batchItems = deriveExecutionSessionSpawnBatchItems({
      plan: createPlan({
        requestedCount: 2,
        records: [
          createRecord({
            attemptId: "att_parent",
            sessionId: "thr_parent",
            sourceKind: "direct",
            lifecycleState: "active"
          })
        ]
      }),
      childAttemptIds: ["att_child_1", "att_child_2"],
      sourceKind: "fork"
    });
    const batchItemsSnapshot = structuredClone(batchItems);
    const result = (await applyExecutionSessionSpawnBatchItems({
      batchItems,
      invokeSpawn: async () => undefined
    })) as unknown as Record<string, unknown>;

    expect(batchItems).toEqual(batchItemsSnapshot);
    expect(result).not.toHaveProperty("queue");
    expect(result).not.toHaveProperty("scheduler");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("execution");
    expect(result).not.toHaveProperty("headlessInput");
  });
});

function createPlan(input: {
  records: readonly ExecutionSessionRecord[];
  requestedCount: number;
}) {
  const candidate = deriveExecutionSessionSpawnCandidate({
    view: buildExecutionSessionView(input.records),
    selector: {
      attemptId: input.records[0]?.attemptId ?? "att_parent"
    }
  });

  if (!candidate) {
    throw new Error("expected spawn candidate");
  }

  return deriveExecutionSessionSpawnBatchPlan({
    candidate,
    requestedCount: input.requestedCount
  });
}

function createRecord(
  overrides: Partial<ExecutionSessionRecord> &
    Pick<ExecutionSessionRecord, "attemptId" | "sourceKind">
): ExecutionSessionRecord {
  const { attemptId, sourceKind, ...rest } = overrides;

  return {
    attemptId,
    runtime: "codex-cli",
    sourceKind,
    lifecycleState: "created",
    runCompleted: false,
    errorEventCount: 0,
    origin: "headless_result",
    ...rest
  };
}
