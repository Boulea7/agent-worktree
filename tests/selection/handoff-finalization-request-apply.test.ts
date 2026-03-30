import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";

const applyAttemptHandoffFinalizationRequestSummary = (
  selection as Partial<{
    applyAttemptHandoffFinalizationRequestSummary: (input: {
      summary:
        | {
            requestBasis: string;
            resultCount: number;
            invokedResultCount: number;
            blockedResultCount: number;
            blockingReasons: string[];
            canFinalizeHandoff: boolean;
            requests: Array<{
              taskId: string;
              attemptId: string;
              runtime: string;
              status: string;
              sourceKind: string | undefined;
            }>;
          }
        | undefined;
      invokeHandoffFinalization: (request: {
        attemptId: string;
      }) => void | Promise<void>;
      resolveHandoffFinalizationCapability?: (runtime: string) => boolean;
    }) => Promise<
      | {
          results: Array<{
            consumer: {
              request: {
                attemptId: string;
              };
              readiness: {
                blockingReasons: string[];
                canConsumeHandoffFinalization: boolean;
                hasBlockingReasons: boolean;
                handoffFinalizationSupported: boolean;
              };
            };
            consume: {
              request: {
                attemptId: string;
              };
              readiness: {
                blockingReasons: string[];
                canConsumeHandoffFinalization: boolean;
                hasBlockingReasons: boolean;
                handoffFinalizationSupported: boolean;
              };
              invoked: boolean;
            };
          }>;
        }
      | undefined
    >;
  }>
).applyAttemptHandoffFinalizationRequestSummary as (input: {
  summary:
    | {
        requestBasis: string;
        resultCount: number;
        invokedResultCount: number;
        blockedResultCount: number;
        blockingReasons: string[];
        canFinalizeHandoff: boolean;
        requests: Array<{
          taskId: string;
          attemptId: string;
          runtime: string;
          status: string;
          sourceKind: string | undefined;
        }>;
      }
    | undefined;
  invokeHandoffFinalization: (request: {
    attemptId: string;
  }) => void | Promise<void>;
  resolveHandoffFinalizationCapability?: (runtime: string) => boolean;
}) => Promise<
  | {
      results: Array<{
        consumer: {
          request: {
            attemptId: string;
          };
          readiness: {
            blockingReasons: string[];
            canConsumeHandoffFinalization: boolean;
            hasBlockingReasons: boolean;
            handoffFinalizationSupported: boolean;
          };
        };
        consume: {
          request: {
            attemptId: string;
          };
          readiness: {
            blockingReasons: string[];
            canConsumeHandoffFinalization: boolean;
            hasBlockingReasons: boolean;
            handoffFinalizationSupported: boolean;
          };
          invoked: boolean;
        };
      }>;
    }
  | undefined
>;

