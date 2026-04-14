import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionClose,
  type ExecutionSessionCloseRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state close-apply helpers", () => {
  it("should compose a supported close consumer and consume result for a supported request", async () => {
    const request = createCloseRequest();
    const invokeClose = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionClose({
        request,
        invokeClose,
        resolveSessionLifecycleCapability: () => true
      })
    ).resolves.toEqual({
      consumer: {
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
        }
      },
      consume: {
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
      }
    });
    expect(invokeClose).toHaveBeenCalledTimes(1);
  });

  it("should compose a blocked close consumer and blocked consume result for an unsupported request", async () => {
    const invokeClose = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionClose({
        request: createCloseRequest(),
        invokeClose
      })
    ).resolves.toEqual({
      consumer: {
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
        }
      },
      consume: {
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
      }
    });
    expect(invokeClose).not.toHaveBeenCalled();
  });

  it("should normalize the request before deriving readiness and consuming close", async () => {
    const resolveSessionLifecycleCapability = vi.fn(
      (runtime) => runtime === "codex-cli"
    );
    const invokeClose = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionClose({
        request: createCloseRequest({
          attemptId: "  att_active  ",
          runtime: "  codex-cli  ",
          sessionId: "  thr_active  "
        }),
        invokeClose,
        resolveSessionLifecycleCapability
      })
    ).resolves.toEqual({
      consumer: {
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
        }
      },
      consume: {
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
      }
    });
    expect(resolveSessionLifecycleCapability).toHaveBeenCalledWith("codex-cli");
    expect(invokeClose).toHaveBeenCalledWith({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
  });

  it("should surface invalid request failures directly without wrapping them", async () => {
    const request = {
      ...createCloseRequest(),
      attemptId: "   "
    } as ExecutionSessionCloseRequest;

    await expect(
      applyExecutionSessionClose({
        request,
        invokeClose: async () => undefined,
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionClose({
        request,
        invokeClose: async () => undefined,
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(
      "Execution session close request attemptId must be a non-empty string."
    );
  });

  it("should fail loudly when the apply input or callbacks are malformed", async () => {
    await expect(
      applyExecutionSessionClose(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionClose(undefined as never)
    ).rejects.toThrow(
      "Execution session close apply input must be an object."
    );

    await expect(
      applyExecutionSessionClose({
        request: createCloseRequest(),
        invokeClose: "close" as never
      })
    ).rejects.toThrow(
      "Execution session close apply requires invokeClose to be a function."
    );

    await expect(
      applyExecutionSessionClose({
        request: createCloseRequest(),
        invokeClose: async () => undefined,
        resolveSessionLifecycleCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Execution session close apply requires resolveSessionLifecycleCapability to be a function when provided."
    );
  });

  it("should snapshot invokeClose once before reusing it across the apply flow", async () => {
    let invokeCloseReads = 0;
    const seenSessionIds: string[] = [];

    await expect(
      applyExecutionSessionClose({
        request: createCloseRequest(),
        get invokeClose() {
          invokeCloseReads += 1;

          if (invokeCloseReads > 1) {
            throw new Error("invokeClose getter read twice");
          }

          return async ({ sessionId }: { sessionId: string }) => {
            seenSessionIds.push(sessionId);
          };
        },
        resolveSessionLifecycleCapability: () => true
      } as never)
    ).resolves.toMatchObject({
      consume: {
        invoked: true,
        request: {
          sessionId: "thr_active"
        }
      }
    });
    expect(invokeCloseReads).toBe(1);
    expect(seenSessionIds).toEqual(["thr_active"]);
  });

  it("should surface invoker failures directly without returning a partial apply result", async () => {
    const expectedError = new Error("close failed");

    await expect(
      applyExecutionSessionClose({
        request: createCloseRequest(),
        invokeClose: async () => {
          throw expectedError;
        },
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(expectedError);
  });

  it("should keep the apply result shape minimal without leaking runtime metadata", async () => {
    const request = Object.freeze(createCloseRequest());
    const snapshot = structuredClone(request);
    const result = (await applyExecutionSessionClose({
      request,
      invokeClose: async () => undefined,
      resolveSessionLifecycleCapability: () => true
    })) as unknown as Record<string, unknown>;

    expect(request).toEqual(snapshot);
    expect(result).toEqual({
      consumer: {
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
        }
      },
      consume: {
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
      }
    });
    expect(result).not.toHaveProperty("selector");
    expect(result).not.toHaveProperty("view");
    expect(result).not.toHaveProperty("context");
    expect(result).not.toHaveProperty("candidate");
    expect(result).not.toHaveProperty("target");
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("manifest");
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
