import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionCloseTargetBatch,
  applyExecutionSessionCloseTarget,
  type ExecutionSessionCloseTarget
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state close-target-apply helpers", () => {
  it("should compose a supported close request and apply result from a supported target", async () => {
    await expect(
      applyExecutionSessionCloseTarget({
        target: createCloseTarget(),
        invokeClose: async () => undefined,
        resolveSessionLifecycleCapability: () => true
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
      }
    });
  });

  it("should compose a blocked close request and blocked apply result from an unsupported target", async () => {
    let invoked = false;

    await expect(
      applyExecutionSessionCloseTarget({
        target: createCloseTarget(),
        invokeClose: async () => {
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
      }
    });
    expect(invoked).toBe(false);
  });

  it("should fail loudly when the supplied target is invalid", async () => {
    const target = {
      ...createCloseTarget(),
      sessionId: "   "
    } as ExecutionSessionCloseTarget;

    await expect(
      applyExecutionSessionCloseTarget({
        target,
        invokeClose: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionCloseTarget({
        target,
        invokeClose: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session close request sessionId must be a non-empty string."
    );
  });

  it("should surface invoker failures directly without returning a partial target-apply result", async () => {
    const expectedError = new Error("close failed");

    await expect(
      applyExecutionSessionCloseTarget({
        target: createCloseTarget(),
        invokeClose: async () => {
          throw expectedError;
        },
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(expectedError);
  });

  it("should not mutate the supplied target and should keep the result shape minimal", async () => {
    const target = Object.freeze(createCloseTarget());
    const snapshot = structuredClone(target);
    const result = (await applyExecutionSessionCloseTarget({
      target,
      invokeClose: async () => undefined,
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

  it("should return an empty batch result for an empty target list", async () => {
    await expect(
      applyExecutionSessionCloseTargetBatch({
        targets: [],
        invokeClose: async () => {
          throw new Error("empty batches must not invoke close");
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should preserve input order and keep blocked entries in close target batch mode", async () => {
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionCloseTargetBatch({
        targets: [
          createCloseTarget({
            attemptId: "att_blocked",
            sessionId: "thr_blocked"
          }),
          createCloseTarget({
            attemptId: "att_supported",
            runtime: "supported-cli",
            sessionId: "thr_supported"
          })
        ],
        invokeClose: async ({ sessionId }) => {
          invokedSessionIds.push(sessionId);
        },
        resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
      })
    ).resolves.toEqual({
      results: [
        {
          request: {
            attemptId: "att_blocked",
            runtime: "codex-cli",
            sessionId: "thr_blocked"
          },
          apply: {
            consumer: {
              request: {
                attemptId: "att_blocked",
                runtime: "codex-cli",
                sessionId: "thr_blocked"
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
                attemptId: "att_blocked",
                runtime: "codex-cli",
                sessionId: "thr_blocked"
              },
              readiness: {
                blockingReasons: ["session_lifecycle_unsupported"],
                canConsumeClose: false,
                hasBlockingReasons: true,
                sessionLifecycleSupported: false
              },
              invoked: false
            }
          }
        },
        {
          request: {
            attemptId: "att_supported",
            runtime: "supported-cli",
            sessionId: "thr_supported"
          },
          apply: {
            consumer: {
              request: {
                attemptId: "att_supported",
                runtime: "supported-cli",
                sessionId: "thr_supported"
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
                attemptId: "att_supported",
                runtime: "supported-cli",
                sessionId: "thr_supported"
              },
              readiness: {
                blockingReasons: [],
                canConsumeClose: true,
                hasBlockingReasons: false,
                sessionLifecycleSupported: true
              },
              invoked: true
            }
          }
        }
      ]
    });
    expect(invokedSessionIds).toEqual(["thr_supported"]);
  });

  it("should fail fast when a target in the batch is invalid", async () => {
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionCloseTargetBatch({
        targets: [
          createCloseTarget({
            attemptId: "att_supported_1",
            runtime: "supported-cli",
            sessionId: "thr_supported_1"
          }),
          {
            ...createCloseTarget({
              attemptId: "att_invalid",
              runtime: "supported-cli"
            }),
            sessionId: "   "
          } as ExecutionSessionCloseTarget,
          createCloseTarget({
            attemptId: "att_supported_2",
            runtime: "supported-cli",
            sessionId: "thr_supported_2"
          })
        ],
        invokeClose: async ({ sessionId }) => {
          invokedSessionIds.push(sessionId);
        },
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(/sessionId/i);
    expect(invokedSessionIds).toEqual(["thr_supported_1"]);
  });

  it("should fail fast on the first supported invoker error in batch mode", async () => {
    const expectedError = new Error("close failed");
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionCloseTargetBatch({
        targets: [
          createCloseTarget({
            attemptId: "att_supported_1",
            runtime: "supported-cli",
            sessionId: "thr_supported_1"
          }),
          createCloseTarget({
            attemptId: "att_supported_2",
            runtime: "supported-cli",
            sessionId: "thr_supported_2"
          }),
          createCloseTarget({
            attemptId: "att_supported_3",
            runtime: "supported-cli",
            sessionId: "thr_supported_3"
          })
        ],
        invokeClose: async ({ sessionId }) => {
          invokedSessionIds.push(sessionId);

          if (sessionId === "thr_supported_2") {
            throw expectedError;
          }
        },
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(expectedError);
    expect(invokedSessionIds).toEqual(["thr_supported_1", "thr_supported_2"]);
  });
});

function createCloseTarget(
  overrides: Partial<ExecutionSessionCloseTarget> = {}
): ExecutionSessionCloseTarget {
  return {
    attemptId: "att_active",
    runtime: "codex-cli",
    sessionId: "thr_active",
    ...overrides
  };
}
