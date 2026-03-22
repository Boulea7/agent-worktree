import { describe, expect, it, vi } from "vitest";

import {
  consumeExecutionSessionWaitBatch,
  type ExecutionSessionWaitConsumer,
  type ExecutionSessionWaitRequest
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state wait-consume-batch helpers", () => {
  it("should return an empty batch result for an empty consumer list", async () => {
    await expect(
      consumeExecutionSessionWaitBatch({
        consumers: [],
        invokeWait: async () => {
          throw new Error("empty batches must not invoke wait");
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should preserve input order and continue past blocked consumers", async () => {
    const consumers = [
      createWaitConsumer({
        request: createWaitRequest({
          attemptId: "att_blocked_1",
          sessionId: "thr_blocked_1"
        })
      }),
      createWaitConsumer({
        request: createWaitRequest({
          attemptId: "att_supported_1",
          sessionId: "thr_supported_1"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeWait: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      }),
      createWaitConsumer({
        request: createWaitRequest({
          attemptId: "att_blocked_2",
          sessionId: "thr_blocked_2"
        })
      }),
      createWaitConsumer({
        request: createWaitRequest({
          attemptId: "att_supported_2",
          sessionId: "thr_supported_2"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeWait: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      })
    ] satisfies ExecutionSessionWaitConsumer[];
    const invokedSessionIds: string[] = [];

    await expect(
      consumeExecutionSessionWaitBatch({
        consumers,
        invokeWait: vi.fn(async (request: ExecutionSessionWaitRequest) => {
          invokedSessionIds.push(request.sessionId);
        })
      })
    ).resolves.toEqual({
      results: [
        {
          request: createWaitRequest({
            attemptId: "att_blocked_1",
            sessionId: "thr_blocked_1"
          }),
          readiness: createReadiness(),
          invoked: false
        },
        {
          request: createWaitRequest({
            attemptId: "att_supported_1",
            sessionId: "thr_supported_1"
          }),
          readiness: createReadiness({
            blockingReasons: [],
            canConsumeWait: true,
            hasBlockingReasons: false,
            sessionLifecycleSupported: true
          }),
          invoked: true
        },
        {
          request: createWaitRequest({
            attemptId: "att_blocked_2",
            sessionId: "thr_blocked_2"
          }),
          readiness: createReadiness(),
          invoked: false
        },
        {
          request: createWaitRequest({
            attemptId: "att_supported_2",
            sessionId: "thr_supported_2"
          }),
          readiness: createReadiness({
            blockingReasons: [],
            canConsumeWait: true,
            hasBlockingReasons: false,
            sessionLifecycleSupported: true
          }),
          invoked: true
        }
      ]
    });
    expect(invokedSessionIds).toEqual(["thr_supported_1", "thr_supported_2"]);
  });

  it("should keep the batch result shape minimal and leave inputs untouched", async () => {
    const consumers = [
      createWaitConsumer(),
      createWaitConsumer({
        request: createWaitRequest({
          attemptId: "att_supported",
          sessionId: "thr_supported",
          timeoutMs: 250
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeWait: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      })
    ] satisfies ExecutionSessionWaitConsumer[];
    const consumersSnapshot = JSON.parse(JSON.stringify(consumers));
    const batchResult = (await consumeExecutionSessionWaitBatch({
      consumers,
      invokeWait: async () => undefined
    })) as unknown as Record<string, unknown>;

    expect(batchResult).toEqual({
      results: [
        {
          request: createWaitRequest(),
          readiness: createReadiness(),
          invoked: false
        },
        {
          request: createWaitRequest({
            attemptId: "att_supported",
            sessionId: "thr_supported",
            timeoutMs: 250
          }),
          readiness: createReadiness({
            blockingReasons: [],
            canConsumeWait: true,
            hasBlockingReasons: false,
            sessionLifecycleSupported: true
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
    expect(batchResult).not.toHaveProperty("waitRequest");
    expect(batchResult).not.toHaveProperty("pollIntervalMs");
    expect(batchResult).not.toHaveProperty("deadlineMs");
    expect(batchResult).not.toHaveProperty("manifest");
    expect(batchResult).not.toHaveProperty("lifecycleState");
    expect(consumers).toEqual(consumersSnapshot);
  });

  it("should fail fast on the first supported invoker error and stop later items", async () => {
    const expectedError = new Error("wait failed");
    const consumers = [
      createWaitConsumer({
        request: createWaitRequest({
          attemptId: "att_supported_1",
          sessionId: "thr_supported_1"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeWait: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      }),
      createWaitConsumer({
        request: createWaitRequest({
          attemptId: "att_supported_2",
          sessionId: "thr_supported_2"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeWait: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      }),
      createWaitConsumer({
        request: createWaitRequest({
          attemptId: "att_supported_3",
          sessionId: "thr_supported_3"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeWait: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      })
    ] satisfies ExecutionSessionWaitConsumer[];
    const invokedSessionIds: string[] = [];

    await expect(
      consumeExecutionSessionWaitBatch({
        consumers,
        invokeWait: async (request: ExecutionSessionWaitRequest) => {
          invokedSessionIds.push(request.sessionId);

          if (request.sessionId === "thr_supported_2") {
            throw expectedError;
          }
        }
      })
    ).rejects.toThrow(expectedError);
    expect(invokedSessionIds).toEqual(["thr_supported_1", "thr_supported_2"]);
  });
});

function createReadiness(
  overrides: Partial<ExecutionSessionWaitConsumer["readiness"]> = {}
): ExecutionSessionWaitConsumer["readiness"] {
  return {
    blockingReasons: ["session_lifecycle_unsupported"],
    canConsumeWait: false,
    hasBlockingReasons: true,
    sessionLifecycleSupported: false,
    ...overrides
  };
}

function createWaitConsumer(
  overrides: Partial<ExecutionSessionWaitConsumer> = {}
): ExecutionSessionWaitConsumer {
  return {
    request: createWaitRequest(),
    readiness: createReadiness(),
    ...overrides
  };
}

function createWaitRequest(
  overrides: Partial<ExecutionSessionWaitRequest> = {}
): ExecutionSessionWaitRequest {
  return {
    attemptId: "att_active",
    runtime: "codex-cli",
    sessionId: "thr_active",
    ...overrides
  };
}
