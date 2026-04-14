import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";
import { applyAttemptHandoffFinalizationCloseoutDecisionSummary } from "../../src/selection/handoff-finalization-closeout-decision-apply.js";
import {
  deriveAttemptVerificationArtifactSummary,
  executeAttemptVerification
} from "../../src/verification/internal.js";

const applyCloseoutDecisionSummary = applyAttemptHandoffFinalizationCloseoutDecisionSummary as (input: {
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
      decisionBasis: string;
      resultCount: number;
      invokedResultCount: number;
      blockedResultCount: number;
      groupCount: number;
      reportingDisposition: "empty" | "all_invoked" | "all_blocked" | "mixed";
      blockingReasons: string[];
      canAdvanceFromCloseout: boolean;
      hasBlockingReasons: boolean;
    }
  | undefined
>;

describe("selection handoff-finalization-closeout-decision-apply helpers", () => {
  it("should return undefined for the post-apply helper when the supplied request summary is undefined", async () => {
    await expect(
      applyCloseoutDecisionSummary({
        summary: undefined,
        invokeHandoffFinalization: async () => undefined
      })
    ).resolves.toBeUndefined();
  });

  it("should fail closed when the supplied closeout-decision-apply input or invoker is malformed", async () => {
    await expect(
      applyCloseoutDecisionSummary(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyCloseoutDecisionSummary(undefined as never)
    ).rejects.toThrow(
      "Attempt handoff finalization closeout decision apply input must be an object."
    );

    await expect(
      applyCloseoutDecisionSummary({
        summary: createRequestSummary(),
        invokeHandoffFinalization: undefined as never
      })
    ).rejects.toThrow(
      "Attempt handoff finalization closeout decision apply requires invokeHandoffFinalization to be a function."
    );

    await expect(
      applyCloseoutDecisionSummary({
        summary: createRequestSummary(),
        invokeHandoffFinalization: async () => undefined,
        resolveHandoffFinalizationCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Attempt handoff finalization closeout decision apply requires resolveHandoffFinalizationCapability to be a function when provided."
    );
  });

  it("should fail closed when callback fields are accessor-shaped", async () => {
    await expect(
      applyCloseoutDecisionSummary({
        summary: createRequestSummary(),
        get invokeHandoffFinalization() {
          throw new Error("getter boom");
        }
      } as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyCloseoutDecisionSummary({
        summary: createRequestSummary(),
        get invokeHandoffFinalization() {
          throw new Error("getter boom");
        }
      } as never)
    ).rejects.toThrow(
      "Attempt handoff finalization closeout decision apply requires invokeHandoffFinalization to be a function."
    );

    await expect(
      applyCloseoutDecisionSummary({
        summary: createRequestSummary(),
        invokeHandoffFinalization: async () => undefined,
        get resolveHandoffFinalizationCapability() {
          throw new Error("getter boom");
        }
      } as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyCloseoutDecisionSummary({
        summary: createRequestSummary(),
        invokeHandoffFinalization: async () => undefined,
        get resolveHandoffFinalizationCapability() {
          throw new Error("getter boom");
        }
      } as never)
    ).rejects.toThrow(
      "Attempt handoff finalization closeout decision apply requires resolveHandoffFinalizationCapability to be a function when provided."
    );
  });

  it("should return undefined for the post-apply helper when the supplied request summary cannot finalize handoff", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyCloseoutDecisionSummary({
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

  it("should fail closed before deriving a closeout decision when finalization capability is mixed", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyCloseoutDecisionSummary({
        summary: createRequestSummary({
          resultCount: 2,
          invokedResultCount: 2,
          blockedResultCount: 0,
          canFinalizeHandoff: true,
          blockingReasons: [],
          requests: [
            createRequest({
              attemptId: "att_supported",
              runtime: "codex-cli"
            }),
            createRequest({
              attemptId: "att_unsupported",
              runtime: "gemini-cli"
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

  it("should derive an all-blocked closeout decision summary when every finalization request is unsupported", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyCloseoutDecisionSummary({
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
      decisionBasis: "handoff_finalization_closure_summary",
      resultCount: 2,
      invokedResultCount: 0,
      blockedResultCount: 2,
      groupCount: 1,
      reportingDisposition: "all_blocked",
      blockingReasons: ["handoff_finalization_unsupported"],
      canAdvanceFromCloseout: false,
      hasBlockingReasons: true
    });
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should derive a promotable closeout decision summary through the canonical verification-to-closeout chain", async () => {
    const verificationResult = await executeAttemptVerification({
      checks: [
        {
          name: "lint",
          executable: "npm",
          args: ["run", "lint"],
          required: true
        }
      ],
      runner: vi.fn(async () => ({
        exitCode: 0,
        stdout: "ok",
        stderr: ""
      }))
    });
    const manifest = createManifest({
      attemptId: "att_ready",
      status: "running",
      sourceKind: "delegated",
      verification: verificationResult.verification
    });
    const candidate = selection.deriveAttemptPromotionCandidate(
      manifest,
      deriveAttemptVerificationArtifactSummary(verificationResult)
    );
    const promotionTarget = selection.deriveAttemptPromotionTarget(
      selection.deriveAttemptPromotionDecisionSummary(
        selection.deriveAttemptPromotionExplanationSummary(
          selection.deriveAttemptPromotionReport(
            selection.deriveAttemptPromotionAuditSummary(
              selection.deriveAttemptPromotionResult([candidate])
            )
          )
        )
      )
    );
    const handoffBatch = await selection.applyAttemptPromotionTargetBatch({
      targets: [promotionTarget!],
      invokeHandoff: async () => undefined,
      resolveHandoffCapability: () => true
    });
    const finalizationRequestSummary =
      selection.deriveAttemptHandoffFinalizationRequestSummary(
        selection.deriveAttemptHandoffFinalizationTargetSummary(
          selection.deriveAttemptHandoffExplanationSummary(
            selection.deriveAttemptHandoffReportReady(handoffBatch)
          )
        )
      );
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyCloseoutDecisionSummary({
        summary: finalizationRequestSummary,
        invokeHandoffFinalization,
        resolveHandoffFinalizationCapability: () => true
      })
    ).resolves.toEqual({
      decisionBasis: "handoff_finalization_closure_summary",
      resultCount: 1,
      invokedResultCount: 1,
      blockedResultCount: 0,
      groupCount: 1,
      reportingDisposition: "all_invoked",
      blockingReasons: [],
      canAdvanceFromCloseout: true,
      hasBlockingReasons: false
    });
    expect(invokeHandoffFinalization).toHaveBeenCalledTimes(1);
    expect(invokeHandoffFinalization).toHaveBeenCalledWith({
      taskId: "task_shared",
      attemptId: "att_ready",
      runtime: "codex-cli",
      status: "running",
      sourceKind: "delegated"
    });
  });

  it("should keep sparse verification evidence from becoming promotable or closeout-ready", async () => {
    const verificationResult = await executeAttemptVerification({
      checks: [],
      runner: vi.fn(async () => ({
        exitCode: 0,
        stdout: "",
        stderr: ""
      }))
    });
    const manifest = createManifest({
      attemptId: "att_sparse",
      verification: verificationResult.verification
    });
    const candidate = selection.deriveAttemptPromotionCandidate(
      manifest,
      deriveAttemptVerificationArtifactSummary(verificationResult)
    );
    const promotionDecision = selection.deriveAttemptPromotionDecisionSummary(
      selection.deriveAttemptPromotionExplanationSummary(
        selection.deriveAttemptPromotionReport(
          selection.deriveAttemptPromotionAuditSummary(
            selection.deriveAttemptPromotionResult([candidate])
          )
        )
      )
    );
    const promotionTarget = selection.deriveAttemptPromotionTarget(promotionDecision);
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    expect(candidate.summary.hasComparablePayload).toBe(false);
    expect(candidate.summary.isSelectionReady).toBe(false);
    expect(promotionDecision.blockingReasons).toEqual(["verification_incomplete"]);
    expect(promotionDecision.canPromote).toBe(false);
    expect(promotionTarget).toBeUndefined();
    await expect(
      applyCloseoutDecisionSummary({
        summary: undefined,
        invokeHandoffFinalization
      })
    ).resolves.toBeUndefined();
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should surface canonical request-summary errors when the nested summary is null", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyCloseoutDecisionSummary({
        summary: null as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyCloseoutDecisionSummary({
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
      applyCloseoutDecisionSummary({
        summary: {
          ...createRequestSummary(),
          requests: null
        } as never,
        invokeHandoffFinalization
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyCloseoutDecisionSummary({
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
      applyCloseoutDecisionSummary({
        summary: {
          ...createRequestSummary(),
          requests: [undefined]
        } as never,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyCloseoutDecisionSummary({
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

  it("should surface mixed-task request-summary failures from the closeout decision chain", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyCloseoutDecisionSummary({
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
      applyCloseoutDecisionSummary({
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

  it("should surface duplicate identity request-summary failures from the closeout decision chain", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyCloseoutDecisionSummary({
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
      applyCloseoutDecisionSummary({
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

function createManifest(
  overrides: Partial<{
    attemptId: string;
    runtime: "codex-cli" | "gemini-cli" | "opencode" | "claude-code" | "openclaw";
    sourceKind: "direct" | "resume" | "fork" | "delegated";
    status: "created" | "running" | "paused" | "failed" | "verified" | "merged" | "cleaned";
    taskId: string;
    verification: Awaited<ReturnType<typeof executeAttemptVerification>>["verification"];
  }>
) {
  return {
    adapter: "subprocess",
    attemptId: overrides.attemptId ?? "att_ready",
    runtime: overrides.runtime ?? "codex-cli",
    schemaVersion: "0.x",
    ...(overrides.sourceKind === undefined
      ? {}
      : { sourceKind: overrides.sourceKind }),
    status: overrides.status ?? "created",
    taskId: overrides.taskId ?? "task_shared",
    verification:
      overrides.verification ?? {
        state: "pending",
        checks: []
      },
    createdAt: "2026-04-14T00:00:00.000Z",
    updatedAt: "2026-04-14T00:00:00.000Z",
    worktree: {
      path: "/tmp/agent-worktree/att_ready",
      branch: "attempt/att_ready",
      baseBranch: "main"
    }
  } as const;
}
