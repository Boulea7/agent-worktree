import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffConsumerReadiness,
  AttemptPromotionCandidate,
  AttemptPromotionTarget,
  AttemptPromotionTargetApply
} from "../../src/selection/internal.js";
import {
  deriveAttemptVerificationArtifactSummary,
  deriveAttemptVerificationSummary
} from "../../src/verification/internal.js";
import type {
  AttemptVerificationArtifactSummary,
  AttemptVerificationCheckStatus,
  AttemptVerificationExecutedCheck,
  AttemptVerificationExecutionResult
} from "../../src/verification/internal.js";

const deriveAttemptHandoffDecisionSummary = (
  selection as Partial<{
    deriveAttemptHandoffDecisionSummary: (input:
      | {
          explanationBasis: string;
          results: ReturnType<typeof createExplanationSummary>["results"];
          invokedResults: ReturnType<typeof createExplanationSummary>["invokedResults"];
          blockedResults: ReturnType<typeof createExplanationSummary>["blockedResults"];
        }
      | undefined) =>
      | {
          decisionBasis: string;
          resultCount: number;
          invokedResultCount: number;
          blockedResultCount: number;
          blockingReasons: string[];
          canFinalizeHandoff: boolean;
          hasBlockingReasons: boolean;
        }
      | undefined;
  }>
).deriveAttemptHandoffDecisionSummary as (input:
  | {
      explanationBasis: string;
      results: ReturnType<typeof createExplanationSummary>["results"];
      invokedResults: ReturnType<typeof createExplanationSummary>["invokedResults"];
      blockedResults: ReturnType<typeof createExplanationSummary>["blockedResults"];
    }
  | undefined) =>
  | {
      decisionBasis: string;
      resultCount: number;
      invokedResultCount: number;
      blockedResultCount: number;
      blockingReasons: string[];
      canFinalizeHandoff: boolean;
      hasBlockingReasons: boolean;
    }
  | undefined;

