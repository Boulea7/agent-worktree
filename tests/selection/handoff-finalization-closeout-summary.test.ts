import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";

const deriveAttemptHandoffFinalizationCloseoutSummary = (
  selection as Partial<{
    deriveAttemptHandoffFinalizationCloseoutSummary: (input: {
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
      invokeHandoffFinalization: (request: { attemptId: string }) => void | Promise<void>;
      resolveHandoffFinalizationCapability?: (runtime: string) => boolean;
    }) => Promise<
      | {
          closureBasis: string;
          resultCount: number;
          invokedResultCount: number;
          blockedResultCount: number;
          groupCount: number;
          reportingDisposition: string;
          hasResults: boolean;
          allResultsInvoked: boolean;
          allResultsBlocked: boolean;
          hasMixedDisposition: boolean;
        }
      | undefined
    >;
  }>
).deriveAttemptHandoffFinalizationCloseoutSummary as (input: {
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
  invokeHandoffFinalization: (request: { attemptId: string }) => void | Promise<void>;
  resolveHandoffFinalizationCapability?: (runtime: string) => boolean;
}) => Promise<
  | {
      closureBasis: string;
      resultCount: number;
      invokedResultCount: number;
      blockedResultCount: number;
      groupCount: number;
      reportingDisposition: string;
      hasResults: boolean;
      allResultsInvoked: boolean;
      allResultsBlocked: boolean;
      hasMixedDisposition: boolean;
    }
  | undefined
>;

