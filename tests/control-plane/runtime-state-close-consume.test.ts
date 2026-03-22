import { describe, expect, it, vi } from "vitest";

import {
  consumeExecutionSessionClose,
  type ExecutionSessionCloseConsumer
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state close-consume helpers", () => {
  it("should invoke close exactly once for a supported close consumer", async () => {
    const consumer = createCloseConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeClose: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
    let seenRequest: ExecutionSessionCloseConsumer["request"] | undefined;
    const invokeClose = vi.fn(async (request: ExecutionSessionCloseConsumer["request"]) => {
      seenRequest = request;
    });

    await expect(
      consumeExecutionSessionClose({
        consumer,
        invokeClose
      })
    ).resolves.toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      readiness: {
        blockingReasons: [],
        canConsumeClose: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      },
      invoked: true
    });
    expect(invokeClose).toHaveBeenCalledTimes(1);
    expect(invokeClose).toHaveBeenCalledWith(consumer.request);
    expect(seenRequest).toBe(consumer.request);
  });

  it("should not invoke close for a blocked close consumer", async () => {
    const consumer = createCloseConsumer();
    const invokeClose = vi.fn(async () => {});

    await expect(
      consumeExecutionSessionClose({
        consumer,
        invokeClose
      })
    ).resolves.toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      readiness: {
        blockingReasons: ["session_lifecycle_unsupported"],
        canConsumeClose: false,
        hasBlockingReasons: true,
        sessionLifecycleSupported: false
      },
      invoked: false
    });
    expect(invokeClose).not.toHaveBeenCalled();
  });

  it("should preserve the minimal consume result shape without adding lifecycle side effects", async () => {
    const consumer = createCloseConsumer();
    const result = (await consumeExecutionSessionClose({
      consumer,
      invokeClose: async () => {}
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      readiness: {
        blockingReasons: ["session_lifecycle_unsupported"],
        canConsumeClose: false,
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
    expect(result).not.toHaveProperty("closeRequest");
    expect(result).not.toHaveProperty("closeRequestedEvent");
    expect(result).not.toHaveProperty("closeRecordedEvent");
    expect(result).not.toHaveProperty("force");
    expect(result).not.toHaveProperty("cascade");
    expect(result).not.toHaveProperty("settlePolicy");
    expect(result).not.toHaveProperty("childPolicy");
    expect(result).not.toHaveProperty("closedAt");
    expect(result).not.toHaveProperty("outcome");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("adapterResult");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("pollIntervalMs");
    expect(result).not.toHaveProperty("deadlineMs");
  });

  it("should not mutate the supplied close consumer", async () => {
    const consumer = createCloseConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeClose: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
    const consumerSnapshot = JSON.parse(JSON.stringify(consumer));

    await expect(
      consumeExecutionSessionClose({
        consumer,
        invokeClose: async () => {}
      })
    ).resolves.toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      readiness: {
        blockingReasons: [],
        canConsumeClose: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      },
      invoked: true
    });
    expect(consumer).toEqual(consumerSnapshot);
  });
});

function createCloseConsumer(
  overrides: Partial<ExecutionSessionCloseConsumer> = {}
): ExecutionSessionCloseConsumer {
  return {
    request: {
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    },
    readiness: {
      blockingReasons: ["session_lifecycle_unsupported"],
      canConsumeClose: false,
      hasBlockingReasons: true,
      sessionLifecycleSupported: false
    },
    ...overrides
  };
}
