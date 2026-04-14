import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionCloseBatch,
  type ExecutionSessionCloseRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state close-apply-batch helpers", () => {
  it("should reject non-object batch inputs before reading requests", async () => {
    await expect(
      applyExecutionSessionCloseBatch(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionCloseBatch(undefined as never)
    ).rejects.toThrow(
      "Execution session close apply batch input must be an object."
    );
    await expect(
      applyExecutionSessionCloseBatch(null as never)
    ).rejects.toThrow(
      "Execution session close apply batch input must be an object."
    );
    await expect(
      applyExecutionSessionCloseBatch([] as never)
    ).rejects.toThrow(
      "Execution session close apply batch input must be an object."
    );
  });

  it("should reject non-array request containers before iterating requests", async () => {
    await expect(
      applyExecutionSessionCloseBatch({
        requests: {} as never,
        invokeClose: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session close apply batch requires requests to be an array."
    );
  });

  it("should reject inherited request containers", async () => {
    const inheritedInput = Object.create({
      requests: [createCloseRequest()],
      invokeClose: async () => undefined
    });

    await expect(
      applyExecutionSessionCloseBatch(inheritedInput as never)
    ).rejects.toThrow(
      "Execution session close apply batch requires requests to be an array."
    );
  });

  it("should fail loudly when request entries are sparse or non-object before invoking", async () => {
    const invokeClose = vi.fn(async () => undefined);
    const sparseRequests = new Array<ExecutionSessionCloseRequest>(1);

    await expect(
      applyExecutionSessionCloseBatch({
        requests: sparseRequests,
        invokeClose
      })
    ).rejects.toThrow(
      "Execution session close apply batch requires requests entries to be objects."
    );

    await expect(
      applyExecutionSessionCloseBatch({
        requests: [0] as never,
        invokeClose
      })
    ).rejects.toThrow(
      "Execution session close apply batch requires requests entries to be objects."
    );

    await expect(
      applyExecutionSessionCloseBatch({
        requests: [createCloseRequest(), 0] as never,
        invokeClose
      })
    ).rejects.toThrow(
      "Execution session close apply batch requires requests entries to be objects."
    );

    expect(invokeClose).not.toHaveBeenCalled();
  });

  it("should return an empty batch result for an empty request list", async () => {
    await expect(
      applyExecutionSessionCloseBatch({
        requests: [],
        invokeClose: async () => {
          throw new Error("empty batches must not invoke close");
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should preserve input order and continue past blocked requests", async () => {
    const requests = [
      createCloseRequest({
        attemptId: "att_blocked_1",
        sessionId: "thr_blocked_1"
      }),
      createCloseRequest({
        attemptId: "att_supported_1",
        runtime: "supported-cli",
        sessionId: "thr_supported_1"
      }),
      createCloseRequest({
        attemptId: "att_blocked_2",
        sessionId: "thr_blocked_2"
      }),
      createCloseRequest({
        attemptId: "att_supported_2",
        runtime: "supported-cli",
        sessionId: "thr_supported_2"
      })
    ] satisfies ExecutionSessionCloseRequest[];
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionCloseBatch({
        requests,
        invokeClose: vi.fn(async (request: ExecutionSessionCloseRequest) => {
          invokedSessionIds.push(request.sessionId);
        }),
        resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
      })
    ).resolves.toEqual({
      results: [
        {
          consumer: {
            request: createCloseRequest({
              attemptId: "att_blocked_1",
              sessionId: "thr_blocked_1"
            }),
            readiness: createReadiness()
          },
          consume: {
            request: createCloseRequest({
              attemptId: "att_blocked_1",
              sessionId: "thr_blocked_1"
            }),
            readiness: createReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createCloseRequest({
              attemptId: "att_supported_1",
              runtime: "supported-cli",
              sessionId: "thr_supported_1"
            }),
            readiness: createReadiness({
              blockingReasons: [],
              canConsumeClose: true,
              hasBlockingReasons: false,
              sessionLifecycleSupported: true
            })
          },
          consume: {
            request: createCloseRequest({
              attemptId: "att_supported_1",
              runtime: "supported-cli",
              sessionId: "thr_supported_1"
            }),
            readiness: createReadiness({
              blockingReasons: [],
              canConsumeClose: true,
              hasBlockingReasons: false,
              sessionLifecycleSupported: true
            }),
            invoked: true
          }
        },
        {
          consumer: {
            request: createCloseRequest({
              attemptId: "att_blocked_2",
              sessionId: "thr_blocked_2"
            }),
            readiness: createReadiness()
          },
          consume: {
            request: createCloseRequest({
              attemptId: "att_blocked_2",
              sessionId: "thr_blocked_2"
            }),
            readiness: createReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createCloseRequest({
              attemptId: "att_supported_2",
              runtime: "supported-cli",
              sessionId: "thr_supported_2"
            }),
            readiness: createReadiness({
              blockingReasons: [],
              canConsumeClose: true,
              hasBlockingReasons: false,
              sessionLifecycleSupported: true
            })
          },
          consume: {
            request: createCloseRequest({
              attemptId: "att_supported_2",
              runtime: "supported-cli",
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
        }
      ]
    });
    expect(invokedSessionIds).toEqual(["thr_supported_1", "thr_supported_2"]);
  });

  it("should keep the batch result shape minimal and leave the requests untouched", async () => {
    const requests = [
      createCloseRequest(),
      createCloseRequest({
        attemptId: "att_supported",
        runtime: "supported-cli",
        sessionId: "thr_supported"
      })
    ] satisfies ExecutionSessionCloseRequest[];
    const snapshot = structuredClone(requests);
    const result = (await applyExecutionSessionCloseBatch({
      requests,
      invokeClose: async () => undefined,
      resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      results: [
        {
          consumer: {
            request: createCloseRequest(),
            readiness: createReadiness()
          },
          consume: {
            request: createCloseRequest(),
            readiness: createReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createCloseRequest({
              attemptId: "att_supported",
              runtime: "supported-cli",
              sessionId: "thr_supported"
            }),
            readiness: createReadiness({
              blockingReasons: [],
              canConsumeClose: true,
              hasBlockingReasons: false,
              sessionLifecycleSupported: true
            })
          },
          consume: {
            request: createCloseRequest({
              attemptId: "att_supported",
              runtime: "supported-cli",
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
        }
      ]
    });
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(requests).toEqual(snapshot);
  });

  it("should snapshot invokeClose and the optional resolver once for the whole batch", async () => {
    let invokeCloseReads = 0;
    let resolverReads = 0;

    await expect(
      applyExecutionSessionCloseBatch({
        requests: [createCloseRequest()],
        get invokeClose() {
          invokeCloseReads += 1;

          if (invokeCloseReads > 1) {
            throw new Error("invokeClose getter read twice");
          }

          return async () => undefined;
        },
        get resolveSessionLifecycleCapability() {
          resolverReads += 1;

          if (resolverReads > 1) {
            throw new Error("resolver getter read twice");
          }

          return () => true;
        }
      } as never)
    ).resolves.toEqual({
      results: [
        {
          consumer: {
            request: createCloseRequest(),
            readiness: createReadiness({
              blockingReasons: [],
              canConsumeClose: true,
              hasBlockingReasons: false,
              sessionLifecycleSupported: true
            })
          },
          consume: {
            request: createCloseRequest(),
            readiness: createReadiness({
              blockingReasons: [],
              canConsumeClose: true,
              hasBlockingReasons: false,
              sessionLifecycleSupported: true
            }),
            invoked: true
          }
        }
      ]
    });
    expect(invokeCloseReads).toBe(1);
    expect(resolverReads).toBe(1);
  });

  it("should fail fast on the first thrown invoker error from a supported request", async () => {
    const expectedError = new Error("close failed");
    const invokeClose = vi.fn(async (request: ExecutionSessionCloseRequest) => {
      if (request.sessionId === "thr_supported_2") {
        throw expectedError;
      }
    });

    await expect(
      applyExecutionSessionCloseBatch({
        requests: [
          createCloseRequest({
            attemptId: "att_blocked",
            sessionId: "thr_blocked"
          }),
          createCloseRequest({
            attemptId: "att_supported_1",
            runtime: "supported-cli",
            sessionId: "thr_supported_1"
          }),
          createCloseRequest({
            attemptId: "att_supported_2",
            runtime: "supported-cli",
            sessionId: "thr_supported_2"
          }),
          createCloseRequest({
            attemptId: "att_supported_3",
            runtime: "supported-cli",
            sessionId: "thr_supported_3"
          })
        ],
        invokeClose,
        resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
      })
    ).rejects.toThrow(expectedError);
    expect(invokeClose).toHaveBeenCalledTimes(2);
    expect(invokeClose).not.toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "thr_supported_3"
      })
    );
  });

  it("should surface invalid request failures directly without wrapping them", async () => {
    const makeInvalidBatchCall = () =>
      applyExecutionSessionCloseBatch({
        requests: [
          createCloseRequest(),
          {
            ...createCloseRequest({
              attemptId: "att_invalid"
            }),
            runtime: "   "
          } as ExecutionSessionCloseRequest
        ],
        invokeClose: async () => undefined,
        resolveSessionLifecycleCapability: () => true
      });

    await expect(makeInvalidBatchCall()).rejects.toThrow(ValidationError);
    await expect(makeInvalidBatchCall()).rejects.toThrow(
      "Execution session close request runtime must be a non-empty string."
    );
  });
});

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

function createReadiness(
  overrides: Partial<{
    blockingReasons: string[];
    canConsumeClose: boolean;
    hasBlockingReasons: boolean;
    sessionLifecycleSupported: boolean;
  }> = {}
) {
  return {
    blockingReasons: ["session_lifecycle_unsupported"],
    canConsumeClose: false,
    hasBlockingReasons: true,
    sessionLifecycleSupported: false,
    ...overrides
  };
}
