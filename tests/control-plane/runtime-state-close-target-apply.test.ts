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

  it("should reject non-object close target-apply inputs before deriving a request", async () => {
    await expect(
      applyExecutionSessionCloseTarget(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionCloseTarget(undefined as never)
    ).rejects.toThrow(
      "Execution session close target apply input must be an object."
    );
    await expect(
      applyExecutionSessionCloseTarget(null as never)
    ).rejects.toThrow(
      "Execution session close target apply input must be an object."
    );
    await expect(
      applyExecutionSessionCloseTarget([] as never)
    ).rejects.toThrow(
      "Execution session close target apply input must be an object."
    );
  });

  it("should reject missing or non-object close targets before deriving a request", async () => {
    await expect(
      applyExecutionSessionCloseTarget({
        target: undefined as never,
        invokeClose: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session close target apply requires target to be an object."
    );
    await expect(
      applyExecutionSessionCloseTarget({
        target: [] as never,
        invokeClose: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session close target apply requires target to be an object."
    );
  });

  it("should reject inherited close targets and fail closed on accessor-shaped target-apply inputs", async () => {
    const inheritedInput = Object.create({
      target: createCloseTarget(),
      invokeClose: async () => undefined
    });

    await expect(
      applyExecutionSessionCloseTarget(inheritedInput as never)
    ).rejects.toThrow(
      "Execution session close target apply requires target to be an object."
    );

    await expect(
      applyExecutionSessionCloseTarget({
        get target() {
          throw new Error("getter boom");
        },
        invokeClose: async () => undefined
      } as never)
    ).rejects.toThrow(ValidationError);
  });

  it("should fail loudly when close callbacks are not functions", async () => {
    await expect(
      applyExecutionSessionCloseTarget({
        target: createCloseTarget(),
        invokeClose: "close" as never
      })
    ).rejects.toThrow(
      "Execution session close target apply requires invokeClose to be a function."
    );

    await expect(
      applyExecutionSessionCloseTarget({
        target: createCloseTarget(),
        invokeClose: async () => undefined,
        resolveSessionLifecycleCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Execution session close target apply requires resolveSessionLifecycleCapability to be a function when provided."
    );
  });

  it("should snapshot close callbacks before deriving the request", async () => {
    let invokeCloseReads = 0;
    let resolverReads = 0;

    await expect(
      applyExecutionSessionCloseTarget({
        target: createCloseTarget(),
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
    ).resolves.toBeDefined();
    expect(invokeCloseReads).toBe(1);
    expect(resolverReads).toBe(1);
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

  it("should reject malformed close target batch inputs before iterating targets", async () => {
    await expect(
      applyExecutionSessionCloseTargetBatch(undefined as never)
    ).rejects.toThrow(
      "Execution session close target apply batch input must be an object."
    );
    await expect(
      applyExecutionSessionCloseTargetBatch({
        targets: undefined as never,
        invokeClose: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session close target apply batch requires targets to be an array."
    );
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
