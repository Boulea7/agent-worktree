import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptHandoffFinalizationConsumer,
  AttemptHandoffFinalizationRequest
} from "../../src/selection/internal.js";
import { consumeAttemptHandoffFinalization } from "../../src/selection/internal.js";

describe("selection handoff-finalization-consume helpers", () => {
  it("should invoke handoff finalization exactly once for a supported consumer", async () => {
    const consumer = createFinalizationConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeHandoffFinalization: true,
        hasBlockingReasons: false,
        handoffFinalizationSupported: true
      }
    });
    let seenRequest: AttemptHandoffFinalizationRequest | undefined;
    const invokeHandoffFinalization = vi.fn(
      async (request: AttemptHandoffFinalizationRequest) => {
        seenRequest = request;
      }
    );

    await expect(
      consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization
      })
    ).resolves.toEqual({
      request: {
        taskId: "task_shared",
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "created",
        sourceKind: undefined
      },
      readiness: {
        blockingReasons: [],
        canConsumeHandoffFinalization: true,
        hasBlockingReasons: false,
        handoffFinalizationSupported: true
      },
      invoked: true
    });
    expect(invokeHandoffFinalization).toHaveBeenCalledTimes(1);
    expect(invokeHandoffFinalization).toHaveBeenCalledWith(consumer.request);
    expect(seenRequest).toBe(consumer.request);
  });

  it("should not invoke handoff finalization for a blocked consumer", async () => {
    const consumer = createFinalizationConsumer();
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization
      })
    ).resolves.toEqual({
      request: {
        taskId: "task_shared",
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "created",
        sourceKind: undefined
      },
      readiness: {
        blockingReasons: ["handoff_finalization_unsupported"],
        canConsumeHandoffFinalization: false,
        hasBlockingReasons: true,
        handoffFinalizationSupported: false
      },
      invoked: false
    });
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should surface invoker failures directly without wrapping them", async () => {
    const expectedError = new Error("handoff finalization failed");
    const consumer = createFinalizationConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeHandoffFinalization: true,
        hasBlockingReasons: false,
        handoffFinalizationSupported: true
      }
    });

    await expect(
      consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization: async (request) => {
          expect(request).toBe(consumer.request);
          throw expectedError;
        }
      })
    ).rejects.toBe(expectedError);
  });

  it("should fail before invoking handoff finalization when readiness blockingReasons is not an array", async () => {
    const consumer = createFinalizationConsumer({
      readiness: {
        blockingReasons: "not-an-array" as never,
        canConsumeHandoffFinalization: false,
        hasBlockingReasons: false,
        handoffFinalizationSupported: false
      }
    });
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should fail before invoking handoff finalization when readiness blockingReasons contains an unknown reason", async () => {
    const consumer = createFinalizationConsumer({
      readiness: {
        blockingReasons: ["unexpected_reason"] as never,
        canConsumeHandoffFinalization: false,
        hasBlockingReasons: true,
        handoffFinalizationSupported: false
      }
    });
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should fail before invoking handoff finalization when readiness blockingReasons contains sparse array holes", async () => {
    const consumer = createFinalizationConsumer({
      readiness: {
        blockingReasons: new Array<string>(1) as never,
        canConsumeHandoffFinalization: false,
        hasBlockingReasons: true,
        handoffFinalizationSupported: false
      }
    });
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should fail before invoking handoff finalization when readiness blockingReasons relies on inherited array indexes", async () => {
    const blockingReasons = new Array<string>(1);

    Object.setPrototypeOf(
      blockingReasons,
      Object.create(Array.prototype, {
        0: {
          value: "handoff_finalization_unsupported",
          configurable: true,
          enumerable: true,
          writable: true
        }
      })
    );

    const consumer = createFinalizationConsumer({
      readiness: {
        blockingReasons: blockingReasons as never,
        canConsumeHandoffFinalization: false,
        hasBlockingReasons: true,
        handoffFinalizationSupported: false
      }
    });
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should fail before invoking handoff finalization when canConsumeHandoffFinalization is true but blockingReasons is non-empty", async () => {
    const consumer = createFinalizationConsumer({
      readiness: {
        blockingReasons: ["handoff_finalization_unsupported"],
        canConsumeHandoffFinalization: true,
        hasBlockingReasons: true,
        handoffFinalizationSupported: true
      }
    });
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should fail before invoking handoff finalization when hasBlockingReasons is false but blockingReasons is non-empty", async () => {
    const consumer = createFinalizationConsumer({
      readiness: {
        blockingReasons: ["handoff_finalization_unsupported"],
        canConsumeHandoffFinalization: false,
        hasBlockingReasons: false,
        handoffFinalizationSupported: false
      }
    });
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should fail before invoking handoff finalization when handoffFinalizationSupported does not match canConsumeHandoffFinalization", async () => {
    const consumer = createFinalizationConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeHandoffFinalization: false,
        hasBlockingReasons: false,
        handoffFinalizationSupported: true
      }
    });
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should fail before invoking handoff finalization when readiness carries a non-boolean supported value", async () => {
    const consumer = createFinalizationConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeHandoffFinalization: true,
        hasBlockingReasons: false,
        handoffFinalizationSupported: "yes" as never
      }
    });
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should keep the consume result shape minimal without adding lifecycle or persistence fields", async () => {
    const result = (await consumeAttemptHandoffFinalization({
      consumer: createFinalizationConsumer(),
      invokeHandoffFinalization: async () => undefined
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      request: {
        taskId: "task_shared",
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "created",
        sourceKind: undefined
      },
      readiness: {
        blockingReasons: ["handoff_finalization_unsupported"],
        canConsumeHandoffFinalization: false,
        hasBlockingReasons: true,
        handoffFinalizationSupported: false
      },
      invoked: false
    });
    expect(result).not.toHaveProperty("outcome");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("recordedAt");
    expect(result).not.toHaveProperty("event");
    expect(result).not.toHaveProperty("runtimeState");
  });
});

function createFinalizationConsumer(
  overrides: Partial<AttemptHandoffFinalizationConsumer> = {}
): AttemptHandoffFinalizationConsumer {
  return {
    request: createFinalizationRequest(),
    readiness: {
      blockingReasons: ["handoff_finalization_unsupported"],
      canConsumeHandoffFinalization: false,
      hasBlockingReasons: true,
      handoffFinalizationSupported: false
    },
    ...overrides
  };
}

function createFinalizationRequest(
  overrides: Partial<AttemptHandoffFinalizationRequest> = {}
): AttemptHandoffFinalizationRequest {
  return {
    taskId: "task_shared",
    attemptId: "att_ready",
    runtime: "codex-cli",
    status: "created",
    sourceKind: undefined,
    ...overrides
  };
}
