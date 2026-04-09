import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyAttemptHandoffBatch,
  type AttemptHandoffRequest
} from "../../src/selection/internal.js";

describe("selection handoff-apply-batch helpers", () => {
  it("should return an empty batch result for an empty request list", async () => {
    await expect(
      applyAttemptHandoffBatch({
        requests: [],
        invokeHandoff: async () => {
          throw new Error("empty batches must not invoke handoff");
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should fail closed when the supplied apply-batch input, request list, or invoker is malformed", async () => {
    await expect(
      applyAttemptHandoffBatch(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffBatch(undefined as never)
    ).rejects.toThrow("Attempt handoff apply batch input must be an object.");

    await expect(
      applyAttemptHandoffBatch({
        requests: undefined as never,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff apply batch requires requests to be an array."
    );

    await expect(
      applyAttemptHandoffBatch({
        requests: [],
        invokeHandoff: undefined as never
      })
    ).rejects.toThrow(
      "Attempt handoff apply batch requires invokeHandoff to be a function."
    );

    await expect(
      applyAttemptHandoffBatch({
        requests: [],
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Attempt handoff apply batch requires resolveHandoffCapability to be a function when provided."
    );

    const sparseRequests = new Array<AttemptHandoffRequest>(1);

    await expect(
      applyAttemptHandoffBatch({
        requests: sparseRequests,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff apply batch requires requests entries to be objects."
    );
  });

  it("should preserve input order and continue past blocked requests", async () => {
    const requests = [
      createHandoffRequest({
        attemptId: "att_blocked_1",
        runtime: "blocked-cli"
      }),
      createHandoffRequest({
        attemptId: "att_supported_1"
      }),
      createHandoffRequest({
        attemptId: "att_blocked_2",
        runtime: "blocked-cli"
      }),
      createHandoffRequest({
        attemptId: "att_supported_2",
        runtime: "gemini-cli",
        sourceKind: "delegated"
      })
    ] satisfies AttemptHandoffRequest[];
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffBatch({
        requests,
        invokeHandoff: async (request: AttemptHandoffRequest) => {
          invokedAttemptIds.push(request.attemptId);
        },
        resolveHandoffCapability: (runtime: string) => runtime !== "blocked-cli"
      })
    ).resolves.toEqual({
      results: [
        {
          consumer: {
            request: createHandoffRequest({
              attemptId: "att_blocked_1",
              runtime: "blocked-cli"
            }),
            readiness: createBlockedReadiness()
          },
          consume: {
            request: createHandoffRequest({
              attemptId: "att_blocked_1",
              runtime: "blocked-cli"
            }),
            readiness: createBlockedReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createHandoffRequest({
              attemptId: "att_supported_1"
            }),
            readiness: createSupportedReadiness()
          },
          consume: {
            request: createHandoffRequest({
              attemptId: "att_supported_1"
            }),
            readiness: createSupportedReadiness(),
            invoked: true
          }
        },
        {
          consumer: {
            request: createHandoffRequest({
              attemptId: "att_blocked_2",
              runtime: "blocked-cli"
            }),
            readiness: createBlockedReadiness()
          },
          consume: {
            request: createHandoffRequest({
              attemptId: "att_blocked_2",
              runtime: "blocked-cli"
            }),
            readiness: createBlockedReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createHandoffRequest({
              attemptId: "att_supported_2",
              runtime: "gemini-cli",
              sourceKind: "delegated"
            }),
            readiness: createSupportedReadiness()
          },
          consume: {
            request: createHandoffRequest({
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

  it("should not invoke handoff for blocked batch entries", async () => {
    const requests = [
      createHandoffRequest({
        attemptId: "att_blocked_1"
      }),
      createHandoffRequest({
        attemptId: "att_blocked_2",
        runtime: "gemini-cli"
      })
    ] satisfies AttemptHandoffRequest[];
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffBatch({
        requests,
        invokeHandoff: async (request: AttemptHandoffRequest) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).resolves.toEqual({
      results: [
        {
          consumer: {
            request: createHandoffRequest({
              attemptId: "att_blocked_1"
            }),
            readiness: createBlockedReadiness()
          },
          consume: {
            request: createHandoffRequest({
              attemptId: "att_blocked_1"
            }),
            readiness: createBlockedReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createHandoffRequest({
              attemptId: "att_blocked_2",
              runtime: "gemini-cli"
            }),
            readiness: createBlockedReadiness()
          },
          consume: {
            request: createHandoffRequest({
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
    const expectedError = new Error("handoff failed");
    const requests = [
      createHandoffRequest({
        attemptId: "att_supported_1"
      }),
      createHandoffRequest({
        attemptId: "att_supported_2",
        runtime: "gemini-cli"
      }),
      createHandoffRequest({
        attemptId: "att_supported_3",
        sourceKind: "delegated"
      })
    ] satisfies AttemptHandoffRequest[];
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffBatch({
        requests,
        invokeHandoff: async (request: AttemptHandoffRequest) => {
          invokedAttemptIds.push(request.attemptId);

          if (request.attemptId === "att_supported_2") {
            throw expectedError;
          }
        },
        resolveHandoffCapability: () => true
      })
    ).rejects.toThrow(expectedError);
    expect(invokedAttemptIds).toEqual(["att_supported_1", "att_supported_2"]);
  });

  it("should fail loudly when a batch entry does not produce an apply result", async () => {
    const requests = [undefined] as unknown as readonly AttemptHandoffRequest[];

    await expect(
      applyAttemptHandoffBatch({
        requests,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffBatch({
        requests,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff apply batch requires requests entries to be objects."
    );
  });

  it("should not mutate the supplied requests", async () => {
    const requests = [
      createHandoffRequest({
        attemptId: "att_blocked"
      }),
      createHandoffRequest({
        attemptId: "att_supported",
        runtime: "gemini-cli",
        sourceKind: "delegated"
      })
    ] satisfies AttemptHandoffRequest[];
    const snapshot = structuredClone(requests);

    await expect(
      applyAttemptHandoffBatch({
        requests,
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: (runtime: string) => runtime !== "codex-cli"
      })
    ).resolves.toEqual({
      results: [
        {
          consumer: {
            request: createHandoffRequest({
              attemptId: "att_blocked"
            }),
            readiness: createBlockedReadiness()
          },
          consume: {
            request: createHandoffRequest({
              attemptId: "att_blocked"
            }),
            readiness: createBlockedReadiness(),
            invoked: false
          }
        },
        {
          consumer: {
            request: createHandoffRequest({
              attemptId: "att_supported",
              runtime: "gemini-cli",
              sourceKind: "delegated"
            }),
            readiness: createSupportedReadiness()
          },
          consume: {
            request: createHandoffRequest({
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
    const result = (await applyAttemptHandoffBatch({
      requests: [
        {
          ...createHandoffRequest(),
          handoffBasis: "promotion_target",
          report: { candidateCount: 1 },
          queue: { name: "default" },
          partialFailure: { enabled: false }
        } as AttemptHandoffRequest
      ],
      invokeHandoff: async () => undefined,
      resolveHandoffCapability: () => true
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      results: [
        {
          consumer: {
            request: createHandoffRequest(),
            readiness: createSupportedReadiness()
          },
          consume: {
            request: createHandoffRequest(),
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
    blockingReasons: ["handoff_unsupported"],
    canConsumeHandoff: false,
    hasBlockingReasons: true,
    handoffSupported: false
  } as const;
}

function createSupportedReadiness() {
  return {
    blockingReasons: [],
    canConsumeHandoff: true,
    hasBlockingReasons: false,
    handoffSupported: true
  } as const;
}

function createHandoffRequest(
  overrides: Partial<AttemptHandoffRequest> = {}
): AttemptHandoffRequest {
  return {
    taskId: "task_shared",
    attemptId: "att_ready",
    runtime: "codex-cli",
    status: "created",
    sourceKind: undefined,
    ...overrides
  };
}