describe("selection handoff-finalization-request-apply helpers", () => {
  it("should return undefined when the supplied request summary is undefined", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary: undefined,
        invokeHandoffFinalization
      })
    ).resolves.toBeUndefined();
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should return undefined when the supplied request summary cannot finalize handoff", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary: createRequestSummary({
          resultCount: 1,
          invokedResultCount: 0,
          blockedResultCount: 1,
          canFinalizeHandoff: false,
          blockingReasons: ["handoff_unsupported"],
          requests: []
        }),
        invokeHandoffFinalization
      })
    ).resolves.toBeUndefined();
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should apply every request from the canonical request summary in order", async () => {
    const summary = createRequestSummary({
      requests: [
        createRequest({
          attemptId: "att_supported_1"
        }),
        createRequest({
          attemptId: "att_supported_2",
          runtime: "gemini-cli",
          sourceKind: "delegated"
        })
      ]
    });
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary,
        invokeHandoffFinalization: async (request) => {
          invokedAttemptIds.push(request.attemptId);
        },
        resolveHandoffFinalizationCapability: () => true
      })
    ).resolves.toEqual({
      results: [
        {
          consumer: {
            request: createRequest({
              attemptId: "att_supported_1"
            }),
            readiness: createSupportedReadiness()
          },
          consume: {
            request: createRequest({
              attemptId: "att_supported_1"
            }),
            readiness: createSupportedReadiness(),
            invoked: true
          }
        },
        {
          consumer: {
            request: createRequest({
              attemptId: "att_supported_2",
              runtime: "gemini-cli",
              sourceKind: "delegated"
            }),
            readiness: createSupportedReadiness()
          },
          consume: {
            request: createRequest({
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

  it("should fail loudly when summary.requests contains explicit undefined entries", async () => {
    const summary = {
      ...createRequestSummary(),
      requests: [undefined]
    };

    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary: summary as never,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary: summary as never,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff finalization request apply requires summary.requests entries to be objects."
    );
  });

  it("should fail loudly when summary.requests contains sparse array holes", async () => {
    const requests = new Array<ReturnType<typeof createRequest>>(1);
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary: createRequestSummary({
          requests
        }) as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary: createRequestSummary({
          requests
        }) as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(
      "Attempt handoff finalization request apply requires summary.requests entries to be objects."
    );
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should fail loudly when summary.requests relies on inherited array indexes", async () => {
    const requests = new Array<ReturnType<typeof createRequest>>(1);
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    Object.setPrototypeOf(requests, {
      0: createRequest({
        attemptId: "att_inherited"
      })
    });

    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary: createRequestSummary({
          requests
        }) as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary: createRequestSummary({
          requests
        }) as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(
      "Attempt handoff finalization request apply requires summary.requests entries to be objects."
    );
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should fail loudly when summary.blockingReasons contains sparse array holes", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);
    const blockingReasons = new Array<string>(1);

    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary: createRequestSummary({
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          canFinalizeHandoff: false,
          requests: [],
          blockingReasons
        }) as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary: createRequestSummary({
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          canFinalizeHandoff: false,
          requests: [],
          blockingReasons
        }) as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(
      "Attempt handoff finalization request apply requires summary.blockingReasons to use the existing handoff decision blocker vocabulary."
    );
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should fail loudly when summary.blockingReasons relies on inherited array indexes", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);
    const blockingReasons = new Array<string>(1);

    Object.setPrototypeOf(blockingReasons, {
      0: "no_results"
    });

    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary: createRequestSummary({
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          canFinalizeHandoff: false,
          requests: [],
          blockingReasons
        }) as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffFinalizationRequestSummary({
        summary: createRequestSummary({
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          canFinalizeHandoff: false,
          requests: [],
          blockingReasons
        }) as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(
      "Attempt handoff finalization request apply requires summary.blockingReasons to use the existing handoff decision blocker vocabulary."
    );
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });
});

function createSupportedReadiness() {
  return {
    blockingReasons: [],
    canConsumeHandoffFinalization: true,
    hasBlockingReasons: false,
    handoffFinalizationSupported: true
  } as const;
}

function createRequest(
  overrides: Partial<{
    taskId: string;
    attemptId: string;
    runtime: string;
    status: string;
    sourceKind: string | undefined;
  }> = {}
) {
  return {
    taskId: "task_shared",
    attemptId: "att_ready",
    runtime: "codex-cli",
    status: "created",
    sourceKind: undefined,
    ...overrides
  };
}

function createRequestSummary(
  overrides: Partial<{
    requestBasis: string;
    resultCount: number;
    invokedResultCount: number;
    blockedResultCount: number;
    blockingReasons: string[];
    canFinalizeHandoff: boolean;
    requests: Array<ReturnType<typeof createRequest>>;
  }> = {}
) {
  const requests = overrides.requests ?? [createRequest()];

  return {
    requestBasis: "handoff_finalization_target_summary",
    resultCount: overrides.resultCount ?? requests.length,
    invokedResultCount: overrides.invokedResultCount ?? requests.length,
    blockedResultCount: overrides.blockedResultCount ?? 0,
    blockingReasons: overrides.blockingReasons ?? [],
    canFinalizeHandoff: overrides.canFinalizeHandoff ?? true,
    requests,
    ...overrides
  };
}
