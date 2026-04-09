import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptHandoffFinalizationConsumer,
  AttemptHandoffFinalizationRequest
} from "../../src/selection/internal.js";
import { consumeAttemptHandoffFinalizationBatch } from "../../src/selection/internal.js";

describe("selection handoff-finalization-consume-batch helpers", () => {
  it("should return an empty batch result for an empty consumer list", async () => {
    await expect(
      consumeAttemptHandoffFinalizationBatch({
        consumers: [],
        invokeHandoffFinalization: async () => {
          throw new Error(
            "empty finalization batches must not invoke handoff finalization"
          );
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should fail loudly when batch input is not an object", async () => {
    await expect(
      consumeAttemptHandoffFinalizationBatch(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeAttemptHandoffFinalizationBatch(undefined as never)
    ).rejects.toThrow(
      "Attempt handoff finalization consume batch input must be an object."
    );
  });

  it("should fail loudly when consumers is not an array", async () => {
    await expect(
      consumeAttemptHandoffFinalizationBatch({
        consumers: undefined as never,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeAttemptHandoffFinalizationBatch({
        consumers: undefined as never,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff finalization consume batch requires consumers to be an array."
    );
  });

  it("should fail loudly when invokeHandoffFinalization is not a function", async () => {
    await expect(
      consumeAttemptHandoffFinalizationBatch({
        consumers: [],
        invokeHandoffFinalization: undefined as never
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeAttemptHandoffFinalizationBatch({
        consumers: [],
        invokeHandoffFinalization: undefined as never
      })
    ).rejects.toThrow(
      "Attempt handoff finalization consume batch requires invokeHandoffFinalization to be a function."
    );
  });

  it("should fail loudly when consumer entries are sparse before deeper consumer validation runs", async () => {
    const sparseConsumers = new Array<AttemptHandoffFinalizationConsumer>(1);

    await expect(
      consumeAttemptHandoffFinalizationBatch({
        consumers: sparseConsumers,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff finalization consume batch requires consumers entries to be objects."
    );
  });

  it("should preserve input order and continue past blocked consumers", async () => {
    const consumers = [
      createFinalizationConsumer({
        request: createFinalizationRequest({
          attemptId: "att_blocked_1"
        })
      }),
      createSupportedConsumer({
        request: createFinalizationRequest({
          attemptId: "att_supported_1"
        })
      }),
      createFinalizationConsumer({
        request: createFinalizationRequest({
          attemptId: "att_blocked_2"
        })
      }),
      createSupportedConsumer({
        request: createFinalizationRequest({
          attemptId: "att_supported_2",
          runtime: "gemini-cli",
          sourceKind: "delegated"
        })
      })
    ] satisfies AttemptHandoffFinalizationConsumer[];
    const invokedAttemptIds: string[] = [];

    await expect(
      consumeAttemptHandoffFinalizationBatch({
        consumers,
        invokeHandoffFinalization: async (
          request: AttemptHandoffFinalizationRequest
        ) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).resolves.toEqual({
      results: [
        {
          request: createFinalizationRequest({
            attemptId: "att_blocked_1"
          }),
          readiness: createBlockedReadiness(),
          invoked: false
        },
        {
          request: createFinalizationRequest({
            attemptId: "att_supported_1"
          }),
          readiness: createSupportedReadiness(),
          invoked: true
        },
        {
          request: createFinalizationRequest({
            attemptId: "att_blocked_2"
          }),
          readiness: createBlockedReadiness(),
          invoked: false
        },
        {
          request: createFinalizationRequest({
            attemptId: "att_supported_2",
            runtime: "gemini-cli",
            sourceKind: "delegated"
          }),
          readiness: createSupportedReadiness(),
          invoked: true
        }
      ]
    });
    expect(invokedAttemptIds).toEqual(["att_supported_1", "att_supported_2"]);
  });

  it("should fail fast on the first supported invoker error and stop later supported entries", async () => {
    const expectedError = new Error("handoff finalization failed");
    const consumers = [
      createSupportedConsumer({
        request: createFinalizationRequest({
          attemptId: "att_supported_1"
        })
      }),
      createSupportedConsumer({
        request: createFinalizationRequest({
          attemptId: "att_supported_2"
        })
      }),
      createSupportedConsumer({
        request: createFinalizationRequest({
          attemptId: "att_supported_3"
        })
      })
    ] satisfies AttemptHandoffFinalizationConsumer[];
    const invokedAttemptIds: string[] = [];

    await expect(
      consumeAttemptHandoffFinalizationBatch({
        consumers,
        invokeHandoffFinalization: async (
          request: AttemptHandoffFinalizationRequest
        ) => {
          invokedAttemptIds.push(request.attemptId);

          if (request.attemptId === "att_supported_2") {
            throw expectedError;
          }
        }
      })
    ).rejects.toThrow(expectedError);
    expect(invokedAttemptIds).toEqual(["att_supported_1", "att_supported_2"]);
  });

  it("should fail fast when a batch entry is not a valid consumer at the batch seam and stop before invoking later supported entries", async () => {
    const invokedAttemptIds: string[] = [];

    await expect(
      consumeAttemptHandoffFinalizationBatch({
        consumers: [
          undefined,
          createSupportedConsumer({
            request: createFinalizationRequest({
              attemptId: "att_supported"
            })
          })
        ] as unknown as AttemptHandoffFinalizationConsumer[],
        invokeHandoffFinalization: async (
          request: AttemptHandoffFinalizationRequest
        ) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeAttemptHandoffFinalizationBatch({
        consumers: [
          undefined,
          createSupportedConsumer({
            request: createFinalizationRequest({
              attemptId: "att_supported"
            })
          })
        ] as unknown as AttemptHandoffFinalizationConsumer[],
        invokeHandoffFinalization: async (
          request: AttemptHandoffFinalizationRequest
        ) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).rejects.toThrow(
      "Attempt handoff finalization consume batch requires consumers entries to be objects."
    );
    expect(invokedAttemptIds).toEqual([]);
  });

  it("should keep the batch result shape minimal and leave inputs untouched", async () => {
    const consumers = [
      createFinalizationConsumer(),
      createSupportedConsumer({
        request: createFinalizationRequest({
          attemptId: "att_supported",
          runtime: "gemini-cli",
          sourceKind: "delegated"
        })
      })
    ] satisfies AttemptHandoffFinalizationConsumer[];
    const snapshot = structuredClone(consumers);
    const batchResult = (await consumeAttemptHandoffFinalizationBatch({
      consumers,
      invokeHandoffFinalization: async () => undefined
    })) as unknown as Record<string, unknown>;

    expect(batchResult).toEqual({
      results: [
        {
          request: createFinalizationRequest(),
          readiness: createBlockedReadiness(),
          invoked: false
        },
        {
          request: createFinalizationRequest({
            attemptId: "att_supported",
            runtime: "gemini-cli",
            sourceKind: "delegated"
          }),
          readiness: createSupportedReadiness(),
          invoked: true
        }
      ]
    });
    expect(batchResult).not.toHaveProperty("summary");
    expect(batchResult).not.toHaveProperty("count");
    expect(batchResult).not.toHaveProperty("error");
    expect(batchResult).not.toHaveProperty("errors");
    expect(batchResult).not.toHaveProperty("manifest");
    expect(consumers).toEqual(snapshot);
  });
});

function createBlockedReadiness(): AttemptHandoffFinalizationConsumer["readiness"] {
  return {
    blockingReasons: ["handoff_finalization_unsupported"],
    canConsumeHandoffFinalization: false,
    hasBlockingReasons: true,
    handoffFinalizationSupported: false
  };
}

function createSupportedReadiness(): AttemptHandoffFinalizationConsumer["readiness"] {
  return {
    blockingReasons: [],
    canConsumeHandoffFinalization: true,
    hasBlockingReasons: false,
    handoffFinalizationSupported: true
  };
}

function createFinalizationConsumer(
  overrides: Partial<AttemptHandoffFinalizationConsumer> = {}
): AttemptHandoffFinalizationConsumer {
  return {
    request: createFinalizationRequest(),
    readiness: createBlockedReadiness(),
    ...overrides
  };
}

function createSupportedConsumer(
  overrides: Partial<AttemptHandoffFinalizationConsumer> = {}
): AttemptHandoffFinalizationConsumer {
  return {
    request: createFinalizationRequest(),
    readiness: createSupportedReadiness(),
    ...overrides
  };
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
