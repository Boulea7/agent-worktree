import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffConsumerBlockingReason,
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

const deriveAttemptHandoffExplanationSummary = (
  selection as Partial<{
    deriveAttemptHandoffExplanationSummary: (input:
      | {
          reportBasis: string;
          results: AttemptPromotionTargetApply[];
          invokedResults: AttemptPromotionTargetApply[];
          blockedResults: AttemptPromotionTargetApply[];
        }
      | undefined) =>
      | {
          explanationBasis: string;
          results: {
            handoffTarget: AttemptPromotionTargetApply["handoffTarget"];
            targetApply: AttemptPromotionTargetApply["targetApply"];
            explanationCode: string;
            invoked: boolean;
            blockingReasons: AttemptHandoffConsumerBlockingReason[];
          }[];
          invokedResults: {
            handoffTarget: AttemptPromotionTargetApply["handoffTarget"];
            targetApply: AttemptPromotionTargetApply["targetApply"];
            explanationCode: string;
            invoked: boolean;
            blockingReasons: AttemptHandoffConsumerBlockingReason[];
          }[];
          blockedResults: {
            handoffTarget: AttemptPromotionTargetApply["handoffTarget"];
            targetApply: AttemptPromotionTargetApply["targetApply"];
            explanationCode: string;
            invoked: boolean;
            blockingReasons: AttemptHandoffConsumerBlockingReason[];
          }[];
        }
      | undefined;
  }>
).deriveAttemptHandoffExplanationSummary as (input:
  | {
      reportBasis: string;
      results: AttemptPromotionTargetApply[];
      invokedResults: AttemptPromotionTargetApply[];
      blockedResults: AttemptPromotionTargetApply[];
    }
  | undefined) =>
  | {
      explanationBasis: string;
      results: {
        handoffTarget: AttemptPromotionTargetApply["handoffTarget"];
        targetApply: AttemptPromotionTargetApply["targetApply"];
        explanationCode: string;
        invoked: boolean;
        blockingReasons: AttemptHandoffConsumerBlockingReason[];
      }[];
      invokedResults: {
        handoffTarget: AttemptPromotionTargetApply["handoffTarget"];
        targetApply: AttemptPromotionTargetApply["targetApply"];
        explanationCode: string;
        invoked: boolean;
        blockingReasons: AttemptHandoffConsumerBlockingReason[];
      }[];
      blockedResults: {
        handoffTarget: AttemptPromotionTargetApply["handoffTarget"];
        targetApply: AttemptPromotionTargetApply["targetApply"];
        explanationCode: string;
        invoked: boolean;
        blockingReasons: AttemptHandoffConsumerBlockingReason[];
      }[];
    }
  | undefined;