describe("selection handoff-finalization-closeout-summary helpers", () => {
  it("should return undefined when the supplied request summary is undefined", async () => {
    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: undefined,
        invokeHandoffFinalization: async () => undefined
      })
    ).resolves.toBeUndefined();
  });

  it("should fail closed when the supplied closeout-summary input or invoker is malformed", async () => {
    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary(undefined as never)
    ).rejects.toThrow(
      "Attempt handoff finalization closeout summary input must be an object."
    );

    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: createRequestSummary(),
        invokeHandoffFinalization: undefined as never
      })
    ).rejects.toThrow(
      "Attempt handoff finalization closeout summary requires invokeHandoffFinalization to be a function."
    );

    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: createRequestSummary(),
        invokeHandoffFinalization: async () => undefined,
        resolveHandoffFinalizationCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Attempt handoff finalization closeout summary requires resolveHandoffFinalizationCapability to be a function when provided."
    );
  });

  it("should return undefined when the supplied request summary cannot finalize handoff", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
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

  it("should derive a stable closure summary from the canonical finalization chain", async () => {
    const invokedAttemptIds: string[] = [];

    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: createRequestSummary({
          resultCount: 2,
          invokedResultCount: 2,
          blockedResultCount: 0,
          blockingReasons: [],
          canFinalizeHandoff: true,
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
        }),
        invokeHandoffFinalization: async (request) => {
          invokedAttemptIds.push(request.attemptId);
        },
        resolveHandoffFinalizationCapability: () => true
      })
    ).resolves.toEqual({
      closureBasis: "handoff_finalization_grouped_reporting_disposition_summary",
      resultCount: 2,
      invokedResultCount: 2,
      blockedResultCount: 0,
      groupCount: 1,
      reportingDisposition: "all_invoked",
      hasResults: true,
      allResultsInvoked: true,
      allResultsBlocked: false,
      hasMixedDisposition: false
    });
    expect(invokedAttemptIds).toEqual(["att_supported_1", "att_supported_2"]);
  });

  it("should derive an all-blocked closure summary when every finalization request is unsupported", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: createRequestSummary({
          resultCount: 2,
          invokedResultCount: 2,
          blockedResultCount: 0,
          canFinalizeHandoff: true,
          blockingReasons: [],
          requests: [
            createRequest({
              attemptId: "att_blocked_1",
              runtime: "codex-cli"
            }),
            createRequest({
              attemptId: "att_blocked_2",
              runtime: "gemini-cli",
              sourceKind: "delegated"
            })
          ]
        }),
        invokeHandoffFinalization,
        resolveHandoffFinalizationCapability: () => false
      })
    ).resolves.toEqual({
      closureBasis: "handoff_finalization_grouped_reporting_disposition_summary",
      resultCount: 2,
      invokedResultCount: 0,
      blockedResultCount: 2,
      groupCount: 1,
      reportingDisposition: "all_blocked",
      hasResults: true,
      allResultsInvoked: false,
      allResultsBlocked: true,
      hasMixedDisposition: false
    });
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should fail closed before any invocation when finalization capability is mixed", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: createRequestSummary({
          resultCount: 2,
          invokedResultCount: 2,
          blockedResultCount: 0,
          blockingReasons: [],
          canFinalizeHandoff: true,
          requests: [
            createRequest({
              attemptId: "att_supported",
              runtime: "codex-cli"
            }),
            createRequest({
              attemptId: "att_blocked",
              runtime: "gemini-cli",
              sourceKind: "delegated"
            })
          ]
        }),
        invokeHandoffFinalization,
        resolveHandoffFinalizationCapability: (runtime) => runtime === "codex-cli"
      })
    ).rejects.toThrow(
      "Attempt handoff finalization request apply requires summary.requests to resolve to a uniform capability decision before invocation."
    );
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should surface canonical request-summary errors when the nested summary is null", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: null as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: null as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(
      "Attempt handoff finalization request apply requires summary to be an object."
    );
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should surface canonical request-summary errors when nested summary.requests is not an array", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: {
          ...createRequestSummary(),
          requests: null
        } as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: {
          ...createRequestSummary(),
          requests: null
        } as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(
      "Attempt handoff finalization request apply requires summary.requests to be an array."
    );
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should surface canonical request-summary validation failures", async () => {
    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: {
          ...createRequestSummary(),
          requests: [undefined]
        } as never,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: {
          ...createRequestSummary(),
          requests: [undefined]
        } as never,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff finalization request apply requires summary.requests entries to be objects."
    );
  });

  it("should surface mixed-task request-summary failures from the canonical closeout chain", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: createRequestSummary({
          requests: [
            createRequest({
              taskId: "task_shared"
            }),
            createRequest({
              taskId: " task_other ",
              attemptId: "att_other",
              runtime: "gemini-cli"
            })
          ]
        }),
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: createRequestSummary({
          requests: [
            createRequest({
              taskId: "task_shared"
            }),
            createRequest({
              taskId: " task_other ",
              attemptId: "att_other",
              runtime: "gemini-cli"
            })
          ]
        }),
        invokeHandoffFinalization
      })
    ).rejects.toThrow(
      "Attempt handoff finalization request apply requires summary.requests from a single taskId."
    );
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should surface duplicate identity request-summary failures from the canonical closeout chain", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: createRequestSummary({
          requests: [
            createRequest({
              taskId: "task_shared",
              attemptId: "att_dup",
              runtime: "codex-cli"
            }),
            createRequest({
              taskId: " task_shared ",
              attemptId: " att_dup ",
              runtime: " codex-cli "
            })
          ]
        }),
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      deriveAttemptHandoffFinalizationCloseoutSummary({
        summary: createRequestSummary({
          requests: [
            createRequest({
              taskId: "task_shared",
              attemptId: "att_dup",
              runtime: "codex-cli"
            }),
            createRequest({
              taskId: " task_shared ",
              attemptId: " att_dup ",
              runtime: " codex-cli "
            })
          ]
        }),
        invokeHandoffFinalization
      })
    ).rejects.toThrow(
      "Attempt handoff finalization request apply requires summary.requests to use unique (taskId, attemptId, runtime) identities."
    );
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });
});

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
  return {
    requestBasis: "handoff_finalization_target_summary",
    resultCount: 1,
    invokedResultCount: 1,
    blockedResultCount: 0,
    blockingReasons: [],
    canFinalizeHandoff: true,
    requests: [createRequest()],
    ...overrides
  };
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
    taskId: "task-1",
    attemptId: "att_supported",
    runtime: "codex-cli",
    status: "verified",
    sourceKind: "direct" as string | undefined,
    ...overrides
  };
}