describe("selection handoff-decision helpers", () => {
  it("should return undefined when the supplied handoff explanation summary is undefined", () => {
    expect(deriveAttemptHandoffDecisionSummary(undefined)).toBeUndefined();
  });

  it("should derive a stable no-results decision summary", () => {
    expect(
      deriveAttemptHandoffDecisionSummary(createExplanationSummary([]))
    ).toEqual({
      decisionBasis: "handoff_explanation_summary",
      resultCount: 0,
      invokedResultCount: 0,
      blockedResultCount: 0,
      blockingReasons: ["no_results"],
      canFinalizeHandoff: false,
      hasBlockingReasons: true
    });
  });

  it("should derive a blocked decision summary when all entries are unsupported", () => {
    expect(
      deriveAttemptHandoffDecisionSummary(
        createExplanationSummary([createBlockedExplanationEntry()])
      )
    ).toEqual({
      decisionBasis: "handoff_explanation_summary",
      resultCount: 1,
      invokedResultCount: 0,
      blockedResultCount: 1,
      blockingReasons: ["handoff_unsupported"],
      canFinalizeHandoff: false,
      hasBlockingReasons: true
    });
  });

  it("should derive a finalize-ready decision summary when any entry was invoked", () => {
    expect(
      deriveAttemptHandoffDecisionSummary(
        createExplanationSummary([
          createBlockedExplanationEntry({
            attemptId: "att_blocked"
          }),
          createInvokedExplanationEntry({
            attemptId: "att_invoked",
            runtime: "gemini-cli",
            sourceKind: "delegated"
          })
        ])
      )
    ).toEqual({
      decisionBasis: "handoff_explanation_summary",
      resultCount: 2,
      invokedResultCount: 1,
      blockedResultCount: 1,
      blockingReasons: [],
      canFinalizeHandoff: true,
      hasBlockingReasons: false
    });
  });

  it("should fail loudly when explanation subgroup projections drift from canonical results", () => {
    const blocked = createBlockedExplanationEntry({
      attemptId: "att_blocked"
    });
    const summary = {
      ...createExplanationSummary([blocked]),
      blockedResults: []
    };

    expect(() => deriveAttemptHandoffDecisionSummary(summary)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when explanationBasis is invalid", () => {
    const summary = {
      ...createExplanationSummary([]),
      explanationBasis: "unexpected_basis"
    };

    expect(() => deriveAttemptHandoffDecisionSummary(summary)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when a subgroup request drifts from the canonical explanation projection", () => {
    const invoked = createInvokedExplanationEntry({
      attemptId: "att_invoked"
    });
    const summary = {
      ...createExplanationSummary([invoked]),
      invokedResults: [
        {
          ...invoked,
          targetApply: {
            ...invoked.targetApply,
            apply: {
              ...invoked.targetApply.apply,
              consume: {
                ...invoked.targetApply.apply.consume,
                request: {
                  ...invoked.targetApply.apply.consume.request,
                  runtime: "gemini-cli"
                }
              }
            }
          }
        }
      ]
    };

    expect(() => deriveAttemptHandoffDecisionSummary(summary)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when explanation codes drift from canonical derivation", () => {
    const blocked = createBlockedExplanationEntry({
      attemptId: "att_blocked"
    });
    const summary = createExplanationSummary([
      {
        ...blocked,
        explanationCode: "handoff_invoked"
      }
    ]);

    expect(() => deriveAttemptHandoffDecisionSummary(summary)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when blocking reasons drift from canonical explanation semantics", () => {
    const invoked = createInvokedExplanationEntry({
      attemptId: "att_invoked"
    });
    const summary = createExplanationSummary([
      {
        ...invoked,
        blockingReasons: ["handoff_unsupported"]
      }
    ]);

    expect(() => deriveAttemptHandoffDecisionSummary(summary)).toThrow(
      ValidationError
    );
  });

  it("should not mutate the supplied explanation summary and should derive fresh blocker arrays", () => {
    const summary = Object.freeze(
      createExplanationSummary([
        createBlockedExplanationEntry({
          attemptId: "att_blocked"
        })
      ])
    );
    const snapshot = structuredClone(summary);

    const decision = deriveAttemptHandoffDecisionSummary(summary);

    expect(summary).toEqual(snapshot);
    expect(decision).toEqual({
      decisionBasis: "handoff_explanation_summary",
      resultCount: 1,
      invokedResultCount: 0,
      blockedResultCount: 1,
      blockingReasons: ["handoff_unsupported"],
      canFinalizeHandoff: false,
      hasBlockingReasons: true
    });
    expect(decision).not.toBeUndefined();
    expect(decision?.blockingReasons).not.toBe(summary.results[0]?.blockingReasons);
  });

  it("should keep the decision shape minimal without leaking explanation entry collections or runtime metadata", () => {
    const summary = deriveAttemptHandoffDecisionSummary(
      createExplanationSummary([createInvokedExplanationEntry()])
    ) as Record<string, unknown>;

    expect(summary).toEqual({
      decisionBasis: "handoff_explanation_summary",
      resultCount: 1,
      invokedResultCount: 1,
      blockedResultCount: 0,
      blockingReasons: [],
      canFinalizeHandoff: true,
      hasBlockingReasons: false
    });
    expect(summary).not.toHaveProperty("results");
    expect(summary).not.toHaveProperty("invokedResults");
    expect(summary).not.toHaveProperty("blockedResults");
    expect(summary).not.toHaveProperty("selected");
    expect(summary).not.toHaveProperty("summary");
    expect(summary).not.toHaveProperty("manifest");
    expect(summary).not.toHaveProperty("runtimeState");
  });

  it("should derive a stable decision summary through the canonical handoff-explanation chain", async () => {
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

    expect(deriveAttemptHandoffDecisionSummary(explanation)).toEqual({
      decisionBasis: "handoff_explanation_summary",
      resultCount: 1,
      invokedResultCount: 1,
      blockedResultCount: 0,
      blockingReasons: [],
      canFinalizeHandoff: true,
      hasBlockingReasons: false
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
    explanationBasis: "handoff_report_ready",
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
  attemptId?: string;
  runtime?: string;
  status?: AttemptPromotionTarget["status"];
  sourceKind?: AttemptPromotionTarget["sourceKind"];
  readiness?: AttemptHandoffConsumerReadiness;
  invoked?: boolean;
}): AttemptPromotionTargetApply {
  const target = createPromotionTarget({
    ...(input?.attemptId === undefined ? {} : { attemptId: input.attemptId }),
    ...(input?.runtime === undefined ? {} : { runtime: input.runtime }),
    ...(input?.status === undefined ? {} : { status: input.status }),
    ...(input?.sourceKind === undefined
      ? {}
      : { sourceKind: input.sourceKind })
  });
  const readiness = input?.readiness ?? createSupportedReadiness();
  const invoked = input?.invoked ?? true;

  return {
    handoffTarget: {
      handoffBasis: "promotion_target",
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
): AttemptPromotionTargetApply {
  return createPromotionTargetApply({
    ...(overrides.attemptId === undefined ? {} : { attemptId: overrides.attemptId }),
    ...(overrides.runtime === undefined ? {} : { runtime: overrides.runtime }),
    ...(overrides.status === undefined ? {} : { status: overrides.status }),
    ...(overrides.sourceKind === undefined
      ? {}
      : { sourceKind: overrides.sourceKind }),
    readiness: createBlockedReadiness(),
    invoked: false
  });
}

function createSupportedPromotionTargetApply(
  overrides: Partial<AttemptPromotionTarget> = {}
): AttemptPromotionTargetApply {
  return createPromotionTargetApply({
    ...(overrides.attemptId === undefined ? {} : { attemptId: overrides.attemptId }),
    ...(overrides.runtime === undefined ? {} : { runtime: overrides.runtime }),
    ...(overrides.status === undefined ? {} : { status: overrides.status }),
    ...(overrides.sourceKind === undefined
      ? {}
      : { sourceKind: overrides.sourceKind }),
    readiness: createSupportedReadiness(),
    invoked: true
  });
}

function createBlockedReadiness(): AttemptHandoffConsumerReadiness {
  return {
    blockingReasons: ["handoff_unsupported"],
    canConsumeHandoff: false,
    hasBlockingReasons: true,
    handoffSupported: false
  };
}

function createSupportedReadiness(): AttemptHandoffConsumerReadiness {
  return {
    blockingReasons: [],
    canConsumeHandoff: true,
    hasBlockingReasons: false,
    handoffSupported: true
  };
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
  overrides: Partial<AttemptManifest> & Pick<AttemptManifest, "attemptId"> & {
    verification?: AttemptVerification;
  }
): AttemptPromotionCandidate {
  const manifest = createManifest(overrides);
  const artifactSummary = createArtifactSummary(manifest.verification);

  return selection.deriveAttemptPromotionCandidate(manifest, artifactSummary);
}

function createManifest(
  overrides: Partial<AttemptManifest> & Pick<AttemptManifest, "attemptId">
): AttemptManifest {
  const {
    attemptId,
    sourceKind,
    status,
    verification,
    runtime,
    taskId,
    ...rest
  } = overrides;

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
      },
    ...rest
  };
}

function createVerification(input: {
  state: string;
  checks: readonly {
    name: string;
    required?: boolean;
    status: AttemptVerificationCheckStatus;
  }[];
}): AttemptVerification {
  return {
    state: input.state,
    checks: input.checks.map((check) => ({
      name: check.name,
      required: check.required,
      status: check.status
    }))
  };
}

function createArtifactSummary(
  verification: AttemptVerification
): AttemptVerificationArtifactSummary {
  const result = createExecutionResult(verification);

  return deriveAttemptVerificationArtifactSummary(result);
}

function createExecutionResult(
  verification: AttemptVerification
): AttemptVerificationExecutionResult {
  const checks = verification.checks.map((check, index) =>
    createExecutedCheckFromVerificationCheck(check, index)
  );

  return {
    checks,
    verification,
    summary: deriveAttemptVerificationSummary(verification)
  };
}

function createExecutedCheckFromVerificationCheck(
  check: unknown,
  index: number
): AttemptVerificationExecutedCheck {
  if (typeof check !== "object" || check === null || Array.isArray(check)) {
    throw new Error(`Expected verification check ${index} to be an object.`);
  }

  const record = check as {
    name?: unknown;
    required?: unknown;
    status?: unknown;
  };

  if (typeof record.name !== "string") {
    throw new Error(`Expected verification check ${index} to use a string name.`);
  }

  if (typeof record.status !== "string") {
    throw new Error(
      `Expected verification check ${index} to use a string status.`
    );
  }

  return {
    name: record.name,
    required: record.required === true,
    status: record.status as AttemptVerificationCheckStatus
  };
}