describe("selection handoff-explanation helpers", () => {
  it("should return undefined when the supplied handoff report-ready summary is undefined", () => {
    expect(deriveAttemptHandoffExplanationSummary(undefined)).toBeUndefined();
  });

  it("should fail loudly when the supplied handoff report-ready summary is null", () => {
    expect(() =>
      deriveAttemptHandoffExplanationSummary(
        null as unknown as Parameters<typeof deriveAttemptHandoffExplanationSummary>[0]
      )
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffExplanationSummary(
        null as unknown as Parameters<typeof deriveAttemptHandoffExplanationSummary>[0]
      )
    ).toThrow(
      "Attempt handoff explanation summary requires report to be an object."
    );
  });

  it("should derive a stable invoked explanation entry", () => {
    expect(
      deriveAttemptHandoffExplanationSummary(
        createReport([createSupportedPromotionTargetApply()])
      )
    ).toEqual({
      explanationBasis: "handoff_report_ready",
      results: [
        {
          handoffTarget: createSupportedPromotionTargetApply().handoffTarget,
          targetApply: createSupportedPromotionTargetApply().targetApply,
          explanationCode: "handoff_invoked",
          invoked: true,
          blockingReasons: []
        }
      ],
      invokedResults: [
        {
          handoffTarget: createSupportedPromotionTargetApply().handoffTarget,
          targetApply: createSupportedPromotionTargetApply().targetApply,
          explanationCode: "handoff_invoked",
          invoked: true,
          blockingReasons: []
        }
      ],
      blockedResults: []
    });
  });

  it("should derive a stable blocked explanation entry", () => {
    expect(
      deriveAttemptHandoffExplanationSummary(
        createReport([createBlockedPromotionTargetApply()])
      )
    ).toEqual({
      explanationBasis: "handoff_report_ready",
      results: [
        {
          handoffTarget: createBlockedPromotionTargetApply().handoffTarget,
          targetApply: createBlockedPromotionTargetApply().targetApply,
          explanationCode: "handoff_blocked_unsupported",
          invoked: false,
          blockingReasons: ["handoff_unsupported"]
        }
      ],
      invokedResults: [],
      blockedResults: [
        {
          handoffTarget: createBlockedPromotionTargetApply().handoffTarget,
          targetApply: createBlockedPromotionTargetApply().targetApply,
          explanationCode: "handoff_blocked_unsupported",
          invoked: false,
          blockingReasons: ["handoff_unsupported"]
        }
      ]
    });
  });

  it("should canonicalize identity fields when deriving an explanation summary from an internally consistent report", () => {
    expect(
      deriveAttemptHandoffExplanationSummary(
        createReport([
          createSupportedPromotionTargetApply({
            taskId: "  task_shared  ",
            attemptId: "  att_ready  ",
            runtime: "  codex-cli  "
          })
        ])
      )
    ).toEqual({
      explanationBasis: "handoff_report_ready",
      results: [createInvokedExplanationEntry()],
      invokedResults: [createInvokedExplanationEntry()],
      blockedResults: []
    });
  });

  it("should preserve order and derive invoked and blocked subgroups from report results", () => {
    const report = createReport([
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
    ]);

    expect(deriveAttemptHandoffExplanationSummary(report)).toEqual({
      explanationBasis: "handoff_report_ready",
      results: [
        createBlockedExplanationEntry({
          attemptId: "att_blocked_1",
          runtime: "blocked-cli"
        }),
        createInvokedExplanationEntry({
          attemptId: "att_supported_1"
        }),
        createBlockedExplanationEntry({
          attemptId: "att_blocked_2",
          runtime: "blocked-cli"
        }),
        createInvokedExplanationEntry({
          attemptId: "att_supported_2",
          runtime: "gemini-cli",
          sourceKind: "delegated"
        })
      ],
      invokedResults: [
        createInvokedExplanationEntry({
          attemptId: "att_supported_1"
        }),
        createInvokedExplanationEntry({
          attemptId: "att_supported_2",
          runtime: "gemini-cli",
          sourceKind: "delegated"
        })
      ],
      blockedResults: [
        createBlockedExplanationEntry({
          attemptId: "att_blocked_1",
          runtime: "blocked-cli"
        }),
        createBlockedExplanationEntry({
          attemptId: "att_blocked_2",
          runtime: "blocked-cli"
        })
      ]
    });
  });

  it("should fail loudly when report subgroup projections drift from canonical results", () => {
    const blocked = createBlockedPromotionTargetApply({
      attemptId: "att_blocked"
    });
    const report = {
      ...createReport([blocked]),
      blockedResults: []
    };

    expect(() => deriveAttemptHandoffExplanationSummary(report)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when report.invokedResults contains a non-object entry", () => {
    expect(() =>
      deriveAttemptHandoffExplanationSummary({
        ...createReport([createSupportedPromotionTargetApply()]),
        invokedResults: [null] as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffExplanationSummary({
        ...createReport([createSupportedPromotionTargetApply()]),
        invokedResults: [null] as never
      })
    ).toThrow(
      "Attempt handoff explanation summary requires report.invokedResults entries to be objects."
    );
  });

  it("should fail loudly when report.invokedResults is not an array", () => {
    expect(() =>
      deriveAttemptHandoffExplanationSummary({
        ...createReport([createSupportedPromotionTargetApply()]),
        invokedResults: null as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffExplanationSummary({
        ...createReport([createSupportedPromotionTargetApply()]),
        invokedResults: null as never
      })
    ).toThrow(
      "Attempt handoff explanation summary requires report.invokedResults to be an array."
    );
  });

  it("should fail loudly when report.invokedResults contains a malformed object entry", () => {
    expect(() =>
      deriveAttemptHandoffExplanationSummary({
        ...createReport([createSupportedPromotionTargetApply()]),
        invokedResults: [{}] as never
      })
    ).toThrow(ValidationError);
  });

  it("should fail loudly when report.blockedResults contains a sparse entry", () => {
    const blockedResults = [] as unknown[];
    blockedResults[1] = createBlockedPromotionTargetApply();

    expect(() =>
      deriveAttemptHandoffExplanationSummary({
        ...createReport([createBlockedPromotionTargetApply()]),
        blockedResults: blockedResults as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffExplanationSummary({
        ...createReport([createBlockedPromotionTargetApply()]),
        blockedResults: blockedResults as never
      })
    ).toThrow(
      "Attempt handoff explanation summary requires report.blockedResults entries to be objects."
    );
  });

  it("should fail loudly when report.blockedResults contains a malformed object entry", () => {
    expect(() =>
      deriveAttemptHandoffExplanationSummary({
        ...createReport([createBlockedPromotionTargetApply()]),
        blockedResults: [{}] as never
      })
    ).toThrow(ValidationError);
  });

  it("should fail loudly when a subgroup entry request drifts from the canonical report projection", () => {
    const invoked = createSupportedPromotionTargetApply({
      attemptId: "att_supported"
    });
    const report = {
      ...createReport([invoked]),
      invokedResults: [
        {
          ...invoked,
          targetApply: {
            ...invoked.targetApply,
            apply: {
              ...invoked.targetApply.apply,
              consumer: {
                ...invoked.targetApply.apply.consumer,
                request: {
                  ...invoked.targetApply.apply.consumer.request,
                  runtime: "gemini-cli"
                }
              }
            }
          }
        }
      ]
    };

    expect(() => deriveAttemptHandoffExplanationSummary(report)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when an invoked entry still carries blocking reasons", () => {
    const report = createReport([
      createPromotionTargetApply({
        attemptId: "att_invalid",
        readiness: createBlockedReadiness(),
        invoked: true
      })
    ]);

    expect(() => deriveAttemptHandoffExplanationSummary(report)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when a blocked entry no longer has blocking reasons", () => {
    const report = createReport([
      createPromotionTargetApply({
        attemptId: "att_invalid",
        readiness: createSupportedReadiness(),
        invoked: false
      })
    ]);

    expect(() => deriveAttemptHandoffExplanationSummary(report)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when consumer and consume blocking reasons drift apart", () => {
    const supported = createSupportedPromotionTargetApply({
      attemptId: "att_invalid"
    });
    const report = createReport([
      {
        ...supported,
        targetApply: {
          ...supported.targetApply,
          apply: {
            ...supported.targetApply.apply,
            consume: {
              ...supported.targetApply.apply.consume,
              readiness: createBlockedReadiness()
            }
          }
        }
      }
    ]);

    expect(() => deriveAttemptHandoffExplanationSummary(report)).toThrow(
      ValidationError
    );
  });

  it("should not mutate the supplied report and should derive fresh arrays and entries", () => {
    const report = Object.freeze(
      createReport([
        createBlockedPromotionTargetApply({
          attemptId: "att_blocked"
        }),
        createSupportedPromotionTargetApply({
          attemptId: "att_supported",
          runtime: "gemini-cli",
          sourceKind: "delegated"
        })
      ])
    );
    const snapshot = structuredClone(report);

    const summary = deriveAttemptHandoffExplanationSummary(report);

    expect(report).toEqual(snapshot);
    expect(summary).toEqual({
      explanationBasis: "handoff_report_ready",
      results: [
        createBlockedExplanationEntry({
          attemptId: "att_blocked"
        }),
        createInvokedExplanationEntry({
          attemptId: "att_supported",
          runtime: "gemini-cli",
          sourceKind: "delegated"
        })
      ],
      invokedResults: [
        createInvokedExplanationEntry({
          attemptId: "att_supported",
          runtime: "gemini-cli",
          sourceKind: "delegated"
        })
      ],
      blockedResults: [
        createBlockedExplanationEntry({
          attemptId: "att_blocked"
        })
      ]
    });
    expect(summary).not.toBeUndefined();
    expect(summary?.results).not.toBe(report.results);
    expect(summary?.results[0]).not.toBe(report.results[0]);
    expect(summary?.invokedResults).not.toBe(summary?.results);
    expect(summary?.blockedResults).not.toBe(summary?.results);
  });

  it("should keep the explanation shape minimal without leaking summary text or runtime metadata", () => {
    const supported = createSupportedPromotionTargetApply();
    const summary = deriveAttemptHandoffExplanationSummary({
      reportBasis: "promotion_target_apply_batch",
      results: [
        {
          ...supported,
          report: {
            candidateCount: 1
          },
          decision: {
            canFinalizeHandoff: true
          },
          explanation: {
            text: "do not leak"
          },
          manifest: {
            attemptId: "att_ready"
          },
          runtimeState: {
            state: "running"
          }
        } as AttemptPromotionTargetApply
      ],
      invokedResults: [supported],
      blockedResults: []
    }) as Record<string, unknown>;

    expect(summary).toEqual({
      explanationBasis: "handoff_report_ready",
      results: [createInvokedExplanationEntry()],
      invokedResults: [createInvokedExplanationEntry()],
      blockedResults: []
    });
    expect(summary).not.toHaveProperty("summary");
    expect(summary).not.toHaveProperty("summaryText");
    expect(summary).not.toHaveProperty("report");
    expect(summary).not.toHaveProperty("decision");
    expect(summary).not.toHaveProperty("manifest");
    expect(summary).not.toHaveProperty("runtimeState");
  });

  it("should derive a stable explanation summary through the canonical handoff-report-ready chain", async () => {
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

    expect(deriveAttemptHandoffExplanationSummary(report)).toEqual({
      explanationBasis: "handoff_report_ready",
      results: [
        createInvokedExplanationEntry({
          status: "running",
          sourceKind: "delegated"
        })
      ],
      invokedResults: [
        createInvokedExplanationEntry({
          status: "running",
          sourceKind: "delegated"
        })
      ],
      blockedResults: []
    });
  });
});

function createReport(results: AttemptPromotionTargetApply[]) {
  return {
    reportBasis: "promotion_target_apply_batch",
    results,
    invokedResults: results.filter((entry) => entry.targetApply.apply.consume.invoked),
    blockedResults: results.filter(
      (entry) => !entry.targetApply.apply.consume.invoked
    )
  };
}

function createInvokedExplanationEntry(
  overrides: Partial<AttemptPromotionTarget> = {}
) {
  const entry = createSupportedPromotionTargetApply(overrides);

  return {
    handoffTarget: entry.handoffTarget,
    targetApply: entry.targetApply,
    explanationCode: "handoff_invoked",
    invoked: true,
    blockingReasons: []
  };
}

function createBlockedExplanationEntry(
  overrides: Partial<AttemptPromotionTarget> = {}
) {
  const entry = createBlockedPromotionTargetApply(overrides);

  return {
    handoffTarget: entry.handoffTarget,
    targetApply: entry.targetApply,
    explanationCode: "handoff_blocked_unsupported",
    invoked: false,
    blockingReasons: ["handoff_unsupported"]
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
