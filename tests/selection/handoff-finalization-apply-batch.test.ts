import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";
import type { AttemptHandoffFinalizationRequest } from "../../src/selection/internal.js";

const applyAttemptHandoffFinalizationBatch = (
  selection as Partial<{
    applyAttemptHandoffFinalizationBatch: (input: {
      requests: readonly AttemptHandoffFinalizationRequest[];
      invokeHandoffFinalization: (
        request: AttemptHandoffFinalizationRequest
      ) => void | Promise<void>;
      resolveHandoffFinalizationCapability?: (runtime: string) => boolean;
    }) => Promise<{
      results: Array<{
        consumer: {
          request: AttemptHandoffFinalizationRequest;
          readiness: {
            blockingReasons: string[];
            canConsumeHandoffFinalization: boolean;
            hasBlockingReasons: boolean;
            handoffFinalizationSupported: boolean;
          };
        };
        consume: {
          request: AttemptHandoffFinalizationRequest;
          readiness: {
            blockingReasons: string[];
            canConsumeHandoffFinalization: boolean;
            hasBlockingReasons: boolean;
            handoffFinalizationSupported: boolean;
          };
          invoked: boolean;
        };
      }>;
    }>;
  }>
).applyAttemptHandoffFinalizationBatch as (input: {
  requests: readonly AttemptHandoffFinalizationRequest[];
  invokeHandoffFinalization: (
    request: AttemptHandoffFinalizationRequest
  ) => void | Promise<void>;
  resolveHandoffFinalizationCapability?: (runtime: string) => boolean;
}) => Promise<{
  results: Array<{
    consumer: {
      request: AttemptHandoffFinalizationRequest;
      readiness: {
        blockingReasons: string[];
        canConsumeHandoffFinalization: boolean;
        hasBlockingReasons: boolean;
        handoffFinalizationSupported: boolean;
      };
    };
    consume: {
      request: AttemptHandoffFinalizationRequest;
      readiness: {
        blockingReasons: string[];
        canConsumeHandoffFinalization: boolean;
        hasBlockingReasons: boolean;
        handoffFinalizationSupported: boolean;
      };
      invoked: boolean;
    };
  }>;
}>;

