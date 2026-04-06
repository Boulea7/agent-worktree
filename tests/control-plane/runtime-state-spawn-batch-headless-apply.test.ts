import { describe, expect, it, vi } from "vitest";

import {
  applyExecutionSessionSpawnBatchHeadlessApply,
  applyExecutionSessionSpawnHeadlessInputBatch,
  buildExecutionSessionView,
  deriveExecutionSessionSpawnBatchPlan,
  deriveExecutionSessionSpawnCandidate,
  type ExecutionSessionSpawnBatchHeadlessApplyItems,
  type ExecutionSessionSpawnHeadlessInputSeed,
  type ExecutionSessionSpawnRequest,
  type ExecutionSessionRecord
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-batch-headless-apply helpers", () => {
  it("should preserve a blocked batch without invoking spawn or projecting apply results", async () => {
    const invokeSpawn = vi.fn(async () => undefined);
    const headlessApplyItems = {
      batchItems: {
        plan: createPlan({
          requestedCount: 1,
          canPlan: false
        })
      }
    } satisfies ExecutionSessionSpawnBatchHeadlessApplyItems;
    const result = (await applyExecutionSessionSpawnBatchHeadlessApply({
      headlessApplyItems,
      invokeSpawn
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      headlessApplyItems
    });
    expect(invokeSpawn).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("apply");
    expect(result).not.toHaveProperty("execute");
    expect(result).not.toHaveProperty("record");
    expect(result).not.toHaveProperty("view");
    expect(result).not.toHaveProperty("context");
    expect(result).not.toHaveProperty("queue");
    expect(result).not.toHaveProperty("scheduler");
    expect(result).not.toHaveProperty("manifest");
  });

  it("should bridge projected headless apply items into the existing headless apply batch helper", async () => {
    const abortController = new AbortController();
    const headlessApplyItems = createHeadlessApplyItems({
      items: [
        createHeadlessApplyItem({
          childAttemptId: "att_child_1",
          execution: {
            prompt: "child one",
            cwd: "/tmp/headless-one"
          }
        }),
        createHeadlessApplyItem({
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
            abortSignal: abortController.signal,
            timeoutMs: 2_000
          }
        })
      ]
    });
    const invokedSessionIds: string[] = [];

    const manualApply = await applyExecutionSessionSpawnHeadlessInputBatch({
      items: headlessApplyItems.items ?? [],
      invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
        invokedSessionIds.push(request.parentSessionId);
      }
    });
    invokedSessionIds.length = 0;

    await expect(
      applyExecutionSessionSpawnBatchHeadlessApply({
        headlessApplyItems,
        invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
          invokedSessionIds.push(request.parentSessionId);
        }
      })
    ).resolves.toEqual({
      headlessApplyItems,
      apply: manualApply
    });
    expect(invokedSessionIds).toEqual(["thr_parent", "thr_parent_2"]);
  });

  it("should reject malformed projected headless apply items before invoking spawn", async () => {
    const invokeSpawn = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionSpawnBatchHeadlessApply({
        headlessApplyItems: createHeadlessApplyItems({
          items: [
            createHeadlessApplyItem({
              request: createSpawnRequest({
                parentSessionId: "   "
              })
            })
          ]
        }),
        invokeSpawn
      })
    ).rejects.toThrow(/sessionId/i);
    expect(invokeSpawn).not.toHaveBeenCalled();
  });

  it("should fail fast on the first invoker error", async () => {
    const expectedError = new Error("spawn failed");
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionSpawnBatchHeadlessApply({
        headlessApplyItems: createHeadlessApplyItems({
          items: [
            createHeadlessApplyItem({
              childAttemptId: "att_child_1",
              request: createSpawnRequest({
                parentSessionId: "thr_parent_1"
              })
            }),
            createHeadlessApplyItem({
              childAttemptId: "att_child_2",
              request: createSpawnRequest({
                parentSessionId: "thr_parent_2"
              })
            }),
            createHeadlessApplyItem({
              childAttemptId: "att_child_3",
              request: createSpawnRequest({
                parentSessionId: "thr_parent_3"
              })
            })
          ]
        }),
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

  it("should keep the result minimal and leave headlessApplyItems untouched", async () => {
    const headlessApplyItems = createHeadlessApplyItems({
      items: [
        createHeadlessApplyItem({
          childAttemptId: "att_child_1",
          execution: {
            prompt: "child one",
            cwd: "/tmp/headless-one"
          }
        }),
        createHeadlessApplyItem({
          childAttemptId: "att_child_2",
          execution: {
            prompt: "child two",
            timeoutMs: 9_000
          }
        })
      ]
    });
    const snapshot = structuredClone(headlessApplyItems);
    const result = (await applyExecutionSessionSpawnBatchHeadlessApply({
      headlessApplyItems,
      invokeSpawn: async () => undefined
    })) as unknown as Record<string, unknown>;

    expect(headlessApplyItems).toEqual(snapshot);
    expect(result).not.toHaveProperty("execution");
    expect(result).not.toHaveProperty("headlessInput");
    expect(result).not.toHaveProperty("execute");
    expect(result).not.toHaveProperty("record");
    expect(result).not.toHaveProperty("view");
    expect(result).not.toHaveProperty("context");
    expect(result).not.toHaveProperty("queue");
    expect(result).not.toHaveProperty("scheduler");
    expect(result).not.toHaveProperty("manifest");
  });
});

function createPlan(input: { canPlan: boolean; requestedCount: number }) {
  const candidate = deriveExecutionSessionSpawnCandidate({
    view: buildExecutionSessionView([
      createRecord({
        attemptId: "att_parent",
        sessionId: "thr_parent",
        sourceKind: "direct",
        lifecycleState: input.canPlan ? "active" : "failed"
      })
    ]),
    selector: {
      attemptId: "att_parent"
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

function createHeadlessApplyItems(
  overrides: Partial<ExecutionSessionSpawnBatchHeadlessApplyItems> = {}
): ExecutionSessionSpawnBatchHeadlessApplyItems {
  return {
    batchItems: {
      plan: createPlan({
        requestedCount: overrides.items?.length ?? 1,
        canPlan: true
      }),
      ...(overrides.items === undefined ? {} : { items: [] })
    },
    ...overrides
  };
}

function createHeadlessApplyItem(input: {
  childAttemptId?: string;
  execution?: ExecutionSessionSpawnHeadlessInputSeed;
  request?: ExecutionSessionSpawnRequest;
}) {
  return {
    childAttemptId: input.childAttemptId ?? "att_child",
    request: input.request ?? createSpawnRequest(),
    execution: input.execution ?? { prompt: "child" }
  };
}

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
