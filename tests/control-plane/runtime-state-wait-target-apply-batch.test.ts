import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionWaitTargetBatch,
  type ExecutionSessionWaitTarget
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state wait-target-apply-batch helpers", () => {
  it("should fail closed when the supplied wait target-apply batch input or callbacks are malformed", async () => {
    await expect(
      applyExecutionSessionWaitTargetBatch(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionWaitTargetBatch(undefined as never)
    ).rejects.toThrow(
      "Execution session wait target apply batch input must be an object."
    );

    await expect(
      applyExecutionSessionWaitTargetBatch({
        targets: [],
        invokeWait: undefined as never
      })
    ).rejects.toThrow(
      "Execution session wait target apply batch requires invokeWait to be a function."
    );

    await expect(
      applyExecutionSessionWaitTargetBatch({
        targets: [],
        invokeWait: async () => undefined,
        resolveSessionLifecycleCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Execution session wait target apply batch requires resolveSessionLifecycleCapability to be a function when provided."
    );
  });

  it("should reject non-array wait targets before iterating", async () => {
    await expect(
      applyExecutionSessionWaitTargetBatch({
        targets: undefined as never,
        invokeWait: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session wait target apply batch requires targets to be an array."
    );

    await expect(
      applyExecutionSessionWaitTargetBatch({
        targets: {} as never,
        invokeWait: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session wait target apply batch requires targets to be an array."
    );
  });

  it("should reject inherited targets and accessor-shaped invokeWait callbacks", async () => {
    const inheritedInput = Object.create({
      targets: [createWaitTarget()]
    });
    inheritedInput.invokeWait = async () => undefined;

    await expect(
      applyExecutionSessionWaitTargetBatch(inheritedInput as never)
    ).rejects.toThrow(
      "Execution session wait target apply batch requires targets to be an array."
    );

    const accessorInput = {
      targets: [createWaitTarget()]
    };
    Object.defineProperty(accessorInput, "invokeWait", {
      enumerable: true,
      get() {
        throw new Error("boom");
      }
    });

    await expect(
      applyExecutionSessionWaitTargetBatch(accessorInput as never)
    ).rejects.toThrow(
      "Execution session wait target apply batch requires invokeWait to be a function."
    );
  });

  it("should fail loudly when wait target entries are sparse or non-object before invoking", async () => {
    let invokedCount = 0;
    const sparseTargets = new Array<ExecutionSessionWaitTarget>(1);

    await expect(
      applyExecutionSessionWaitTargetBatch({
        targets: sparseTargets,
        invokeWait: async () => {
          invokedCount += 1;
        }
      })
    ).rejects.toThrow(
      "Execution session wait target apply batch requires targets entries to be objects."
    );

    await expect(
      applyExecutionSessionWaitTargetBatch({
        targets: [0] as never,
        invokeWait: async () => {
          invokedCount += 1;
        }
      })
    ).rejects.toThrow(
      "Execution session wait target apply batch requires targets entries to be objects."
    );

    await expect(
      applyExecutionSessionWaitTargetBatch({
        targets: [createWaitTarget(), 0] as never,
        invokeWait: async () => {
          invokedCount += 1;
        }
      })
    ).rejects.toThrow(
      "Execution session wait target apply batch requires targets entries to be objects."
    );

    expect(invokedCount).toBe(0);
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
            attemptId: "att_supported_1",
            runtime: "supported-cli",
            sessionId: "thr_supported_1"
          }),
          createWaitTarget({
            attemptId: "att_blocked_2",
            sessionId: "thr_blocked_2"
          }),
          createWaitTarget({
            attemptId: "att_supported_2",
            runtime: "supported-cli",
            sessionId: "thr_supported_2"
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
        createBlockedWaitTargetApply({
          attemptId: "att_blocked",
          sessionId: "thr_blocked",
          timeoutMs: 250
        }),
        createSupportedWaitTargetApply({
          attemptId: "att_supported_1",
          runtime: "supported-cli",
          sessionId: "thr_supported_1",
          timeoutMs: 250
        }),
        createBlockedWaitTargetApply({
          attemptId: "att_blocked_2",
          sessionId: "thr_blocked_2",
          timeoutMs: 250
        }),
        createSupportedWaitTargetApply({
          attemptId: "att_supported_2",
          runtime: "supported-cli",
          sessionId: "thr_supported_2",
          timeoutMs: 250
        })
      ]
    });
    expect(invokedSessionIds).toEqual(["thr_supported_1", "thr_supported_2"]);
  });

  it("should fail fast on the first supported invoker error after earlier supported invocations", async () => {
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

function createBlockedWaitTargetApply({
  attemptId,
  runtime = "codex-cli",
  sessionId,
  timeoutMs
}: {
  attemptId: string;
  runtime?: string;
  sessionId: string;
  timeoutMs?: number;
}) {
  return {
    request: {
      attemptId,
      runtime,
      sessionId,
      ...(timeoutMs === undefined ? {} : { timeoutMs })
    },
    apply: {
      consumer: {
        request: {
          attemptId,
          runtime,
          sessionId,
          ...(timeoutMs === undefined ? {} : { timeoutMs })
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
          attemptId,
          runtime,
          sessionId,
          ...(timeoutMs === undefined ? {} : { timeoutMs })
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
  };
}

function createSupportedWaitTargetApply({
  attemptId,
  runtime = "codex-cli",
  sessionId,
  timeoutMs
}: {
  attemptId: string;
  runtime?: string;
  sessionId: string;
  timeoutMs?: number;
}) {
  return {
    request: {
      attemptId,
      runtime,
      sessionId,
      ...(timeoutMs === undefined ? {} : { timeoutMs })
    },
    apply: {
      consumer: {
        request: {
          attemptId,
          runtime,
          sessionId,
          ...(timeoutMs === undefined ? {} : { timeoutMs })
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
          attemptId,
          runtime,
          sessionId,
          ...(timeoutMs === undefined ? {} : { timeoutMs })
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
  };
}
