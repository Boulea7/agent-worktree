import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  consumeAttemptHandoffBatch,
  type AttemptHandoffConsumer,
  type AttemptHandoffRequest
} from "../../src/selection/internal.js";

describe("selection handoff-consume-batch helpers", () => {
  it("should return an empty batch result for an empty consumer list", async () => {
    await expect(
      consumeAttemptHandoffBatch({
        consumers: [],
        invokeHandoff: async () => {
          throw new Error("empty batches must not invoke handoff");
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should fail closed when the supplied batch input, consumer list, or invoker is malformed", async () => {
    await expect(
      consumeAttemptHandoffBatch(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeAttemptHandoffBatch(undefined as never)
    ).rejects.toThrow("Attempt handoff consume batch input must be an object.");

    await expect(
      consumeAttemptHandoffBatch({
        consumers: undefined as never,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff consume batch requires consumers to be an array."
    );

    await expect(
      consumeAttemptHandoffBatch({
        consumers: [],
        invokeHandoff: undefined as never
      })
    ).rejects.toThrow(
      "Attempt handoff consume batch requires invokeHandoff to be a function."
    );

    const sparseConsumers = new Array<AttemptHandoffConsumer>(1);

    await expect(
      consumeAttemptHandoffBatch({
        consumers: sparseConsumers,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff consume batch requires consumers entries to be objects."
    );
  });

  it("should preserve input order and continue past blocked consumers", async () => {
    const consumers = [
      createHandoffConsumer({
        request: createHandoffRequest({
          attemptId: "att_blocked_1"
        })
      }),
      createSupportedConsumer({
        request: createHandoffRequest({
          attemptId: "att_supported_1"
        })
      }),
      createHandoffConsumer({
        request: createHandoffRequest({
          attemptId: "att_blocked_2"
        })
      }),
      createSupportedConsumer({
        request: createHandoffRequest({
          attemptId: "att_supported_2"
        })
      })
    ] satisfies AttemptHandoffConsumer[];
    const invokedAttemptIds: string[] = [];

    await expect(
      consumeAttemptHandoffBatch({
        consumers,
        invokeHandoff: async (request: AttemptHandoffRequest) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).resolves.toEqual({
      results: [
        {
          request: createHandoffRequest({
            attemptId: "att_blocked_1"
          }),
          readiness: createBlockedReadiness(),
          invoked: false
        },
        {
          request: createHandoffRequest({
            attemptId: "att_supported_1"
          }),
          readiness: createSupportedReadiness(),
          invoked: true
        },
        {
          request: createHandoffRequest({
            attemptId: "att_blocked_2"
          }),
          readiness: createBlockedReadiness(),
          invoked: false
        },
        {
          request: createHandoffRequest({
            attemptId: "att_supported_2"
          }),
          readiness: createSupportedReadiness(),
          invoked: true
        }
      ]
    });
    expect(invokedAttemptIds).toEqual(["att_supported_1", "att_supported_2"]);
  });

  it("should not invoke handoff for blocked entries", async () => {
    const consumers = [
      createHandoffConsumer({
        request: createHandoffRequest({
          attemptId: "att_blocked_1"
        })
      }),
      createHandoffConsumer({
        request: createHandoffRequest({
          attemptId: "att_blocked_2"
        })
      })
    ] satisfies AttemptHandoffConsumer[];
    const invokedAttemptIds: string[] = [];

    await expect(
      consumeAttemptHandoffBatch({
        consumers,
        invokeHandoff: async (request: AttemptHandoffRequest) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).resolves.toEqual({
      results: [
        {
          request: createHandoffRequest({
            attemptId: "att_blocked_1"
          }),
          readiness: createBlockedReadiness(),
          invoked: false
        },
        {
          request: createHandoffRequest({
            attemptId: "att_blocked_2"
          }),
          readiness: createBlockedReadiness(),
          invoked: false
        }
      ]
    });
    expect(invokedAttemptIds).toEqual([]);
  });

  it("should fail fast on the first supported invoker error and stop later supported entries", async () => {
    const expectedError = new Error("handoff failed");
    const consumers = [
      createSupportedConsumer({
        request: createHandoffRequest({
          attemptId: "att_supported_1"
        })
      }),
      createSupportedConsumer({
        request: createHandoffRequest({
          attemptId: "att_supported_2"
        })
      }),
      createSupportedConsumer({
        request: createHandoffRequest({
          attemptId: "att_supported_3"
        })
      })
    ] satisfies AttemptHandoffConsumer[];
    const invokedAttemptIds: string[] = [];

    await expect(
      consumeAttemptHandoffBatch({
        consumers,
        invokeHandoff: async (request: AttemptHandoffRequest) => {
          invokedAttemptIds.push(request.attemptId);

          if (request.attemptId === "att_supported_2") {
            throw expectedError;
          }
        }
      })
    ).rejects.toThrow(expectedError);
    expect(invokedAttemptIds).toEqual(["att_supported_1", "att_supported_2"]);
  });

  it("should keep the batch result shape minimal and leave inputs untouched", async () => {
    const consumers = [
      createHandoffConsumer(),
      createSupportedConsumer({
        request: createHandoffRequest({
          attemptId: "att_supported",
          runtime: "gemini-cli",
          sourceKind: "delegated"
        })
      })
    ] satisfies AttemptHandoffConsumer[];
    const snapshot = structuredClone(consumers);
    const batchResult = (await consumeAttemptHandoffBatch({
      consumers,
      invokeHandoff: async () => {}
    })) as unknown as Record<string, unknown>;

    expect(batchResult).toEqual({
      results: [
        {
          request: createHandoffRequest(),
          readiness: createBlockedReadiness(),
          invoked: false
        },
        {
          request: createHandoffRequest({
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
    expect(batchResult).not.toHaveProperty("adapterResult");
    expect(batchResult).not.toHaveProperty("partialFailure");
    expect(batchResult).not.toHaveProperty("manifest");
    expect(consumers).toEqual(snapshot);
  });
});

function createBlockedReadiness(): AttemptHandoffConsumer["readiness"] {
  return {
    blockingReasons: ["handoff_unsupported"],
    canConsumeHandoff: false,
    hasBlockingReasons: true,
    handoffSupported: false
  };
}

function createSupportedReadiness(): AttemptHandoffConsumer["readiness"] {
  return {
    blockingReasons: [],
    canConsumeHandoff: true,
    hasBlockingReasons: false,
    handoffSupported: true
  };
}

function createHandoffConsumer(
  overrides: Partial<AttemptHandoffConsumer> = {}
): AttemptHandoffConsumer {
  return {
    request: createHandoffRequest(),
    readiness: createBlockedReadiness(),
    ...overrides
  };
}

function createSupportedConsumer(
  overrides: Partial<AttemptHandoffConsumer> = {}
): AttemptHandoffConsumer {
  return {
    request: createHandoffRequest(),
    readiness: createSupportedReadiness(),
    ...overrides
  };
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
