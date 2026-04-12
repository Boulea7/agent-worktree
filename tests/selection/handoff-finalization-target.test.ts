import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type { AttemptPromotionTarget } from "../../src/selection/internal.js";
import * as selection from "../../src/selection/internal.js";
import {
  deriveAttemptVerificationArtifactSummary,
  deriveAttemptVerificationSummary,
  type AttemptVerificationCheckStatus
} from "../../src/verification/internal.js";

const deriveAttemptHandoffFinalizationTargetSummary = (
  selection as Partial<{
    deriveAttemptHandoffFinalizationTargetSummary: (
      input:
        | ReturnType<typeof createExplanationSummary>
        | undefined
    ) =>
      | {
          finalizationBasis: string;
          resultCount: number;
          invokedResultCount: number;
          blockedResultCount: number;
          blockingReasons: string[];
          canFinalizeHandoff: boolean;
          targets: Array<Record<string, unknown>>;
        }
      | undefined;
  }>
).deriveAttemptHandoffFinalizationTargetSummary as (
  input: ReturnType<typeof createExplanationSummary> | undefined
) =>
  | {
      finalizationBasis: string;
      resultCount: number;
      invokedResultCount: number;
      blockedResultCount: number;
      blockingReasons: string[];
      canFinalizeHandoff: boolean;
      targets: Array<Record<string, unknown>>;
    }
  | undefined;

