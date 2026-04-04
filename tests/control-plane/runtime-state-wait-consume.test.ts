import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  consumeExecutionSessionWait,
  type ExecutionSessionWaitConsumer,
  type ExecutionSessionWaitRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state wait-consume helpers", () => {
  it("should invoke wait exactly once for a supported wait consumer", async () => {
    const consumer = createWaitConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeWait: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
    let seenRequest: ExecutionSessionWaitConsumer["request"] | undefined;
    const invokeWait = vi.fn(async (request: ExecutionSessionWaitConsumer["request"]) => {
      seenRequest = request;
    });

    await expect(
      consumeExecutionSessionWait({
        consumer,
        invokeWait
      })
    ).resolves.toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      readiness: {
        blockingReasons: [],
        canConsumeWait: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      },
      invoked: true
    });
    expect(invokeWait).toHaveBeenCalledTimes(1);
    expect(invokeWait).toHaveBeenCalledWith(consumer.request);
    expect(seenRequest).toBe(consumer.request);
  });

  it("should not invoke wait for a blocked wait consumer", async () => {
    const consumer = createWaitConsumer();
    const invokeWait = vi.fn(async () => {});

    await expect(
      consumeExecutionSessionWait({
        consumer,
        invokeWait
      })
    ).resolves.toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      readiness: {
        blockingReasons: ["session_lifecycle_unsupported"],
        canConsumeWait: false,
        hasBlockingReasons: true,
        sessionLifecycleSupported: false
      },
      invoked: false
    });
    expect(invokeWait).not.toHaveBeenCalled();
  });

  it("should preserve the minimal consume result shape without adding wait side effects", async () => {
    const consumer = createWaitConsumer();
    const result = (await consumeExecutionSessionWait({
      consumer,
      invokeWait: async () => {}
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      readiness: {
        blockingReasons: ["session_lifecycle_unsupported"],
        canConsumeWait: false,
        hasBlockingReasons: true,
        sessionLifecycleSupported: false
      },
      invoked: false
    });
    expect(result).not.toHaveProperty("selector");
    expect(result).not.toHaveProperty("view");
    expect(result).not.toHaveProperty("context");
    expect(result).not.toHaveProperty("candidate");
    expect(result).not.toHaveProperty("target");
    expect(result).not.toHaveProperty("waitRequest");
    expect(result).not.toHaveProperty("pollIntervalMs");
    expect(result).not.toHaveProperty("deadlineMs");
    expect(result).not.toHaveProperty("lifecycleState");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("adapterResult");
  });

  it("should not mutate the supplied wait consumer", async () => {
    const consumer = createWaitConsumer({
      request: createWaitRequest({
        timeoutMs: 100
      }),
      readiness: {
        blockingReasons: [],
        canConsumeWait: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
    const consumerSnapshot = JSON.parse(JSON.stringify(consumer));

    await expect(
      consumeExecutionSessionWait({
        consumer,
        invokeWait: async () => {}
      })
    ).resolves.toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active",
        timeoutMs: 100
      },
      readiness: {
        blockingReasons: [],
        canConsumeWait: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      },
      invoked: true
    });
    expect(consumer).toEqual(consumerSnapshot);
  });

  it("should surface invoker failures without wrapping them into consume metadata", async () => {
    const expectedError = new Error("wait failed");
    const consumer = createWaitConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeWait: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });

    await expect(
      consumeExecutionSessionWait({
        consumer,
        invokeWait: async (request: ExecutionSessionWaitRequest) => {
          expect(request).toBe(consumer.request);
          throw expectedError;
        }
      })
    ).rejects.toThrow(expectedError);
  });

  it("should fail loudly when readiness.canConsumeWait is not a boolean", async () => {
    const consumer = createWaitConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeWait: "yes" as unknown as boolean,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
    const invokeWait = vi.fn(async () => {});

    await expect(
      consumeExecutionSessionWait({
        consumer,
        invokeWait
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeWait).not.toHaveBeenCalled();
  });
});

function createWaitConsumer(
  overrides: Partial<ExecutionSessionWaitConsumer> = {}
): ExecutionSessionWaitConsumer {
  return {
    request: {
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    },
    readiness: {
      blockingReasons: ["session_lifecycle_unsupported"],
      canConsumeWait: false,
      hasBlockingReasons: true,
      sessionLifecycleSupported: false
    },
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
