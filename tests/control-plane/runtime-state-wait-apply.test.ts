import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionWait,
  type ExecutionSessionWaitRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state wait-apply helpers", () => {
  it("should compose a supported wait consumer and consume result for a supported request", async () => {
    const request = createWaitRequest({
      timeoutMs: 5_000
    });
    const invokeWait = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionWait({
        request,
        invokeWait,
        resolveSessionLifecycleCapability: () => true
      })
    ).resolves.toEqual({
      consumer: {
        request: {
          attemptId: "att_active",
          runtime: "codex-cli",
          sessionId: "thr_active",
          timeoutMs: 5_000
        },
        readiness: {
          blockingReasons: [],
          canConsumeWait: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        }
      },
      consume: {
        request: {
          attemptId: "att_active",
          runtime: "codex-cli",
          sessionId: "thr_active",
          timeoutMs: 5_000
        },
        readiness: {
          blockingReasons: [],
          canConsumeWait: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        },
        invoked: true
      }
    });
    expect(invokeWait).toHaveBeenCalledTimes(1);
  });

  it("should compose a blocked wait consumer and blocked consume result for an unsupported request", async () => {
    const invokeWait = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionWait({
        request: createWaitRequest(),
        invokeWait
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
          canConsumeWait: false,
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
          canConsumeWait: false,
          hasBlockingReasons: true,
          sessionLifecycleSupported: false
        },
        invoked: false
      }
    });
    expect(invokeWait).not.toHaveBeenCalled();
  });

  it("should call the capability resolver with the request runtime", async () => {
    const resolveSessionLifecycleCapability = vi.fn(() => true);

    await applyExecutionSessionWait({
      request: createWaitRequest({
        runtime: "gemini-cli"
      }),
      invokeWait: async () => undefined,
      resolveSessionLifecycleCapability
    });

    expect(resolveSessionLifecycleCapability).toHaveBeenCalledTimes(1);
    expect(resolveSessionLifecycleCapability).toHaveBeenCalledWith("gemini-cli");
  });

  it("should normalize the request before deriving readiness and consuming wait", async () => {
    const resolveSessionLifecycleCapability = vi.fn(
      (runtime) => runtime === "codex-cli"
    );
    const invokeWait = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionWait({
        request: createWaitRequest({
          attemptId: "  att_active  ",
          runtime: "  codex-cli  ",
          sessionId: "  thr_active  "
        }),
        invokeWait,
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
          canConsumeWait: true,
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
          canConsumeWait: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        },
        invoked: true
      }
    });
    expect(resolveSessionLifecycleCapability).toHaveBeenCalledWith("codex-cli");
    expect(invokeWait).toHaveBeenCalledWith({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
  });

  it("should surface invalid request failures directly without wrapping them", async () => {
    const request = {
      ...createWaitRequest(),
      attemptId: "   "
    } as ExecutionSessionWaitRequest;

    await expect(
      applyExecutionSessionWait({
        request,
        invokeWait: async () => undefined,
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionWait({
        request,
        invokeWait: async () => undefined,
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(
      "Execution session wait request attemptId must be a non-empty string."
    );
  });

  it("should fail loudly when the apply input or callbacks are malformed", async () => {
    await expect(
      applyExecutionSessionWait(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionWait(undefined as never)
    ).rejects.toThrow(
      "Execution session wait apply input must be an object."
    );

    await expect(
      applyExecutionSessionWait({
        request: createWaitRequest(),
        invokeWait: "wait" as never
      })
    ).rejects.toThrow(
      "Execution session wait apply requires invokeWait to be a function."
    );

    await expect(
      applyExecutionSessionWait({
        request: createWaitRequest(),
        invokeWait: async () => undefined,
        resolveSessionLifecycleCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Execution session wait apply requires resolveSessionLifecycleCapability to be a function when provided."
    );
  });

  it("should surface invoker failures directly without returning a partial apply result", async () => {
    const expectedError = new Error("wait failed");

    await expect(
      applyExecutionSessionWait({
        request: createWaitRequest(),
        invokeWait: async () => {
          throw expectedError;
        },
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(expectedError);
  });

  it("should keep the apply result shape minimal without leaking runtime metadata", async () => {
    const request = Object.freeze(
      createWaitRequest({
        timeoutMs: 250
      })
    );
    const snapshot = structuredClone(request);
    const result = (await applyExecutionSessionWait({
      request,
      invokeWait: async () => undefined,
      resolveSessionLifecycleCapability: () => true
    })) as unknown as Record<string, unknown>;

    expect(request).toEqual(snapshot);
    expect(result).toEqual({
      consumer: {
        request: {
          attemptId: "att_active",
          runtime: "codex-cli",
          sessionId: "thr_active",
          timeoutMs: 250
        },
        readiness: {
          blockingReasons: [],
          canConsumeWait: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        }
      },
      consume: {
        request: {
          attemptId: "att_active",
          runtime: "codex-cli",
          sessionId: "thr_active",
          timeoutMs: 250
        },
        readiness: {
          blockingReasons: [],
          canConsumeWait: true,
          hasBlockingReasons: false,
          sessionLifecycleSupported: true
        },
        invoked: true
      }
    });
    expect(result).not.toHaveProperty("request");
    expect(result).not.toHaveProperty("target");
    expect(result).not.toHaveProperty("selector");
    expect(result).not.toHaveProperty("view");
    expect(result).not.toHaveProperty("context");
    expect(result).not.toHaveProperty("candidate");
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("pollIntervalMs");
    expect(result).not.toHaveProperty("deadlineMs");
  });
});

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
