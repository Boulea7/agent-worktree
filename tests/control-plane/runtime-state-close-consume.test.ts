import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  consumeExecutionSessionClose,
  type ExecutionSessionCloseConsumer,
  type ExecutionSessionCloseRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state close-consume helpers", () => {
  it("should invoke close exactly once for a supported close consumer", async () => {
    const consumer = createCloseConsumer({
      request: createCloseRequest({
        attemptId: "  att_active  ",
        runtime: "  codex-cli  ",
        sessionId: "  thr_active  "
      }),
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
    expect(invokeClose).toHaveBeenCalledWith({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
    expect(seenRequest).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
    expect(seenRequest).not.toBe(consumer.request);
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

  it("should surface invoker failures without wrapping them into consume metadata", async () => {
    const expectedError = new Error("close failed");
    const consumer = createCloseConsumer({
      request: createCloseRequest({
        attemptId: "  att_active  ",
        runtime: "  codex-cli  ",
        sessionId: "  thr_active  "
      }),
      readiness: {
        blockingReasons: [],
        canConsumeClose: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });

    await expect(
      consumeExecutionSessionClose({
        consumer,
        invokeClose: async (request: ExecutionSessionCloseRequest) => {
          expect(request).toEqual({
            attemptId: "att_active",
            runtime: "codex-cli",
            sessionId: "thr_active"
          });
          throw expectedError;
        }
      })
    ).rejects.toThrow(expectedError);
  });

  it("should fail loudly when consumer.request does not satisfy the canonical close request contract", async () => {
    const consumer = createCloseConsumer({
      request: createCloseRequest({
        runtime: "   "
      }),
      readiness: {
        blockingReasons: [],
        canConsumeClose: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
    const invokeClose = vi.fn(async () => {});

    await expect(
      consumeExecutionSessionClose({
        consumer,
        invokeClose
      })
    ).rejects.toThrow(
      "Execution session close request runtime must be a non-empty string."
    );
    expect(invokeClose).not.toHaveBeenCalled();
  });

  it("should fail loudly when the top-level close-consume input is malformed", async () => {
    await expect(
      consumeExecutionSessionClose(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeExecutionSessionClose(undefined as never)
    ).rejects.toThrow(
      "Execution session close consume input must be an object."
    );
  });

  it("should fail loudly when invokeClose is not a function", async () => {
    await expect(
      consumeExecutionSessionClose({
        consumer: createCloseConsumer({
          readiness: {
            blockingReasons: [],
            canConsumeClose: true,
            hasBlockingReasons: false,
            sessionLifecycleSupported: true
          }
        }),
        invokeClose: "close" as never
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeExecutionSessionClose({
        consumer: createCloseConsumer({
          readiness: {
            blockingReasons: [],
            canConsumeClose: true,
            hasBlockingReasons: false,
            sessionLifecycleSupported: true
          }
        }),
        invokeClose: "close" as never
      })
    ).rejects.toThrow(
      "Execution session close consume requires invokeClose to be a function."
    );
  });

  it("should fail closed when nested readiness fields throw through accessor-shaped inputs", async () => {
    const consumer = createCloseConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeClose: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
    Object.defineProperty(consumer.readiness, "canConsumeClose", {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error("getter boom");
      }
    });

    await expect(
      consumeExecutionSessionClose({
        consumer,
        invokeClose: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeExecutionSessionClose({
        consumer,
        invokeClose: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session close consume requires consumer.readiness.canConsumeClose to be a boolean."
    );
  });

  it("should read consumer.readiness once before reusing the validated snapshot", async () => {
    let readinessReads = 0;
    const invokeClose = vi.fn(async () => undefined);
    const consumer = {
      request: createCloseRequest(),
      get readiness() {
        readinessReads += 1;

        if (readinessReads > 1) {
          throw new Error("readiness getter read twice");
        }

        return {
          blockingReasons: [],
          canConsumeClose: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        };
      }
    } as never;

    await expect(
      consumeExecutionSessionClose({
        consumer,
        invokeClose
      })
    ).resolves.toMatchObject({
      invoked: true,
      request: {
        sessionId: "thr_active"
      }
    });
    expect(readinessReads).toBe(1);
    expect(invokeClose).toHaveBeenCalledTimes(1);
  });

  it("should fail loudly with a validation error when consumer.request uses non-string identifiers", async () => {
    const consumer = createCloseConsumer({
      request: createCloseRequest({
        attemptId: 123 as never
      }),
      readiness: {
        blockingReasons: [],
        canConsumeClose: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
    const invokeClose = vi.fn(async () => {});

    await expect(
      consumeExecutionSessionClose({
        consumer,
        invokeClose
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeExecutionSessionClose({
        consumer,
        invokeClose
      })
    ).rejects.toThrow(
      "Execution session close request attemptId must be a non-empty string."
    );
    expect(invokeClose).not.toHaveBeenCalled();
  });

  it("should fail loudly when readiness.canConsumeClose is not a boolean", async () => {
    const consumer = createCloseConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeClose: "yes" as unknown as boolean,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
    const invokeClose = vi.fn(async () => {});

    await expect(
      consumeExecutionSessionClose({
        consumer,
        invokeClose
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeClose).not.toHaveBeenCalled();
  });

  it("should fail loudly when consumer is not an object", async () => {
    const invokeClose = vi.fn(async () => {});

    await expect(
      consumeExecutionSessionClose({
        consumer: null as unknown as ExecutionSessionCloseConsumer,
        invokeClose
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeExecutionSessionClose({
        consumer: null as unknown as ExecutionSessionCloseConsumer,
        invokeClose
      })
    ).rejects.toThrow(
      "Execution session close consume requires consumer to be an object."
    );
    expect(invokeClose).not.toHaveBeenCalled();
  });

  it("should fail loudly when consumer.readiness is not an object", async () => {
    const invokeClose = vi.fn(async () => {});

    await expect(
      consumeExecutionSessionClose({
        consumer: {
          ...createCloseConsumer(),
          readiness: null as unknown as ExecutionSessionCloseConsumer["readiness"]
        },
        invokeClose
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeExecutionSessionClose({
        consumer: {
          ...createCloseConsumer(),
          readiness: null as unknown as ExecutionSessionCloseConsumer["readiness"]
        },
        invokeClose
      })
    ).rejects.toThrow(
      "Execution session close consume requires consumer.readiness to be an object."
    );
    expect(invokeClose).not.toHaveBeenCalled();
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