describe("selection handoff-finalization-target helpers", () => {
  it("should return undefined when the supplied handoff explanation summary is undefined", () => {
    expect(deriveAttemptHandoffFinalizationTargetSummary(undefined)).toBeUndefined();
  });

  it("should return undefined when handoff finalization is blocked because there are no results", () => {
    expect(
      deriveAttemptHandoffFinalizationTargetSummary(createExplanationSummary([]))
    ).toBeUndefined();
  });

  it("should return undefined when handoff finalization is blocked because all entries are unsupported", () => {
    expect(
      deriveAttemptHandoffFinalizationTargetSummary(
        createExplanationSummary([createBlockedExplanationEntry()])
      )
    ).toBeUndefined();
  });

  it("should derive stable minimal finalization targets from invoked entries in input order", () => {
    expect(
      deriveAttemptHandoffFinalizationTargetSummary(
        createExplanationSummary([
          createBlockedExplanationEntry({
            attemptId: "att_blocked",
            runtime: "claude-code"
          }),
          createInvokedExplanationEntry({
            taskId: "task_shared",
            attemptId: "att_invoked_one",
            runtime: "gemini-cli",
            status: "running",
            sourceKind: "delegated"
          }),
          createInvokedExplanationEntry({
            taskId: "task_shared",
            attemptId: "att_invoked_two",
            runtime: "codex-cli",
            status: "created",
            sourceKind: "fork"
          })
        ])
      )
    ).toEqual({
      finalizationBasis: "handoff_decision_summary",
      resultCount: 3,
      invokedResultCount: 2,
      blockedResultCount: 1,
      blockingReasons: [],
      canFinalizeHandoff: true,
      targets: [
        {
          taskId: "task_shared",
          attemptId: "att_invoked_one",
          runtime: "gemini-cli",
          status: "running",
          sourceKind: "delegated"
        },
        {
          taskId: "task_shared",
          attemptId: "att_invoked_two",
          runtime: "codex-cli",
          status: "created",
          sourceKind: "fork"
        }
      ]
    });
  });

  it("should canonicalize target identity fields when deriving finalization targets from a valid explanation summary", () => {
    expect(
      deriveAttemptHandoffFinalizationTargetSummary(
        createExplanationSummary([
          createInvokedExplanationEntry({
            taskId: "  task_shared  ",
            attemptId: "  att_ready  ",
            runtime: "  codex-cli  "
          })
        ])
      )
    ).toEqual({
      finalizationBasis: "handoff_decision_summary",
      resultCount: 1,
      invokedResultCount: 1,
      blockedResultCount: 0,
      blockingReasons: [],
      canFinalizeHandoff: true,
      targets: [
        {
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "created",
          sourceKind: undefined
        }
      ]
    });
  });

  it("should fail loudly when explanation results mix taskIds after canonicalization", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationTargetSummary(
        createExplanationSummary([
          createInvokedExplanationEntry({
            taskId: "task_shared",
            attemptId: "att_one"
          }),
          createInvokedExplanationEntry({
            taskId: " task_other ",
            attemptId: "att_two"
          })
        ])
      )
    ).toThrow(ValidationError);
  });

  it("should keep the finalization target shape minimal without leaking apply or readiness metadata", () => {
    const summary = deriveAttemptHandoffFinalizationTargetSummary(
      createExplanationSummary([createInvokedExplanationEntry()])
    ) as Record<string, unknown>;

    expect(summary).toEqual({
      finalizationBasis: "handoff_decision_summary",
      resultCount: 1,
      invokedResultCount: 1,
      blockedResultCount: 0,
      blockingReasons: [],
      canFinalizeHandoff: true,
      targets: [
        {
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "created",
          sourceKind: undefined
        }
      ]
    });
    expect(summary).not.toHaveProperty("results");
    expect(summary).not.toHaveProperty("invokedResults");
    expect(summary).not.toHaveProperty("blockedResults");
    expect(summary).not.toHaveProperty("targetApply");
    expect(summary).not.toHaveProperty("consumer");
    expect(summary).not.toHaveProperty("readiness");
  });

  it("should fail closed when subgroup accessors throw instead of silently rebuilding subgroup projections", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationTargetSummary({
        explanationBasis: "handoff_report_ready",
        results: [createInvokedExplanationEntry()],
        get invokedResults() {
          throw new Error("getter boom");
        },
        get blockedResults() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationTargetSummary({
        explanationBasis: "handoff_report_ready",
        results: [createInvokedExplanationEntry()],
        get invokedResults() {
          throw new Error("getter boom");
        },
        get blockedResults() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow(
      "Attempt handoff finalization target summary requires summary to be a readable object."
    );
  });

  it("should fail loudly when invokedResults or blockedResults is omitted", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationTargetSummary({
        explanationBasis: "handoff_report_ready",
        results: [createInvokedExplanationEntry()]
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationTargetSummary({
        explanationBasis: "handoff_report_ready",
        results: [createInvokedExplanationEntry()]
      } as never)
    ).toThrow(
      "Attempt handoff decision summary requires summary.invokedResults to be an array."
    );
  });

  it("should derive a stable finalization target summary through the canonical handoff chain", async () => {
    const promotionTarget = selection.deriveAttemptPromotionTarget(
      selection.deriveAttemptPromotionDecisionSummary(
        selection.deriveAttemptPromotionExplanationSummary(
          selection.deriveAttemptPromotionReport(
            selection.deriveAttemptPromotionAuditSummary(
              selection.deriveAttemptPromotionResult([
                createPromotionCandidate({
                  attemptId: "att_ready",
                  status: "running",
                  runtime: "codex-cli",
                  sourceKind: "delegated",
                  verification: createVerification({
                    state: "passed",
                    checks: [
                      {
                        name: "lint",
                        required: true,
                        status: "passed"
                      }
                    ]
                  })
                })
              ])
            )
          )
        )
      )
    );

    const batch = await selection.applyAttemptPromotionTargetBatch({
      targets: [promotionTarget!],
      invokeHandoff: async () => undefined,
      resolveHandoffCapability: () => true
    });
    const report = selection.deriveAttemptHandoffReportReady(batch);
    const explanation = selection.deriveAttemptHandoffExplanationSummary(report);

    expect(deriveAttemptHandoffFinalizationTargetSummary(explanation)).toEqual({
      finalizationBasis: "handoff_decision_summary",
      resultCount: 1,
      invokedResultCount: 1,
      blockedResultCount: 0,
      blockingReasons: [],
      canFinalizeHandoff: true,
      targets: [
        {
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "running",
          sourceKind: "delegated"
        }
      ]
    });
  });
});

function createExplanationSummary(
  results: Array<
    ReturnType<typeof createInvokedExplanationEntry> |
      ReturnType<typeof createBlockedExplanationEntry>
  >
) {
  return {
    explanationBasis: "handoff_report_ready" as const,
    results,
    invokedResults: results.filter((entry) => entry.invoked),
    blockedResults: results.filter((entry) => !entry.invoked)
  };
}

function createInvokedExplanationEntry(
  overrides: Partial<AttemptPromotionTarget> = {}
) {
  const entry = createSupportedPromotionTargetApply(overrides);

  return {
    handoffTarget: entry.handoffTarget,
    targetApply: entry.targetApply,
    explanationCode: "handoff_invoked" as const,
    invoked: true,
    blockingReasons: [] as string[]
  };
}

function createBlockedExplanationEntry(
  overrides: Partial<AttemptPromotionTarget> = {}
) {
  const entry = createBlockedPromotionTargetApply(overrides);

  return {
    handoffTarget: entry.handoffTarget,
    targetApply: entry.targetApply,
    explanationCode: "handoff_blocked_unsupported" as const,
    invoked: false,
    blockingReasons: ["handoff_unsupported"] as string[]
  };
}

function createPromotionTargetApply(input?: {
  taskId?: string;
  attemptId?: string;
  runtime?: string;
  status?: AttemptPromotionTarget["status"];
  sourceKind?: AttemptPromotionTarget["sourceKind"];
  invoked?: boolean;
}) {
  const target = createPromotionTarget({
    ...(input?.taskId === undefined ? {} : { taskId: input.taskId }),
    ...(input?.attemptId === undefined ? {} : { attemptId: input.attemptId }),
    ...(input?.runtime === undefined ? {} : { runtime: input.runtime }),
    ...(input?.status === undefined ? {} : { status: input.status }),
    ...(input?.sourceKind === undefined
      ? {}
      : { sourceKind: input.sourceKind })
  });
  const invoked = input?.invoked ?? true;
  const readiness = invoked
    ? {
        blockingReasons: [],
        canConsumeHandoff: true,
        hasBlockingReasons: false,
        handoffSupported: true
      }
    : {
        blockingReasons: ["handoff_unsupported"],
        canConsumeHandoff: false,
        hasBlockingReasons: true,
        handoffSupported: false
      };

  return {
    handoffTarget: {
      handoffBasis: "promotion_target" as const,
      taskId: target.taskId,
      attemptId: target.attemptId,
      runtime: target.runtime,
      status: target.status,
      sourceKind: target.sourceKind
    },
    targetApply: {
      request: {
        taskId: target.taskId,
        attemptId: target.attemptId,
        runtime: target.runtime,
        status: target.status,
        sourceKind: target.sourceKind
      },
      apply: {
        consumer: {
          request: {
            taskId: target.taskId,
            attemptId: target.attemptId,
            runtime: target.runtime,
            status: target.status,
            sourceKind: target.sourceKind
          },
          readiness
        },
        consume: {
          request: {
            taskId: target.taskId,
            attemptId: target.attemptId,
            runtime: target.runtime,
            status: target.status,
            sourceKind: target.sourceKind
          },
          readiness,
          invoked
        }
      }
    }
  };
}

function createBlockedPromotionTargetApply(
  overrides: Partial<AttemptPromotionTarget> = {}
) {
  return createPromotionTargetApply({
    ...(overrides.taskId === undefined ? {} : { taskId: overrides.taskId }),
    ...(overrides.attemptId === undefined ? {} : { attemptId: overrides.attemptId }),
    ...(overrides.runtime === undefined ? {} : { runtime: overrides.runtime }),
    ...(overrides.status === undefined ? {} : { status: overrides.status }),
    ...(overrides.sourceKind === undefined
      ? {}
      : { sourceKind: overrides.sourceKind }),
    invoked: false
  });
}

function createSupportedPromotionTargetApply(
  overrides: Partial<AttemptPromotionTarget> = {}
) {
  return createPromotionTargetApply({
    ...(overrides.taskId === undefined ? {} : { taskId: overrides.taskId }),
    ...(overrides.attemptId === undefined ? {} : { attemptId: overrides.attemptId }),
    ...(overrides.runtime === undefined ? {} : { runtime: overrides.runtime }),
    ...(overrides.status === undefined ? {} : { status: overrides.status }),
    ...(overrides.sourceKind === undefined
      ? {}
      : { sourceKind: overrides.sourceKind }),
    invoked: true
  });
}

function createPromotionTarget(
  overrides: Partial<AttemptPromotionTarget> = {}
): AttemptPromotionTarget {
  return {
    targetBasis: "promotion_decision_summary",
    taskId: "task_shared",
    attemptId: "att_ready",
    runtime: "codex-cli",
    status: "created",
    sourceKind: undefined,
    ...overrides
  };
}

function createPromotionCandidate(
  overrides: Parameters<typeof createManifest>[0] & {
    verification?: ReturnType<typeof createVerification>;
  }
) {
  const manifest = createManifest(overrides);
  const artifactSummary = createArtifactSummary(manifest.verification);

  return selection.deriveAttemptPromotionCandidate(manifest, artifactSummary);
}

function createManifest(
  overrides: {
    attemptId: string;
    runtime?: import("../../src/manifest/types.js").AttemptManifest["runtime"];
    sourceKind?: "direct" | "resume" | "fork" | "delegated";
    status?: "created" | "running" | "paused" | "failed" | "verified" | "merged" | "cleaned";
    taskId?: string;
    verification?: ReturnType<typeof createVerification>;
  }
) {
  const { attemptId, runtime, sourceKind, status, taskId, verification } =
    overrides;

  return {
    adapter: "subprocess",
    attemptId,
    runtime: runtime ?? "codex-cli",
    schemaVersion: "0.x",
    ...(sourceKind === undefined ? {} : { sourceKind }),
    status: status ?? "created",
    taskId: taskId ?? "task_shared",
    verification:
      verification ?? {
        state: "verified",
        checks: []
      }
  };
}

function createVerification(input?: {
  state?: string;
  checks?: Array<{
    name: string;
    required: boolean;
    status: AttemptVerificationCheckStatus;
  }>;
}) {
  return {
    state: input?.state ?? "verified",
    checks: input?.checks ?? []
  };
}

function createArtifactSummary(
  verification: ReturnType<typeof createVerification>
) {
  return deriveAttemptVerificationArtifactSummary({
    checks: verification.checks.map((check) => ({
      name: check.name,
      required: check.required,
      status: check.status,
      command: `${check.name} --run`,
      exitCode: check.status === "passed" ? 0 : 1,
      durationMs: 1
    })),
    verification,
    summary: deriveAttemptVerificationSummary(verification)
  });
}
