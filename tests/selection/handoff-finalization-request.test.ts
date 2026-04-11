import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";
import {
  deriveAttemptVerificationArtifactSummary,
  deriveAttemptVerificationSummary,
  type AttemptVerificationCheckStatus
} from "../../src/verification/internal.js";

const deriveAttemptHandoffFinalizationRequestSummary = (
  selection as Partial<{
    deriveAttemptHandoffFinalizationRequestSummary: (
      input: ReturnType<typeof createFinalizationTargetSummary> | undefined
    ) =>
      | {
          requestBasis: string;
          resultCount: number;
          invokedResultCount: number;
          blockedResultCount: number;
          blockingReasons: string[];
          canFinalizeHandoff: boolean;
          requests: Array<Record<string, unknown>>;
        }
      | undefined;
  }>
).deriveAttemptHandoffFinalizationRequestSummary as (
  input: ReturnType<typeof createFinalizationTargetSummary> | undefined
) =>
  | {
      requestBasis: string;
      resultCount: number;
      invokedResultCount: number;
      blockedResultCount: number;
      blockingReasons: string[];
      canFinalizeHandoff: boolean;
      requests: Array<Record<string, unknown>>;
    }
  | undefined;

describe("selection handoff-finalization-request helpers", () => {
  it("should return undefined when the supplied finalization target summary is undefined", () => {
    expect(deriveAttemptHandoffFinalizationRequestSummary(undefined)).toBeUndefined();
  });

  it("should fail loudly when the supplied finalization target summary is null", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary(
        null as unknown as Parameters<
          typeof deriveAttemptHandoffFinalizationRequestSummary
        >[0]
      )
    ).toThrow(ValidationError);
  });

  it("should return undefined when the supplied blocked finalization target summary is valid", () => {
    expect(
      deriveAttemptHandoffFinalizationRequestSummary(createFinalizationTargetSummary([]))
    ).toBeUndefined();
  });

  it("should fail loudly when a blocked finalization target summary uses an invalid basis", () => {
    const summary = {
      ...createFinalizationTargetSummary([]),
      finalizationBasis: "promotion_report"
    } as unknown as ReturnType<typeof createFinalizationTargetSummary>;

    expect(() => deriveAttemptHandoffFinalizationRequestSummary(summary)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when invokedResultCount does not match targets.length", () => {
    const summary = {
      ...createFinalizationTargetSummary([
        {
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "created",
          sourceKind: undefined
        }
      ]),
      invokedResultCount: 2
    };

    expect(() => deriveAttemptHandoffFinalizationRequestSummary(summary)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when blockedResultCount and resultCount are inconsistent", () => {
    const summary = {
      ...createFinalizationTargetSummary([
        {
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "created",
          sourceKind: undefined
        }
      ]),
      blockedResultCount: 3
    };

    expect(() => deriveAttemptHandoffFinalizationRequestSummary(summary)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when blocked finalization summaries still keep targets", () => {
    const summary = {
      ...createFinalizationTargetSummary([]),
      resultCount: 1,
      blockedResultCount: 1,
      blockingReasons: ["handoff_unsupported"] as string[],
      targets: [
        {
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "created" as const,
          sourceKind: undefined
        }
      ]
    };

    expect(() => deriveAttemptHandoffFinalizationRequestSummary(summary)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when summary.targets is not an array", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary({
        ...createFinalizationTargetSummary([]),
        targets: null,
        resultCount: 1,
        blockedResultCount: 1,
        blockingReasons: ["handoff_unsupported"]
      } as unknown as Parameters<
        typeof deriveAttemptHandoffFinalizationRequestSummary
      >[0])
    ).toThrow(
      "Attempt handoff finalization request summary requires summary.targets to be an array."
    );
  });

  it("should fail loudly when summary.targets contains a non-object entry", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary({
        ...createFinalizationTargetSummary([
          {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          }
        ]),
        targets: [null]
      } as unknown as Parameters<
        typeof deriveAttemptHandoffFinalizationRequestSummary
      >[0])
    ).toThrow(
      "Attempt handoff finalization request summary requires summary.targets entries to be objects."
    );
  });

  it("should fail loudly when summary.targets contains sparse array holes", () => {
    const targets = new Array<
      ReturnType<typeof createFinalizationTargetSummary>["targets"][number]
    >(1);

    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary({
        ...createFinalizationTargetSummary([
          {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          }
        ]),
        targets,
        resultCount: 1,
        invokedResultCount: 1,
        blockedResultCount: 0,
        blockingReasons: []
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary({
        ...createFinalizationTargetSummary([
          {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          }
        ]),
        targets,
        resultCount: 1,
        invokedResultCount: 1,
        blockedResultCount: 0,
        blockingReasons: []
      })
    ).toThrow(
      "Attempt handoff finalization request summary requires summary.targets entries to be objects."
    );
  });

  it("should fail loudly when summary.targets relies on inherited array indexes", () => {
    const targets = new Array<
      ReturnType<typeof createFinalizationTargetSummary>["targets"][number]
    >(1);
    const inheritedTarget = {
      taskId: "task_inherited",
      attemptId: "att_inherited",
      runtime: "codex-cli",
      status: "created" as const,
      sourceKind: undefined
    };

    Object.setPrototypeOf(targets, {
      0: inheritedTarget
    });

    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary({
        ...createFinalizationTargetSummary([
          {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          }
        ]),
        targets,
        resultCount: 1,
        invokedResultCount: 1,
        blockedResultCount: 0,
        blockingReasons: []
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary({
        ...createFinalizationTargetSummary([
          {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          }
        ]),
        targets,
        resultCount: 1,
        invokedResultCount: 1,
        blockedResultCount: 0,
        blockingReasons: []
      })
    ).toThrow(
      "Attempt handoff finalization request summary requires summary.targets entries to be objects."
    );
  });

  it("should fail loudly when summary.targets mixes taskIds after normalization", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary(
        createFinalizationTargetSummary([
          {
            taskId: "task_shared",
            attemptId: "att_a",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          },
          {
            taskId: " task_other ",
            attemptId: "att_b",
            runtime: "gemini-cli",
            status: "running",
            sourceKind: "delegated"
          }
        ])
      )
    ).toThrow(
      "Attempt handoff finalization request summary requires summary.targets from a single taskId."
    );
  });

  it("should fail loudly when summary.targets reuses normalized target identities", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary(
        createFinalizationTargetSummary([
          {
            taskId: "task_shared",
            attemptId: "att_dup",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          },
          {
            taskId: " task_shared ",
            attemptId: " att_dup ",
            runtime: " codex-cli ",
            status: "running",
            sourceKind: "delegated"
          }
        ])
      )
    ).toThrow(
      "Attempt handoff finalization request summary requires summary.targets to use unique (taskId, attemptId, runtime) identities."
    );
  });

  it("should fail loudly when summary.blockingReasons contains sparse array holes", () => {
    const blockingReasons = new Array<string>(1);

    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary({
        ...createFinalizationTargetSummary([]),
        resultCount: 0,
        invokedResultCount: 0,
        blockedResultCount: 0,
        blockingReasons
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary({
        ...createFinalizationTargetSummary([]),
        resultCount: 0,
        invokedResultCount: 0,
        blockedResultCount: 0,
        blockingReasons
      } as never)
    ).toThrow(
      "Attempt handoff finalization request summary requires summary.blockingReasons to use the existing handoff decision blocker vocabulary."
    );
  });

  it("should fail loudly when summary.blockingReasons relies on inherited array indexes", () => {
    const blockingReasons = new Array<string>(1);

    Object.setPrototypeOf(blockingReasons, {
      0: "no_results"
    });

    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary({
        ...createFinalizationTargetSummary([]),
        resultCount: 0,
        invokedResultCount: 0,
        blockedResultCount: 0,
        blockingReasons
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary({
        ...createFinalizationTargetSummary([]),
        resultCount: 0,
        invokedResultCount: 0,
        blockedResultCount: 0,
        blockingReasons
      } as never)
    ).toThrow(
      "Attempt handoff finalization request summary requires summary.blockingReasons to use the existing handoff decision blocker vocabulary."
    );
  });

  it("should fail loudly when target.taskId is undefined", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary(
        createFinalizationTargetSummary([
          {
            taskId: undefined,
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          }
        ])
      )
    ).toThrow(
      "Attempt handoff finalization request summary requires target.taskId to be a non-empty string."
    );
  });

  it("should fail loudly when target.taskId is blank", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary(
        createFinalizationTargetSummary([
          {
            taskId: "   ",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          }
        ])
      )
    ).toThrow(
      "Attempt handoff finalization request summary requires target.taskId to be a non-empty string."
    );
  });

  it("should derive stable minimal requests from single-task finalization targets in input order", () => {
    expect(
      deriveAttemptHandoffFinalizationRequestSummary(
        createFinalizationTargetSummary([
        {
          taskId: "task_shared",
          attemptId: "att_one",
          runtime: "gemini-cli",
          status: "running",
            sourceKind: "delegated"
          },
        {
          taskId: "task_shared",
          attemptId: "att_two",
          runtime: "codex-cli",
          status: "created",
            sourceKind: "fork"
          }
        ])
      )
    ).toEqual({
      requestBasis: "handoff_finalization_target_summary",
      resultCount: 3,
      invokedResultCount: 2,
      blockedResultCount: 1,
      blockingReasons: [],
      canFinalizeHandoff: true,
      requests: [
        {
          taskId: "task_shared",
          attemptId: "att_one",
          runtime: "gemini-cli",
          status: "running",
          sourceKind: "delegated"
        },
        {
          taskId: "task_shared",
          attemptId: "att_two",
          runtime: "codex-cli",
          status: "created",
          sourceKind: "fork"
        }
      ]
    });
  });

  it("should canonicalize request identity fields when deriving finalization requests from valid targets", () => {
    expect(
      deriveAttemptHandoffFinalizationRequestSummary(
        createFinalizationTargetSummary([
          {
            taskId: "  task_shared  ",
            attemptId: "  att_ready  ",
            runtime: "  codex-cli  ",
            status: "created",
            sourceKind: undefined
          }
        ])
      )
    ).toEqual({
      requestBasis: "handoff_finalization_target_summary",
      resultCount: 2,
      invokedResultCount: 1,
      blockedResultCount: 1,
      blockingReasons: [],
      canFinalizeHandoff: true,
      requests: [
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

  it("should keep the finalization request summary minimal without leaking target metadata", () => {
    const summary = deriveAttemptHandoffFinalizationRequestSummary(
      createFinalizationTargetSummary([
        {
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "created",
          sourceKind: undefined
        }
      ])
    ) as Record<string, unknown>;

    expect(summary).toEqual({
      requestBasis: "handoff_finalization_target_summary",
      resultCount: 2,
      invokedResultCount: 1,
      blockedResultCount: 1,
      blockingReasons: [],
      canFinalizeHandoff: true,
      requests: [
        {
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "created",
          sourceKind: undefined
        }
      ]
    });
    expect(summary).not.toHaveProperty("targets");
    expect(summary).not.toHaveProperty("consumer");
    expect(summary).not.toHaveProperty("readiness");
    expect(summary).not.toHaveProperty("apply");
  });

  it("should fail loudly when finalization is ready but there are no targets to project", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationRequestSummary({
        finalizationBasis: "handoff_decision_summary",
        resultCount: 1,
        invokedResultCount: 1,
        blockedResultCount: 0,
        blockingReasons: [],
        canFinalizeHandoff: true,
        targets: []
      })
    ).toThrow(
      "Attempt handoff finalization request summary requires summary.targets to be non-empty when summary.canFinalizeHandoff is true."
    );
  });

  it("should derive a stable request summary through the canonical finalization chain", async () => {
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
    const finalizationSummary =
      selection.deriveAttemptHandoffFinalizationTargetSummary(explanation);

    expect(
      deriveAttemptHandoffFinalizationRequestSummary(finalizationSummary)
    ).toEqual({
      requestBasis: "handoff_finalization_target_summary",
      resultCount: 1,
      invokedResultCount: 1,
      blockedResultCount: 0,
      blockingReasons: [],
      canFinalizeHandoff: true,
      requests: [
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

function createFinalizationTargetSummary(
  targets: Array<{
    taskId: string | undefined;
    attemptId: string;
    runtime: string;
    status: "created" | "running" | "paused" | "failed" | "verified" | "merged" | "cleaned";
    sourceKind: "direct" | "resume" | "fork" | "delegated" | undefined;
  }>
) {
  if (targets.length === 0) {
    return {
      finalizationBasis: "handoff_decision_summary" as const,
      resultCount: 0,
      invokedResultCount: 0,
      blockedResultCount: 0,
      blockingReasons: ["no_results"] as const,
      canFinalizeHandoff: false,
      targets
    };
  }

  return {
    finalizationBasis: "handoff_decision_summary" as const,
    resultCount: targets.length + 1,
    invokedResultCount: targets.length,
    blockedResultCount: 1,
    blockingReasons: [] as string[],
    canFinalizeHandoff: true,
    targets
  };
}

function createPromotionCandidate(
  overrides: Parameters<typeof createManifest>[0] & {
    verification?: ReturnType<typeof createVerification>;
  }
) {
  const manifest = createManifest(overrides);
  const artifactSummary = deriveArtifactSummary(manifest.verification);

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

function deriveArtifactSummary(verification: ReturnType<typeof createVerification>) {
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
