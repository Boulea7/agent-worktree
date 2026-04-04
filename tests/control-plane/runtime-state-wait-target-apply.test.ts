import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionWaitTarget,
  type ExecutionSessionWaitTarget
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state wait-target-apply helpers", () => {
  it("should compose a supported wait request and apply result from a supported target", async () => {
    await expect(
      applyExecutionSessionWaitTarget({
        target: createWaitTarget(),
        timeoutMs: 5_000,
        invokeWait: async () => undefined,
        resolveSessionLifecycleCapability: () => true
      })
    ).resolves.toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active",
        timeoutMs: 5_000
      },
      apply: {
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
      }
    });
  });

  it("should compose a blocked wait request and blocked apply result from an unsupported target", async () => {
    let invoked = false;

    await expect(
      applyExecutionSessionWaitTarget({
        target: createWaitTarget(),
        invokeWait: async () => {
          invoked = true;
        }
      })
    ).resolves.toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      apply: {
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
      }
    });
    expect(invoked).toBe(false);
  });

  it("should fail loudly when the supplied target is invalid", async () => {
    const target = {
      ...createWaitTarget(),
      sessionId: "   "
    } as ExecutionSessionWaitTarget;

    await expect(
      applyExecutionSessionWaitTarget({
        target,
        invokeWait: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionWaitTarget({
        target,
        invokeWait: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session wait request sessionId must be a non-empty string."
    );
  });

  it("should surface invoker failures directly without returning a partial target apply result", async () => {
    const expectedError = new Error("wait failed");

    await expect(
      applyExecutionSessionWaitTarget({
        target: createWaitTarget(),
        invokeWait: async () => {
          throw expectedError;
        },
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(expectedError);
  });

  it("should not mutate the supplied target and should keep the result shape minimal", async () => {
    const target = Object.freeze(createWaitTarget());
    const snapshot = structuredClone(target);
    const result = (await applyExecutionSessionWaitTarget({
      target,
      invokeWait: async () => undefined,
      resolveSessionLifecycleCapability: () => true
    })) as unknown as Record<string, unknown>;

    expect(target).toEqual(snapshot);
    expect(result).toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      apply: {
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
      }
    });
    expect(result).not.toHaveProperty("target");
    expect(result).not.toHaveProperty("selector");
    expect(result).not.toHaveProperty("view");
    expect(result).not.toHaveProperty("context");
    expect(result).not.toHaveProperty("candidate");
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("manifest");
  });
});

function createWaitTarget(
  overrides: Partial<ExecutionSessionWaitTarget> = {}
): ExecutionSessionWaitTarget {
  return {
    attemptId: "att_active",
    runtime: "codex-cli",
    sessionId: "thr_active",
    ...overrides
  };
}
