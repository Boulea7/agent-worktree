import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionCloseTargetBatch,
  type ExecutionSessionCloseTarget
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state close-target-apply-batch helpers", () => {
  it("should fail closed when the supplied close target-apply batch input or callbacks are malformed", async () => {
    await expect(
      applyExecutionSessionCloseTargetBatch(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyExecutionSessionCloseTargetBatch(undefined as never)
    ).rejects.toThrow(
      "Execution session close target apply batch input must be an object."
    );

    await expect(
      applyExecutionSessionCloseTargetBatch({
        targets: [],
        invokeClose: undefined as never
      })
    ).rejects.toThrow(
      "Execution session close target apply batch requires invokeClose to be a function."
    );

    await expect(
      applyExecutionSessionCloseTargetBatch({
        targets: [],
        invokeClose: async () => undefined,
        resolveSessionLifecycleCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Execution session close target apply batch requires resolveSessionLifecycleCapability to be a function when provided."
    );
  });

  it("should reject non-array close targets before iterating", async () => {
    await expect(
      applyExecutionSessionCloseTargetBatch({
        targets: undefined as never,
        invokeClose: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session close target apply batch requires targets to be an array."
    );

    await expect(
      applyExecutionSessionCloseTargetBatch({
        targets: {} as never,
        invokeClose: async () => undefined
      })
    ).rejects.toThrow(
      "Execution session close target apply batch requires targets to be an array."
    );
  });

  it("should fail loudly when close target entries are sparse or non-object before invoking", async () => {
    let invokedCount = 0;
    const sparseTargets = new Array<ExecutionSessionCloseTarget>(1);

    await expect(
      applyExecutionSessionCloseTargetBatch({
        targets: sparseTargets,
        invokeClose: async () => {
          invokedCount += 1;
        }
      })
    ).rejects.toThrow(
      "Execution session close target apply batch requires targets entries to be objects."
    );

    await expect(
      applyExecutionSessionCloseTargetBatch({
        targets: [0] as never,
        invokeClose: async () => {
          invokedCount += 1;
        }
      })
    ).rejects.toThrow(
      "Execution session close target apply batch requires targets entries to be objects."
    );

    await expect(
      applyExecutionSessionCloseTargetBatch({
        targets: [createCloseTarget(), 0] as never,
        invokeClose: async () => {
          invokedCount += 1;
        }
      })
    ).rejects.toThrow(
      "Execution session close target apply batch requires targets entries to be objects."
    );

    expect(invokedCount).toBe(0);
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
            attemptId: "att_supported_1",
            runtime: "supported-cli",
            sessionId: "thr_supported_1"
          }),
          createCloseTarget({
            attemptId: "att_blocked_2",
            sessionId: "thr_blocked_2"
          }),
          createCloseTarget({
            attemptId: "att_supported_2",
            runtime: "supported-cli",
            sessionId: "thr_supported_2"
          })
        ],
        invokeClose: async ({ sessionId }) => {
          invokedSessionIds.push(sessionId);
        },
        resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
      })
    ).resolves.toEqual({
      results: [
        createBlockedCloseTargetApply({
          attemptId: "att_blocked",
          sessionId: "thr_blocked"
        }),
        createSupportedCloseTargetApply({
          attemptId: "att_supported_1",
          runtime: "supported-cli",
          sessionId: "thr_supported_1"
        }),
        createBlockedCloseTargetApply({
          attemptId: "att_blocked_2",
          sessionId: "thr_blocked_2"
        }),
        createSupportedCloseTargetApply({
          attemptId: "att_supported_2",
          runtime: "supported-cli",
          sessionId: "thr_supported_2"
        })
      ]
    });
    expect(invokedSessionIds).toEqual(["thr_supported_1", "thr_supported_2"]);
  });

  it("should fail fast on the first supported invoker error after earlier supported invocations", async () => {
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

function createBlockedCloseTargetApply({
  attemptId,
  runtime = "codex-cli",
  sessionId
}: {
  attemptId: string;
  runtime?: string;
  sessionId: string;
}) {
  return {
    request: {
      attemptId,
      runtime,
      sessionId
    },
    apply: {
      consumer: {
        request: {
          attemptId,
          runtime,
          sessionId
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
          attemptId,
          runtime,
          sessionId
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
  };
}

function createSupportedCloseTargetApply({
  attemptId,
  runtime = "codex-cli",
  sessionId
}: {
  attemptId: string;
  runtime?: string;
  sessionId: string;
}) {
  return {
    request: {
      attemptId,
      runtime,
      sessionId
    },
    apply: {
      consumer: {
        request: {
          attemptId,
          runtime,
          sessionId
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
          attemptId,
          runtime,
          sessionId
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
  };
}
