import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as handoffFinalizationApplyModule from "../../src/selection/handoff-finalization-apply.js";
import { applyAttemptHandoffFinalizationBatch } from "../../src/selection/handoff-finalization-apply-batch.js";
import type { AttemptHandoffFinalizationRequest } from "../../src/selection/types.js";

describe("selection handoff-finalization-apply-batch helpers", () => {
  it("should fail closed when the supplied finalization apply-batch input or callbacks are malformed", async () => {
    await expect(
      applyAttemptHandoffFinalizationBatch(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffFinalizationBatch(undefined as never)
    ).rejects.toThrow(
      "Attempt handoff finalization apply batch input must be an object."
    );

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests: undefined as never,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff finalization apply batch requires requests to be an array."
    );

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests: [],
        invokeHandoffFinalization: undefined as never
      })
    ).rejects.toThrow(
      "Attempt handoff finalization apply batch requires invokeHandoffFinalization to be a function."
    );

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests: [],
        invokeHandoffFinalization: async () => undefined,
        resolveHandoffFinalizationCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Attempt handoff finalization apply batch requires resolveHandoffFinalizationCapability to be a function when provided."
    );
  });

  it("should fail closed when reading requests throws through an accessor-shaped input", async () => {
    await expect(
      applyAttemptHandoffFinalizationBatch({
        get requests() {
          throw new Error("getter boom");
        },
        invokeHandoffFinalization: async () => undefined
      } as never)
    ).rejects.toThrow(ValidationError);
  });

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

  it("should fail loudly when requests from different taskIds are mixed after normalization", async () => {
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests: [
          createFinalizationRequest({
            taskId: "task_shared",
            attemptId: "att_a"
          }),
          createFinalizationRequest({
            taskId: " task_other ",
            attemptId: "att_b"
          })
        ],
        invokeHandoffFinalization: async (
          request: AttemptHandoffFinalizationRequest
        ) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).rejects.toThrow(
      "Attempt handoff finalization apply batch requires requests from a single taskId."
    );
    expect(invokedAttemptIds).toEqual([]);
  });

  it("should fail loudly when requests reuse normalized request identities", async () => {
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests: [
          createFinalizationRequest({
            taskId: "task_shared",
            attemptId: "att_dup",
            runtime: "codex-cli"
          }),
          createFinalizationRequest({
            taskId: " task_shared ",
            attemptId: " att_dup ",
            runtime: " codex-cli "
          })
        ],
        invokeHandoffFinalization: async (
          request: AttemptHandoffFinalizationRequest
        ) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).rejects.toThrow(
      "Attempt handoff finalization apply batch requires requests to use unique (taskId, attemptId, runtime) identities."
    );
    expect(invokedAttemptIds).toEqual([]);
  });

  it("should fail before invoking when any finalization request identity field is blank after normalization", async () => {
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests: [
          createFinalizationRequest({
            taskId: "task_shared",
            attemptId: "att_valid"
          }),
          {
            ...createFinalizationRequest({
              taskId: "task_shared",
              attemptId: "att_invalid"
            }),
            runtime: "   "
          } as AttemptHandoffFinalizationRequest
        ],
        invokeHandoffFinalization: async (
          request: AttemptHandoffFinalizationRequest
        ) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).rejects.toThrow(
      "Attempt handoff finalization apply batch requires requests entries to include non-empty taskId, attemptId, and runtime strings."
    );
    expect(invokedAttemptIds).toEqual([]);
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

  it("should fail loudly when a finalization request batch entry is not an object before deriving an apply result", async () => {
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
      "Attempt handoff finalization apply batch requires requests entries to be objects."
    );
  });

  it("should fail loudly when a finalization request does not produce an apply result", async () => {
    const applySpy = vi
      .spyOn(
        handoffFinalizationApplyModule,
        "applyAttemptHandoffFinalization"
      )
      .mockResolvedValueOnce(undefined as never);

    try {
      await expect(
        applyAttemptHandoffFinalizationBatch({
          requests: [createFinalizationRequest()],
          invokeHandoffFinalization: async () => undefined
        })
      ).rejects.toThrow(
        "Attempt handoff finalization apply batch requires each request to produce an apply result."
      );
    } finally {
      applySpy.mockRestore();
    }
  });

  it("should fail loudly when finalization request entries are sparse or non-objects before later helpers run", async () => {
    const sparseRequests = new Array<AttemptHandoffFinalizationRequest>(1);

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests: sparseRequests,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff finalization apply batch requires requests entries to be objects."
    );
  });

  it("should fail preflight before invoking when a later finalization request entry is malformed", async () => {
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffFinalizationBatch({
        requests: [
          createFinalizationRequest({
            attemptId: "att_supported_1"
          }),
          undefined,
          createFinalizationRequest({
            attemptId: "att_supported_2"
          })
        ] as unknown as readonly AttemptHandoffFinalizationRequest[],
        invokeHandoffFinalization: async (
          request: AttemptHandoffFinalizationRequest
        ) => {
          invokedAttemptIds.push(request.attemptId);
        },
        resolveHandoffFinalizationCapability: () => true
      })
    ).rejects.toThrow(
      "Attempt handoff finalization apply batch requires requests entries to be objects."
    );
    expect(invokedAttemptIds).toEqual([]);
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
