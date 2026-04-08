import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  consumeExecutionSessionCloseBatch,
  type ExecutionSessionCloseConsumer,
  type ExecutionSessionCloseRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state close-consume-batch helpers", () => {
  it("should reject non-object batch inputs before reading consumers", async () => {
    await expect(
      consumeExecutionSessionCloseBatch(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeExecutionSessionCloseBatch(undefined as never)
    ).rejects.toThrow(
      "Execution session close consume batch input must be an object."
    );
    await expect(
      consumeExecutionSessionCloseBatch(null as never)
    ).rejects.toThrow(
      "Execution session close consume batch input must be an object."
    );
    await expect(
      consumeExecutionSessionCloseBatch([] as never)
    ).rejects.toThrow(
      "Execution session close consume batch input must be an object."
    );
  });

  it("should reject non-array consumer containers before iterating consumers", async () => {
    await expect(
      consumeExecutionSessionCloseBatch({
        consumers: {} as never,
        invokeClose: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session close consume batch requires consumers to be an array."
    );
  });

  it("should return an empty batch result for an empty consumer list", async () => {
    await expect(
      consumeExecutionSessionCloseBatch({
        consumers: [],
        invokeClose: async () => {
          throw new Error("empty batches must not invoke close");
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should preserve input order and continue past blocked consumers", async () => {
    const consumers = [
      createCloseConsumer({
        request: createCloseRequest({
          attemptId: "att_blocked_1",
          sessionId: "thr_blocked_1"
        })
      }),
      createCloseConsumer({
        request: createCloseRequest({
          attemptId: "att_supported_1",
          sessionId: "thr_supported_1"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeClose: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      }),
      createCloseConsumer({
        request: createCloseRequest({
          attemptId: "att_blocked_2",
          sessionId: "thr_blocked_2"
        })
      }),
      createCloseConsumer({
        request: createCloseRequest({
          attemptId: "att_supported_2",
          sessionId: "thr_supported_2"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeClose: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      })
    ] satisfies ExecutionSessionCloseConsumer[];
    const invokedSessionIds: string[] = [];

    await expect(
      consumeExecutionSessionCloseBatch({
        consumers,
        invokeClose: vi.fn(async (request: ExecutionSessionCloseRequest) => {
          invokedSessionIds.push(request.sessionId);
        })
      })
    ).resolves.toEqual({
      results: [
        {
          request: createCloseRequest({
            attemptId: "att_blocked_1",
            sessionId: "thr_blocked_1"
          }),
          readiness: createReadiness(),
          invoked: false
        },
        {
          request: createCloseRequest({
            attemptId: "att_supported_1",
            sessionId: "thr_supported_1"
          }),
          readiness: createReadiness({
            blockingReasons: [],
            canConsumeClose: true,
            hasBlockingReasons: false,
            sessionLifecycleSupported: true
          }),
          invoked: true
        },
        {
          request: createCloseRequest({
            attemptId: "att_blocked_2",
            sessionId: "thr_blocked_2"
          }),
          readiness: createReadiness(),
          invoked: false
        },
        {
          request: createCloseRequest({
            attemptId: "att_supported_2",
            sessionId: "thr_supported_2"
          }),
          readiness: createReadiness({
            blockingReasons: [],
            canConsumeClose: true,
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
      createCloseConsumer(),
      createCloseConsumer({
        request: createCloseRequest({
          attemptId: "att_supported",
          sessionId: "thr_supported"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeClose: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      })
    ] satisfies ExecutionSessionCloseConsumer[];
    const consumersSnapshot = JSON.parse(JSON.stringify(consumers));
    const batchResult = (await consumeExecutionSessionCloseBatch({
      consumers,
      invokeClose: async () => undefined
    })) as unknown as Record<string, unknown>;

    expect(batchResult).toEqual({
      results: [
        {
          request: createCloseRequest(),
          readiness: createReadiness(),
          invoked: false
        },
        {
          request: createCloseRequest({
            attemptId: "att_supported",
            sessionId: "thr_supported"
          }),
          readiness: createReadiness({
            blockingReasons: [],
            canConsumeClose: true,
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
    expect(batchResult).not.toHaveProperty("closeRequestedEvent");
    expect(batchResult).not.toHaveProperty("closeRecordedEvent");
    expect(batchResult).not.toHaveProperty("force");
    expect(batchResult).not.toHaveProperty("cascade");
    expect(batchResult).not.toHaveProperty("settlePolicy");
    expect(batchResult).not.toHaveProperty("childPolicy");
    expect(batchResult).not.toHaveProperty("manifest");
    expect(batchResult).not.toHaveProperty("pollIntervalMs");
    expect(batchResult).not.toHaveProperty("deadlineMs");
    expect(consumers).toEqual(consumersSnapshot);
  });

  it("should fail fast on the first supported invoker error and stop later items", async () => {
    const expectedError = new Error("close failed");
    const consumers = [
      createCloseConsumer({
        request: createCloseRequest({
          attemptId: "att_supported_1",
          sessionId: "thr_supported_1"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeClose: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      }),
      createCloseConsumer({
        request: createCloseRequest({
          attemptId: "att_supported_2",
          sessionId: "thr_supported_2"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeClose: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      }),
      createCloseConsumer({
        request: createCloseRequest({
          attemptId: "att_supported_3",
          sessionId: "thr_supported_3"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeClose: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      })
    ] satisfies ExecutionSessionCloseConsumer[];
    const invokedSessionIds: string[] = [];

    await expect(
      consumeExecutionSessionCloseBatch({
        consumers,
        invokeClose: async (request: ExecutionSessionCloseRequest) => {
          invokedSessionIds.push(request.sessionId);

          if (request.sessionId === "thr_supported_2") {
            throw expectedError;
          }
        }
      })
    ).rejects.toThrow(expectedError);
    expect(invokedSessionIds).toEqual(["thr_supported_1", "thr_supported_2"]);
  });

  it("should fail fast when the first consumer readiness is malformed", async () => {
    const consumers = [
      createCloseConsumer({
        request: createCloseRequest({
          attemptId: "att_malformed",
          sessionId: "thr_malformed"
        }),
        readiness: {
          blockingReasons: [],
          canConsumeClose: "yes" as unknown as boolean,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        }
      }),
      createCloseConsumer({
        request: createCloseRequest({
          attemptId: "att_supported",
          sessionId: "thr_supported"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeClose: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      })
    ] satisfies ExecutionSessionCloseConsumer[];
    const invokeClose = vi.fn(async () => {});

    await expect(
      consumeExecutionSessionCloseBatch({
        consumers,
        invokeClose
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeClose).not.toHaveBeenCalled();
  });

  it("should fail fast when the first consumer request is malformed", async () => {
    const consumers = [
      createCloseConsumer({
        request: createCloseRequest({
          runtime: "   ",
          sessionId: "thr_malformed"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeClose: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      }),
      createCloseConsumer({
        request: createCloseRequest({
          attemptId: "att_supported",
          sessionId: "thr_supported"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeClose: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      })
    ] satisfies ExecutionSessionCloseConsumer[];
    const invokeClose = vi.fn(async () => {});

    await expect(
      consumeExecutionSessionCloseBatch({
        consumers,
        invokeClose
      })
    ).rejects.toThrow(
      "Execution session close request runtime must be a non-empty string."
    );
    expect(invokeClose).not.toHaveBeenCalled();
  });

  it("should fail fast when the first consumer request uses non-string identifiers", async () => {
    const consumers = [
      createCloseConsumer({
        request: createCloseRequest({
          sessionId: {} as never
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeClose: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      }),
      createCloseConsumer({
        request: createCloseRequest({
          attemptId: "att_supported",
          sessionId: "thr_supported"
        }),
        readiness: createReadiness({
          blockingReasons: [],
          canConsumeClose: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        })
      })
    ] satisfies ExecutionSessionCloseConsumer[];
    const invokeClose = vi.fn(async () => {});

    await expect(
      consumeExecutionSessionCloseBatch({
        consumers,
        invokeClose
      })
    ).rejects.toThrow(
      "Execution session close request sessionId must be a non-empty string."
    );
    expect(invokeClose).not.toHaveBeenCalled();
  });
});

function createReadiness(
  overrides: Partial<ExecutionSessionCloseConsumer["readiness"]> = {}
): ExecutionSessionCloseConsumer["readiness"] {
  return {
    blockingReasons: ["session_lifecycle_unsupported"],
    canConsumeClose: false,
    hasBlockingReasons: true,
    sessionLifecycleSupported: false,
    ...overrides
  };
}

function createCloseRequest(
  overrides: Partial<ExecutionSessionCloseRequest> = {}
): ExecutionSessionCloseRequest {
  return {
    attemptId: "att_active",
    runtime: "codex-cli",
    sessionId: "thr_active",
    ...overrides
  };
}

function createCloseConsumer(
  overrides: Partial<ExecutionSessionCloseConsumer> = {}
): ExecutionSessionCloseConsumer {
  return {
    request: createCloseRequest(),
    readiness: createReadiness(),
    ...overrides
  };
}
