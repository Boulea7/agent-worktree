import { describe, expect, it, vi } from "vitest";

import {
  consumeExecutionSessionSpawnBatch,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state spawn-consume-batch helpers", () => {
  it("should return an empty batch result for an empty request list", async () => {
    await expect(
      consumeExecutionSessionSpawnBatch({
        requests: [],
        invokeSpawn: async () => {
          throw new Error("empty batches must not invoke spawn");
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should preserve input order and invoke each request exactly once", async () => {
    const requests = [
      createSpawnRequest({
        parentAttemptId: "att_parent_1",
        parentSessionId: "thr_parent_1",
        sourceKind: "fork"
      }),
      createSpawnRequest({
        parentAttemptId: "att_parent_2",
        parentSessionId: "thr_parent_2",
        sourceKind: "delegated",
        inheritedGuardrails: {
          maxChildren: 2,
          maxDepth: 3
        }
      }),
      createSpawnRequest({
        parentAttemptId: "att_parent_3",
        parentSessionId: "thr_parent_3",
        sourceKind: "fork"
      })
    ] satisfies ExecutionSessionSpawnRequest[];
    const invokedSessionIds: string[] = [];

    await expect(
      consumeExecutionSessionSpawnBatch({
        requests,
        invokeSpawn: vi.fn(async (request: ExecutionSessionSpawnRequest) => {
          invokedSessionIds.push(request.parentSessionId);
        })
      })
    ).resolves.toEqual({
      results: [
        {
          request: createSpawnRequest({
            parentAttemptId: "att_parent_1",
            parentSessionId: "thr_parent_1",
            sourceKind: "fork"
          }),
          invoked: true
        },
        {
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
        {
          request: createSpawnRequest({
            parentAttemptId: "att_parent_3",
            parentSessionId: "thr_parent_3",
            sourceKind: "fork"
          }),
          invoked: true
        }
      ]
    });
    expect(invokedSessionIds).toEqual([
      "thr_parent_1",
      "thr_parent_2",
      "thr_parent_3"
    ]);
  });

  it("should keep the batch result shape minimal and leave inputs untouched", async () => {
    const requests = [
      createSpawnRequest(),
      createSpawnRequest({
        parentAttemptId: "att_parent_guarded",
        parentSessionId: "thr_parent_guarded",
        sourceKind: "delegated",
        inheritedGuardrails: {
          maxChildren: 4,
          maxDepth: 5
        }
      })
    ] satisfies ExecutionSessionSpawnRequest[];
    const requestsSnapshot = JSON.parse(JSON.stringify(requests));
    const batchResult = (await consumeExecutionSessionSpawnBatch({
      requests,
      invokeSpawn: async () => undefined
    })) as unknown as Record<string, unknown>;

    expect(batchResult).toEqual({
      results: [
        {
          request: createSpawnRequest(),
          invoked: true
        },
        {
          request: createSpawnRequest({
            parentAttemptId: "att_parent_guarded",
            parentSessionId: "thr_parent_guarded",
            sourceKind: "delegated",
            inheritedGuardrails: {
              maxChildren: 4,
              maxDepth: 5
            }
          }),
          invoked: true
        }
      ]
    });
    expect(batchResult).not.toHaveProperty("summary");
    expect(batchResult).not.toHaveProperty("count");
    expect(batchResult).not.toHaveProperty("error");
    expect(batchResult).not.toHaveProperty("errors");
    expect(batchResult).not.toHaveProperty("adapterResult");
    expect(batchResult).not.toHaveProperty("spawnRequest");
    expect(batchResult).not.toHaveProperty("spawnTarget");
    expect(batchResult).not.toHaveProperty("spawnLineage");
    expect(batchResult).not.toHaveProperty("spawnRequestedEvent");
    expect(batchResult).not.toHaveProperty("spawnRecordedEvent");
    expect(batchResult).not.toHaveProperty("spawnEffects");
    expect(batchResult).not.toHaveProperty("spawnEffectsBatch");
    expect(batchResult).not.toHaveProperty("spawnApply");
    expect(batchResult).not.toHaveProperty("spawnApplyBatch");
    expect(batchResult).not.toHaveProperty("effects");
    expect(batchResult).not.toHaveProperty("apply");
    expect(batchResult).not.toHaveProperty("lifecycleState");
    expect(batchResult).not.toHaveProperty("lifecycleEventKind");
    expect(batchResult).not.toHaveProperty("outcome");
    expect(batchResult).not.toHaveProperty("manifest");
    expect(requests).toEqual(requestsSnapshot);
  });

  it("should fail fast on the first invoker error and stop later requests", async () => {
    const expectedError = new Error("spawn failed");
    const requests = [
      createSpawnRequest({
        parentAttemptId: "att_parent_1",
        parentSessionId: "thr_parent_1"
      }),
      createSpawnRequest({
        parentAttemptId: "att_parent_2",
        parentSessionId: "thr_parent_2",
        sourceKind: "delegated"
      }),
      createSpawnRequest({
        parentAttemptId: "att_parent_3",
        parentSessionId: "thr_parent_3"
      })
    ] satisfies ExecutionSessionSpawnRequest[];
    const invokedSessionIds: string[] = [];

    await expect(
      consumeExecutionSessionSpawnBatch({
        requests,
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
