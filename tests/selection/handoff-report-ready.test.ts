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

const deriveAttemptHandoffReportReady = (
  selection as Partial<{
    deriveAttemptHandoffReportReady: (input: {
      results: AttemptPromotionTargetApply[];
    }) =>
      | {
          reportBasis: string;
          results: {
            handoffTarget: AttemptPromotionTargetApply["handoffTarget"];
            targetApply: AttemptPromotionTargetApply["targetApply"];
          }[];
          invokedResults: {
            handoffTarget: AttemptPromotionTargetApply["handoffTarget"];
            targetApply: AttemptPromotionTargetApply["targetApply"];
          }[];
          blockedResults: {
            handoffTarget: AttemptPromotionTargetApply["handoffTarget"];
            targetApply: AttemptPromotionTargetApply["targetApply"];
          }[];
        }
      | undefined;
  }>
).deriveAttemptHandoffReportReady as (input:
  | {
      results: AttemptPromotionTargetApply[];
    }
  | undefined) =>
  | {
      reportBasis: string;
      results: {
        handoffTarget: AttemptPromotionTargetApply["handoffTarget"];
        targetApply: AttemptPromotionTargetApply["targetApply"];
      }[];
      invokedResults: {
        handoffTarget: AttemptPromotionTargetApply["handoffTarget"];
        targetApply: AttemptPromotionTargetApply["targetApply"];
      }[];
      blockedResults: {
        handoffTarget: AttemptPromotionTargetApply["handoffTarget"];
        targetApply: AttemptPromotionTargetApply["targetApply"];
      }[];
    }
  | undefined;

