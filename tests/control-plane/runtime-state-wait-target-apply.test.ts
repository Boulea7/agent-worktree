import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionWaitTargetBatch,
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

  it("should reject non-object wait target-apply inputs before deriving a request", async () => {
    await expect(applyExecutionSessionWaitTarget(undefined as never)).rejects.toThrow(
      ValidationError
    );
    await expect(applyExecutionSessionWaitTarget(undefined as never)).rejects.toThrow(
      "Execution session wait target apply input must be an object."
    );
    await expect(applyExecutionSessionWaitTarget(null as never)).rejects.toThrow(
      "Execution session wait target apply input must be an object."
    );
    await expect(applyExecutionSessionWaitTarget([] as never)).rejects.toThrow(
      "Execution session wait target apply input must be an object."
    );
  });

  it("should reject missing or non-object wait targets before deriving a request", async () => {
    await expect(
      applyExecutionSessionWaitTarget({
        target: undefined as never,
        invokeWait: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session wait target apply requires target to be an object."
    );
    await expect(
      applyExecutionSessionWaitTarget({
        target: [] as never,
        invokeWait: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session wait target apply requires target to be an object."
    );
  });

  it("should reject inherited wait targets and fail closed on accessor-shaped target-apply inputs", async () => {
    const inheritedInput = Object.create({
      target: createWaitTarget(),
      invokeWait: async () => undefined
    });

    await expect(
      applyExecutionSessionWaitTarget(inheritedInput as never)
    ).rejects.toThrow(
      "Execution session wait target apply requires target to be an object."
    );

    await expect(
      applyExecutionSessionWaitTarget({
        get target() {
          throw new Error("getter boom");
        },
        invokeWait: async () => undefined
      } as never)
    ).rejects.toThrow(ValidationError);
  });

  it("should fail loudly when wait callbacks are not functions", async () => {
    await expect(
      applyExecutionSessionWaitTarget({
        target: createWaitTarget(),
        invokeWait: "wait" as never
      })
    ).rejects.toThrow(
      "Execution session wait target apply requires invokeWait to be a function."
    );

    await expect(
      applyExecutionSessionWaitTarget({
        target: createWaitTarget(),
        invokeWait: async () => undefined,
        resolveSessionLifecycleCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Execution session wait target apply requires resolveSessionLifecycleCapability to be a function when provided."
    );
  });

  it("should snapshot wait callbacks before deriving the request", async () => {
    let invokeWaitReads = 0;
    let resolverReads = 0;

    await expect(
      applyExecutionSessionWaitTarget({
        target: createWaitTarget(),
        get invokeWait() {
          invokeWaitReads += 1;

          if (invokeWaitReads > 1) {
            throw new Error("invokeWait getter read twice");
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
    ).resolves.toBeDefined();
    expect(invokeWaitReads).toBe(1);
    expect(resolverReads).toBe(1);
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

  it("should return an empty batch result for an empty target list", async () => {
    await expect(
      applyExecutionSessionWaitTargetBatch({
        targets: [],
        timeoutMs: 5_000,
        invokeWait: async () => {
          throw new Error("empty batches must not invoke wait");
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should reject malformed wait target batch inputs before iterating targets", async () => {
    await expect(
      applyExecutionSessionWaitTargetBatch(undefined as never)
    ).rejects.toThrow(
      "Execution session wait target apply batch input must be an object."
    );
    await expect(
      applyExecutionSessionWaitTargetBatch({
        targets: undefined as never,
        invokeWait: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session wait target apply batch requires targets to be an array."
    );
  });

  it("should preserve input order and keep blocked entries in wait target batch mode", async () => {
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionWaitTargetBatch({
        targets: [
          createWaitTarget({
            attemptId: "att_blocked",
            sessionId: "thr_blocked"
          }),
          createWaitTarget({
            attemptId: "att_supported",
            runtime: "supported-cli",
            sessionId: "thr_supported"
          })
        ],
        timeoutMs: 250,
        invokeWait: async ({ sessionId }) => {
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
            sessionId: "thr_blocked",
            timeoutMs: 250
          },
          apply: {
            consumer: {
              request: {
                attemptId: "att_blocked",
                runtime: "codex-cli",
                sessionId: "thr_blocked",
                timeoutMs: 250
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
                attemptId: "att_blocked",
                runtime: "codex-cli",
                sessionId: "thr_blocked",
                timeoutMs: 250
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
        },
        {
          request: {
            attemptId: "att_supported",
            runtime: "supported-cli",
            sessionId: "thr_supported",
            timeoutMs: 250
          },
          apply: {
            consumer: {
              request: {
                attemptId: "att_supported",
                runtime: "supported-cli",
                sessionId: "thr_supported",
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
                attemptId: "att_supported",
                runtime: "supported-cli",
                sessionId: "thr_supported",
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
          }
        }
      ]
    });
    expect(invokedSessionIds).toEqual(["thr_supported"]);
  });

  it("should fail fast when a target in the batch is invalid", async () => {
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionWaitTargetBatch({
        targets: [
          createWaitTarget({
            attemptId: "att_supported_1",
            runtime: "supported-cli",
            sessionId: "thr_supported_1"
          }),
          {
            ...createWaitTarget({
              attemptId: "att_invalid",
              runtime: "supported-cli"
            }),
            sessionId: "   "
          } as ExecutionSessionWaitTarget,
          createWaitTarget({
            attemptId: "att_supported_2",
            runtime: "supported-cli",
            sessionId: "thr_supported_2"
          })
        ],
        invokeWait: async ({ sessionId }) => {
          invokedSessionIds.push(sessionId);
        },
        resolveSessionLifecycleCapability: () => true
      })
    ).rejects.toThrow(/sessionId/i);
    expect(invokedSessionIds).toEqual(["thr_supported_1"]);
  });

  it("should fail fast on the first supported invoker error in batch mode", async () => {
    const expectedError = new Error("wait failed");
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionWaitTargetBatch({
        targets: [
          createWaitTarget({
            attemptId: "att_supported_1",
            runtime: "supported-cli",
            sessionId: "thr_supported_1"
          }),
          createWaitTarget({
            attemptId: "att_supported_2",
            runtime: "supported-cli",
            sessionId: "thr_supported_2"
          }),
          createWaitTarget({
            attemptId: "att_supported_3",
            runtime: "supported-cli",
            sessionId: "thr_supported_3"
          })
        ],
        invokeWait: async ({ sessionId }) => {
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