describe("selection handoff-finalization-apply-batch helpers", () => {
  it("should return an empty batch result for an empty finalization request list", async () => {
    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests: [],
        invokeHandoffFinalization: async () => {
          throw new Error(
            "empty finalization apply batches must not invoke handoff finalization"
          );
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should preserve input order and continue past blocked requests", async () => {
    const requests = [
      createFinalizationRequest({
        attemptId: "att_blocked_1",
        runtime: "blocked-cli"
      }),
      createFinalizationRequest({
        attemptId: "att_supported_1"
      }),
      createFinalizationRequest({
        attemptId: "att_blocked_2",
        runtime: "blocked-cli"
      }),
      createFinalizationRequest({
        attemptId: "att_supported_2",
        runtime: "gemini-cli",
        sourceKind: "delegated"
      })
    ] satisfies AttemptHandoffFinalizationRequest[];
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests,
        invokeHandoffFinalization: async (
          request: AttemptHandoffFinalizationRequest
        ) => {
          invokedAttemptIds.push(request.attemptId);
        },
        resolveHandoffFinalizationCapability: (runtime: string) =>
          runtime !== "blocked-cli"
      })
    ).resolves.toEqual({
      results: [
        {
          consumer: {
            request: createFinalizationRequest({
              attemptId: "att_blocked_1",
              runtime: "blocked-cli"
            }),
            readiness: createBlockedReadiness()
          },
          consume: {
            request: createFinalizationRequest({
              attemptId: "att_blocked_1",
              runtime: "blocked-cli"
            }),
            readiness: createBlockedReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createFinalizationRequest({
              attemptId: "att_supported_1"
            }),
            readiness: createSupportedReadiness()
          },
          consume: {
            request: createFinalizationRequest({
              attemptId: "att_supported_1"
            }),
            readiness: createSupportedReadiness(),
            invoked: true
          }
        },
        {
          consumer: {
            request: createFinalizationRequest({
              attemptId: "att_blocked_2",
              runtime: "blocked-cli"
            }),
            readiness: createBlockedReadiness()
          },
          consume: {
            request: createFinalizationRequest({
              attemptId: "att_blocked_2",
              runtime: "blocked-cli"
            }),
            readiness: createBlockedReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createFinalizationRequest({
              attemptId: "att_supported_2",
              runtime: "gemini-cli",
              sourceKind: "delegated"
            }),
            readiness: createSupportedReadiness()
          },
          consume: {
            request: createFinalizationRequest({
              attemptId: "att_supported_2",
              runtime: "gemini-cli",
              sourceKind: "delegated"
            }),
            readiness: createSupportedReadiness(),
            invoked: true
          }
        }
      ]
    });
    expect(invokedAttemptIds).toEqual(["att_supported_1", "att_supported_2"]);
  });

  it("should not invoke handoff finalization for blocked batch entries", async () => {
    const requests = [
      createFinalizationRequest({
        attemptId: "att_blocked_1"
      }),
      createFinalizationRequest({
        attemptId: "att_blocked_2",
        runtime: "gemini-cli"
      })
    ] satisfies AttemptHandoffFinalizationRequest[];
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests,
        invokeHandoffFinalization: async (
          request: AttemptHandoffFinalizationRequest
        ) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).resolves.toEqual({
      results: [
        {
          consumer: {
            request: createFinalizationRequest({
              attemptId: "att_blocked_1"
            }),
            readiness: createBlockedReadiness()
          },
          consume: {
            request: createFinalizationRequest({
              attemptId: "att_blocked_1"
            }),
            readiness: createBlockedReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createFinalizationRequest({
              attemptId: "att_blocked_2",
              runtime: "gemini-cli"
            }),
            readiness: createBlockedReadiness()
          },
          consume: {
            request: createFinalizationRequest({
              attemptId: "att_blocked_2",
              runtime: "gemini-cli"
            }),
            readiness: createBlockedReadiness(),
            invoked: false
          }
        }
      ]
    });
    expect(invokedAttemptIds).toEqual([]);
  });

  it("should fail fast on the first supported invoker error and stop later supported requests", async () => {
    const expectedError = new Error("handoff finalization failed");
    const requests = [
      createFinalizationRequest({
        attemptId: "att_supported_1"
      }),
      createFinalizationRequest({
        attemptId: "att_supported_2",
        runtime: "gemini-cli"
      }),
      createFinalizationRequest({
        attemptId: "att_supported_3",
        sourceKind: "delegated"
      })
    ] satisfies AttemptHandoffFinalizationRequest[];
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests,
        invokeHandoffFinalization: async (
          request: AttemptHandoffFinalizationRequest
        ) => {
          invokedAttemptIds.push(request.attemptId);

          if (request.attemptId === "att_supported_2") {
            throw expectedError;
          }
        },
        resolveHandoffFinalizationCapability: () => true
      })
    ).rejects.toThrow(expectedError);
    expect(invokedAttemptIds).toEqual(["att_supported_1", "att_supported_2"]);
  });

  it("should fail loudly when a batch entry does not produce an apply result", async () => {
    const requests = [undefined] as unknown as readonly AttemptHandoffFinalizationRequest[];

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff finalization apply batch requires each request to produce an apply result."
    );
  });

  it("should not mutate the supplied requests", async () => {
    const requests = [
      createFinalizationRequest({
        attemptId: "att_blocked"
      }),
      createFinalizationRequest({
        attemptId: "att_supported",
        runtime: "gemini-cli",
        sourceKind: "delegated"
      })
    ] satisfies AttemptHandoffFinalizationRequest[];
    const snapshot = structuredClone(requests);

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests,
        invokeHandoffFinalization: async () => undefined,
        resolveHandoffFinalizationCapability: (runtime: string) =>
          runtime !== "codex-cli"
      })
    ).resolves.toEqual({
      results: [
        {
          consumer: {
            request: createFinalizationRequest({
              attemptId: "att_blocked"
            }),
            readiness: createBlockedReadiness()
          },
          consume: {
            request: createFinalizationRequest({
              attemptId: "att_blocked"
            }),
            readiness: createBlockedReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createFinalizationRequest({
              attemptId: "att_supported",
              runtime: "gemini-cli",
              sourceKind: "delegated"
            }),
            readiness: createSupportedReadiness()
          },
          consume: {
            request: createFinalizationRequest({
              attemptId: "att_supported",
              runtime: "gemini-cli",
              sourceKind: "delegated"
            }),
            readiness: createSupportedReadiness(),
            invoked: true
          }
        }
      ]
    });
    expect(requests).toEqual(snapshot);
  });

  it("should keep the batch result shape minimal without aggregate or queue metadata", async () => {
    const result = (await applyAttemptHandoffFinalizationBatch({
      requests: [
        {
          ...createFinalizationRequest(),
          finalizationBasis: "handoff_decision_summary",
          report: { resultCount: 1 },
          queue: { name: "default" },
          partialFailure: { enabled: false }
        } as AttemptHandoffFinalizationRequest
      ],
      invokeHandoffFinalization: async () => undefined,
      resolveHandoffFinalizationCapability: () => true
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      results: [
        {
          consumer: {
            request: createFinalizationRequest(),
            readiness: createSupportedReadiness()
          },
          consume: {
            request: createFinalizationRequest(),
            readiness: createSupportedReadiness(),
            invoked: true
          }
        }
      ]
    });
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("aggregatePolicy");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("partialFailure");
    expect(result).not.toHaveProperty("queue");
    expect(result).not.toHaveProperty("manifest");
  });
});

function createBlockedReadiness() {
  return {
    blockingReasons: ["handoff_finalization_unsupported"],
    canConsumeHandoffFinalization: false,
    hasBlockingReasons: true,
    handoffFinalizationSupported: false
  } as const;
}

function createSupportedReadiness() {
  return {
    blockingReasons: [],
    canConsumeHandoffFinalization: true,
    hasBlockingReasons: false,
    handoffFinalizationSupported: true
  } as const;
}

function createFinalizationRequest(
  overrides: Partial<AttemptHandoffFinalizationRequest> = {}
): AttemptHandoffFinalizationRequest {
  return {
    taskId: "task_shared",
    attemptId: "att_ready",
    runtime: "codex-cli",
    status: "created",
    sourceKind: undefined,
    ...overrides
  };
}
