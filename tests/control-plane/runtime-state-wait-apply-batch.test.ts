import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionWaitBatch,
  type ExecutionSessionWaitRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state wait-apply-batch helpers", () => {
  it("should reject non-object batch inputs before reading requests", async () => {
    await expect(
      applyExecutionSessionWaitBatch(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionWaitBatch(undefined as never)
    ).rejects.toThrow(
      "Execution session wait apply batch input must be an object."
    );
    await expect(
      applyExecutionSessionWaitBatch(null as never)
    ).rejects.toThrow(
      "Execution session wait apply batch input must be an object."
    );
    await expect(
      applyExecutionSessionWaitBatch([] as never)
    ).rejects.toThrow(
      "Execution session wait apply batch input must be an object."
    );
  });

  it("should reject non-array request containers before iterating requests", async () => {
    await expect(
      applyExecutionSessionWaitBatch({
        requests: {} as never,
        invokeWait: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session wait apply batch requires requests to be an array."
    );
  });

  it("should fail loudly when request entries are sparse or non-object before invoking", async () => {
    const invokeWait = vi.fn(async () => undefined);
    const sparseRequests = new Array<ExecutionSessionWaitRequest>(1);

    await expect(
      applyExecutionSessionWaitBatch({
        requests: sparseRequests,
        invokeWait
      })
    ).rejects.toThrow(
      "Execution session wait apply batch requires requests entries to be objects."
    );

    await expect(
      applyExecutionSessionWaitBatch({
        requests: [0] as never,
        invokeWait
      })
    ).rejects.toThrow(
      "Execution session wait apply batch requires requests entries to be objects."
    );

    await expect(
      applyExecutionSessionWaitBatch({
        requests: [createWaitRequest(), 0] as never,
        invokeWait
      })
    ).rejects.toThrow(
      "Execution session wait apply batch requires requests entries to be objects."
    );

    expect(invokeWait).not.toHaveBeenCalled();
  });

  it("should return an empty batch result for an empty request list", async () => {
    await expect(
      applyExecutionSessionWaitBatch({
        requests: [],
        invokeWait: async () => {
          throw new Error("empty batches must not invoke wait");
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should preserve input order and continue past blocked requests", async () => {
    const requests = [
      createWaitRequest({
        attemptId: "att_blocked_1",
        sessionId: "thr_blocked_1"
      }),
      createWaitRequest({
        attemptId: "att_supported_1",
        runtime: "supported-cli",
        sessionId: "thr_supported_1"
      }),
      createWaitRequest({
        attemptId: "att_blocked_2",
        sessionId: "thr_blocked_2"
      }),
      createWaitRequest({
        attemptId: "att_supported_2",
        runtime: "supported-cli",
        sessionId: "thr_supported_2"
      })
    ] satisfies ExecutionSessionWaitRequest[];
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionWaitBatch({
        requests,
        invokeWait: vi.fn(async (request: ExecutionSessionWaitRequest) => {
          invokedSessionIds.push(request.sessionId);
        }),
        resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
      })
    ).resolves.toEqual({
      results: [
        {
          consumer: {
            request: createWaitRequest({
              attemptId: "att_blocked_1",
              sessionId: "thr_blocked_1"
            }),
            readiness: createReadiness()
          },
          consume: {
            request: createWaitRequest({
              attemptId: "att_blocked_1",
              sessionId: "thr_blocked_1"
            }),
            readiness: createReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createWaitRequest({
              attemptId: "att_supported_1",
              runtime: "supported-cli",
              sessionId: "thr_supported_1"
            }),
            readiness: createReadiness({
              blockingReasons: [],
              canConsumeWait: true,
              hasBlockingReasons: false,
              sessionLifecycleSupported: true
            })
          },
          consume: {
            request: createWaitRequest({
              attemptId: "att_supported_1",
              runtime: "supported-cli",
              sessionId: "thr_supported_1"
            }),
            readiness: createReadiness({
              blockingReasons: [],
              canConsumeWait: true,
              hasBlockingReasons: false,
              sessionLifecycleSupported: true
            }),
            invoked: true
          }
        },
        {
          consumer: {
            request: createWaitRequest({
              attemptId: "att_blocked_2",
              sessionId: "thr_blocked_2"
            }),
            readiness: createReadiness()
          },
          consume: {
            request: createWaitRequest({
              attemptId: "att_blocked_2",
              sessionId: "thr_blocked_2"
            }),
            readiness: createReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createWaitRequest({
              attemptId: "att_supported_2",
              runtime: "supported-cli",
              sessionId: "thr_supported_2"
            }),
            readiness: createReadiness({
              blockingReasons: [],
              canConsumeWait: true,
              hasBlockingReasons: false,
              sessionLifecycleSupported: true
            })
          },
          consume: {
            request: createWaitRequest({
              attemptId: "att_supported_2",
              runtime: "supported-cli",
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
        }
      ]
    });
    expect(invokedSessionIds).toEqual(["thr_supported_1", "thr_supported_2"]);
  });

  it("should keep the batch result shape minimal and leave the requests untouched", async () => {
    const requests = [
      createWaitRequest(),
      createWaitRequest({
        attemptId: "att_supported",
        runtime: "supported-cli",
        sessionId: "thr_supported",
        timeoutMs: 250
      })
    ] satisfies ExecutionSessionWaitRequest[];
    const snapshot = structuredClone(requests);
    const result = (await applyExecutionSessionWaitBatch({
      requests,
      invokeWait: async () => undefined,
      resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      results: [
        {
          consumer: {
            request: createWaitRequest(),
            readiness: createReadiness()
          },
          consume: {
            request: createWaitRequest(),
            readiness: createReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createWaitRequest({
              attemptId: "att_supported",
              runtime: "supported-cli",
              sessionId: "thr_supported",
              timeoutMs: 250
            }),
            readiness: createReadiness({
              blockingReasons: [],
              canConsumeWait: true,
              hasBlockingReasons: false,
              sessionLifecycleSupported: true
            })
          },
          consume: {
            request: createWaitRequest({
              attemptId: "att_supported",
              runtime: "supported-cli",
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
        }
      ]
    });
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(requests).toEqual(snapshot);
  });

  it("should normalize each request before deriving readiness in batch mode", async () => {
    const resolveSessionLifecycleCapability = vi.fn(
      (runtime) => runtime === "supported-cli"
    );

    await expect(
      applyExecutionSessionWaitBatch({
        requests: [
          createWaitRequest({
            attemptId: "  att_supported  ",
            runtime: "  supported-cli  ",
            sessionId: "  thr_supported  "
          })
        ],
        invokeWait: async () => undefined,
        resolveSessionLifecycleCapability
      })
    ).resolves.toEqual({
      results: [
        {
          consumer: {
            request: {
              attemptId: "att_supported",
              runtime: "supported-cli",
              sessionId: "thr_supported"
            },
            readiness: createReadiness({
              blockingReasons: [],
              canConsumeWait: true,
              hasBlockingReasons: false,
              sessionLifecycleSupported: true
            })
          },
          consume: {
            request: {
              attemptId: "att_supported",
              runtime: "supported-cli",
              sessionId: "thr_supported"
            },
            readiness: createReadiness({
              blockingReasons: [],
              canConsumeWait: true,
              hasBlockingReasons: false,
              sessionLifecycleSupported: true
            }),
            invoked: true
          }
        }
      ]
    });
    expect(resolveSessionLifecycleCapability).toHaveBeenCalledWith(
      "supported-cli"
    );
  });

  it("should fail fast on the first supported invoker error and stop later items", async () => {
    const expectedError = new Error("wait failed");
    const requests = [
      createWaitRequest({
        attemptId: "att_supported_1",
        runtime: "supported-cli",
        sessionId: "thr_supported_1"
      }),
      createWaitRequest({
        attemptId: "att_supported_2",
        runtime: "supported-cli",
        sessionId: "thr_supported_2"
      }),
      createWaitRequest({
        attemptId: "att_supported_3",
        runtime: "supported-cli",
        sessionId: "thr_supported_3"
      })
    ] satisfies ExecutionSessionWaitRequest[];
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionWaitBatch({
        requests,
        invokeWait: async (request: ExecutionSessionWaitRequest) => {
          invokedSessionIds.push(request.sessionId);

          if (request.sessionId === "thr_supported_2") {
            throw expectedError;
          }
        },
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(expectedError);
    expect(invokedSessionIds).toEqual(["thr_supported_1", "thr_supported_2"]);
  });

  it("should fail fast when the first request is malformed", async () => {
    const requests = [
      createWaitRequest({
        attemptId: "   "
      }),
      createWaitRequest({
        attemptId: "att_supported",
        runtime: "supported-cli",
        sessionId: "thr_supported"
      })
    ] satisfies ExecutionSessionWaitRequest[];
    const invokeWait = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionWaitBatch({
        requests,
        invokeWait,
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionWaitBatch({
        requests,
        invokeWait,
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(
      "Execution session wait request attemptId must be a non-empty string."
    );
    expect(invokeWait).not.toHaveBeenCalled();
  });
});

function createReadiness(
  overrides: {
    blockingReasons?: string[];
    canConsumeWait?: boolean;
    hasBlockingReasons?: boolean;
    sessionLifecycleSupported?: boolean;
  } = {}
) {
  return {
    blockingReasons: ["session_lifecycle_unsupported"],
    canConsumeWait: false,
    hasBlockingReasons: true,
    sessionLifecycleSupported: false,
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