describe("selection handoff-report-ready helpers", () => {
  it("should return undefined when the supplied promotion target-apply batch is undefined", () => {
    expect(deriveAttemptHandoffReportReady(undefined)).toBeUndefined();
  });

  it("should fail loudly when the supplied promotion target-apply batch is null", () => {
    expect(() =>
      deriveAttemptHandoffReportReady(
        null as unknown as Parameters<typeof deriveAttemptHandoffReportReady>[0]
      )
    ).toThrow(ValidationError);
  });

  it("should return a stable empty report-ready summary for an empty batch", () => {
    expect(deriveAttemptHandoffReportReady({ results: [] })).toEqual({
      reportBasis: "promotion_target_apply_batch",
      results: [],
      invokedResults: [],
      blockedResults: []
    });
  });

  it("should preserve order and derive invoked and blocked subgroups from batch results", () => {
    const batch = {
      results: [
        createBlockedPromotionTargetApply({
          attemptId: "att_blocked_1",
          runtime: "blocked-cli"
        }),
        createSupportedPromotionTargetApply({
          attemptId: "att_supported_1"
        }),
        createBlockedPromotionTargetApply({
          attemptId: "att_blocked_2",
          runtime: "blocked-cli"
        }),
        createSupportedPromotionTargetApply({
          attemptId: "att_supported_2",
          runtime: "gemini-cli",
          sourceKind: "delegated"
        })
      ]
    };

    expect(deriveAttemptHandoffReportReady(batch)).toEqual({
      reportBasis: "promotion_target_apply_batch",
      results: batch.results,
      invokedResults: [batch.results[1], batch.results[3]],
      blockedResults: [batch.results[0], batch.results[2]]
    });
  });

  it("should canonicalize identity fields when deriving a report-ready summary from an internally consistent batch", () => {
    expect(
      deriveAttemptHandoffReportReady({
        results: [
          createSupportedPromotionTargetApply({
            taskId: "  task_shared  ",
            attemptId: "  att_ready  ",
            runtime: "  codex-cli  "
          })
        ]
      })
    ).toEqual({
      reportBasis: "promotion_target_apply_batch",
      results: [createSupportedPromotionTargetApply()],
      invokedResults: [createSupportedPromotionTargetApply()],
      blockedResults: []
    });
  });

  it("should fail loudly when an invoked entry still carries blocking reasons", () => {
    const batch = {
      results: [
        createPromotionTargetApply({
          attemptId: "att_invalid",
          readiness: {
            blockingReasons: ["handoff_unsupported"],
            canConsumeHandoff: false,
            hasBlockingReasons: true,
            handoffSupported: false
          },
          invoked: true
        })
      ]
    };

    expect(() => deriveAttemptHandoffReportReady(batch)).toThrow(ValidationError);
  });

  it("should fail loudly when consumer and consume readiness drift apart", () => {
    const batch = {
      results: [
        {
          ...createBlockedPromotionTargetApply({
            attemptId: "att_invalid"
          }),
          targetApply: {
            ...createBlockedPromotionTargetApply({
              attemptId: "att_invalid"
            }).targetApply,
            apply: {
              ...createBlockedPromotionTargetApply({
                attemptId: "att_invalid"
              }).targetApply.apply,
              consume: {
                ...createBlockedPromotionTargetApply({
                  attemptId: "att_invalid"
                }).targetApply.apply.consume,
                readiness: createSupportedReadiness()
              }
            }
          }
        }
      ]
    };

    expect(() => deriveAttemptHandoffReportReady(batch)).toThrow(ValidationError);
  });

  it("should fail loudly when batch.results contains a non-object entry", () => {
    expect(() =>
      deriveAttemptHandoffReportReady({
        results: [null] as unknown as AttemptPromotionTargetApply[]
      })
    ).toThrow(
      "Attempt handoff report-ready requires each batch result to be an object."
    );
  });

  it("should fail loudly when entry.handoffTarget.taskId is undefined", () => {
    const invalidEntry = createSupportedPromotionTargetApply();

    invalidEntry.handoffTarget = {
      ...invalidEntry.handoffTarget,
      taskId: undefined as unknown as string
    };
    invalidEntry.targetApply.request = {
      ...invalidEntry.targetApply.request,
      taskId: undefined as unknown as string
    };
    invalidEntry.targetApply.apply.consumer.request = {
      ...invalidEntry.targetApply.apply.consumer.request,
      taskId: undefined as unknown as string
    };
    invalidEntry.targetApply.apply.consume.request = {
      ...invalidEntry.targetApply.apply.consume.request,
      taskId: undefined as unknown as string
    };

    expect(() =>
      deriveAttemptHandoffReportReady({
        results: [invalidEntry]
      })
    ).toThrow(
      "Attempt handoff report-ready requires entry.handoffTarget.taskId to be a non-empty string."
    );
  });

  it("should fail loudly when entry.handoffTarget.taskId is blank", () => {
    const invalidEntry = createSupportedPromotionTargetApply({
      taskId: "   "
    });

    expect(() =>
      deriveAttemptHandoffReportReady({
        results: [invalidEntry]
      })
    ).toThrow(
      "Attempt handoff report-ready requires entry.handoffTarget.taskId to be a non-empty string."
    );
  });

  it("should fail loudly when a request no longer matches the projected handoff target", () => {
    const batch = {
      results: [
        {
          ...createSupportedPromotionTargetApply({
            attemptId: "att_invalid"
          }),
          targetApply: {
            ...createSupportedPromotionTargetApply({
              attemptId: "att_invalid"
            }).targetApply,
            request: {
              ...createSupportedPromotionTargetApply({
                attemptId: "att_invalid"
              }).targetApply.request,
              runtime: "gemini-cli"
            }
          }
        }
      ]
    };

    expect(() => deriveAttemptHandoffReportReady(batch)).toThrow(ValidationError);
  });

  it("should not mutate the supplied batch and should derive fresh arrays and entries", () => {
    const batch = Object.freeze({
      results: [
        createBlockedPromotionTargetApply({
          attemptId: "att_blocked"
        }),
        createSupportedPromotionTargetApply({
          attemptId: "att_supported",
          runtime: "gemini-cli",
          sourceKind: "delegated"
        })
      ]
    });
    const snapshot = structuredClone(batch);

    const report = deriveAttemptHandoffReportReady(batch);

    expect(batch).toEqual(snapshot);
    expect(report).toEqual({
      reportBasis: "promotion_target_apply_batch",
      results: snapshot.results,
      invokedResults: [snapshot.results[1]],
      blockedResults: [snapshot.results[0]]
    });
    expect(report).not.toBeUndefined();
    expect(report?.results).not.toBe(batch.results);
    expect(report?.results[0]).not.toBe(batch.results[0]);
    expect(report?.invokedResults).not.toBe(report?.results);
    expect(report?.blockedResults).not.toBe(report?.results);
  });

  it("should keep the report-ready shape minimal without leaking promotion or runtime metadata", () => {
    const report = deriveAttemptHandoffReportReady({
      results: [
        {
          ...createSupportedPromotionTargetApply(),
          promotionTarget: {
            attemptId: "att_ready"
          },
          report: {
            candidateCount: 1
          },
          decision: {
            canPromote: true
          },
          explanation: {
            code: "selected"
          },
          manifest: {
            attemptId: "att_ready"
          },
          runtimeState: {
            state: "running"
          },
          controlPlane: {
            nodeId: "node_123"
          }
        } as AttemptPromotionTargetApply
      ]
    }) as Record<string, unknown>;

    expect(report).toEqual({
      reportBasis: "promotion_target_apply_batch",
      results: [createSupportedPromotionTargetApply()],
      invokedResults: [createSupportedPromotionTargetApply()],
      blockedResults: []
    });
    expect(report).not.toHaveProperty("summary");
    expect(report).not.toHaveProperty("counts");
    expect(report).not.toHaveProperty("promotionTarget");
    expect(report).not.toHaveProperty("decision");
    expect(report).not.toHaveProperty("explanation");
    expect(report).not.toHaveProperty("report");
    expect(report).not.toHaveProperty("manifest");
    expect(report).not.toHaveProperty("runtimeState");
    expect(report).not.toHaveProperty("controlPlane");
  });

  it("should derive a stable report-ready summary through the canonical promotion-target-apply-batch chain", async () => {
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

    expect(deriveAttemptHandoffReportReady(batch)).toEqual({
      reportBasis: "promotion_target_apply_batch",
      results: [
        createSupportedPromotionTargetApply({
          status: "running",
          sourceKind: "delegated"
        })
      ],
      invokedResults: [
        createSupportedPromotionTargetApply({
          status: "running",
          sourceKind: "delegated"
        })
      ],
      blockedResults: []
    });
  });
});

function createPromotionTargetApply(input?: {
  taskId?: string;
  attemptId?: string;
  runtime?: string;
  status?: AttemptPromotionTarget["status"];
  sourceKind?: AttemptPromotionTarget["sourceKind"];
  readiness?: AttemptHandoffConsumerReadiness;
  invoked?: boolean;
}): AttemptPromotionTargetApply {
  const target = createPromotionTarget({
    ...(input?.taskId === undefined ? {} : { taskId: input.taskId }),
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
    ...(overrides.taskId === undefined ? {} : { taskId: overrides.taskId }),
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
    ...(overrides.taskId === undefined ? {} : { taskId: overrides.taskId }),
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

  const status = record.status as AttemptVerificationCheckStatus;
  const baseCheck = {
    name: record.name,
    required: record.required === true,
    status
  };

  switch (status) {
    case "passed":
      return { ...baseCheck, exitCode: 0 };
    case "failed":
      return { ...baseCheck, exitCode: 1 };
    case "error":
      return { ...baseCheck, failureKind: "timeout" as const };
    default:
      return baseCheck;
  }
}
