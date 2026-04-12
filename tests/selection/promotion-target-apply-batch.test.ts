import { describe, expect, it, vi } from "vitest";

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
import * as promotionTargetApplyModule from "../../src/selection/promotion-target-apply.js";
import type {
  AttemptVerificationArtifactSummary,
  AttemptVerificationCheckStatus,
  AttemptVerificationExecutedCheck,
  AttemptVerificationExecutionResult
} from "../../src/verification/internal.js";

const applyAttemptPromotionTargetBatch = (
  selection as Partial<{
    applyAttemptPromotionTargetBatch: (input: {
      targets: readonly AttemptPromotionTarget[];
      invokeHandoff: (request: {
        taskId: string | undefined;
        attemptId: string;
        runtime: string;
        status: string;
        sourceKind: string | undefined;
      }) => void | Promise<void>;
      resolveHandoffCapability?: (runtime: string) => boolean;
    }) => Promise<{
      results: AttemptPromotionTargetApply[];
    }>;
  }>
).applyAttemptPromotionTargetBatch as (input: {
  targets: readonly AttemptPromotionTarget[];
  invokeHandoff: (request: {
    taskId: string | undefined;
    attemptId: string;
    runtime: string;
    status: string;
    sourceKind: string | undefined;
  }) => void | Promise<void>;
  resolveHandoffCapability?: (runtime: string) => boolean;
}) => Promise<{
  results: AttemptPromotionTargetApply[];
}>;

describe("selection promotion-target-apply-batch helpers", () => {
  it("should fail closed when the supplied promotion target-apply batch input or callbacks are malformed", async () => {
    await expect(
      applyAttemptPromotionTargetBatch(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptPromotionTargetBatch(undefined as never)
    ).rejects.toThrow(
      "Attempt promotion target apply batch input must be an object."
    );

    await expect(
      applyAttemptPromotionTargetBatch({
        targets: undefined as never,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt promotion target apply batch requires targets to be an array."
    );

    await expect(
      applyAttemptPromotionTargetBatch({
        targets: [],
        invokeHandoff: undefined as never
      })
    ).rejects.toThrow(
      "Attempt promotion target apply batch requires invokeHandoff to be a function."
    );

    await expect(
      applyAttemptPromotionTargetBatch({
        targets: [],
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Attempt promotion target apply batch requires resolveHandoffCapability to be a function when provided."
    );
  });

  it("should fail closed when reading targets throws through an accessor-shaped input", async () => {
    await expect(
      applyAttemptPromotionTargetBatch({
        get targets() {
          throw new Error("getter boom");
        },
        invokeHandoff: async () => undefined
      } as never)
    ).rejects.toThrow(ValidationError);
  });

  it("should return an empty batch result for an empty promotion target list", async () => {
    await expect(
      applyAttemptPromotionTargetBatch({
        targets: [],
        invokeHandoff: async () => {
          throw new Error("empty batches must not invoke handoff");
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should fail loudly when targets from different taskIds are mixed after normalization", async () => {
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptPromotionTargetBatch({
        targets: [
          createPromotionTarget({
            taskId: "task_shared",
            attemptId: "att_a"
          }),
          createPromotionTarget({
            taskId: " task_other ",
            attemptId: "att_b"
          })
        ],
        invokeHandoff: async (request) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).rejects.toThrow(
      "Attempt promotion target apply batch requires targets from a single taskId."
    );
    expect(invokedAttemptIds).toEqual([]);
  });

  it("should fail loudly when targets reuse normalized identities", async () => {
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptPromotionTargetBatch({
        targets: [
          createPromotionTarget({
            taskId: "task_shared",
            attemptId: "att_dup",
            runtime: "codex-cli"
          }),
          createPromotionTarget({
            taskId: " task_shared ",
            attemptId: " att_dup ",
            runtime: " codex-cli "
          })
        ],
        invokeHandoff: async (request) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).rejects.toThrow(
      "Attempt promotion target apply batch requires targets to use unique (taskId, attemptId, runtime) identities."
    );
    expect(invokedAttemptIds).toEqual([]);
  });

  it("should fail before invoking when any target identity field is blank after normalization", async () => {
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptPromotionTargetBatch({
        targets: [
          createPromotionTarget({
            taskId: "task_shared",
            attemptId: "att_valid"
          }),
          {
            ...createPromotionTarget({
              taskId: "task_shared",
              attemptId: "att_invalid"
            }),
            runtime: "   "
          } as AttemptPromotionTarget
        ],
        invokeHandoff: async (request) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).rejects.toThrow(
      "Attempt promotion target apply batch requires targets entries to include non-empty taskId, attemptId, and runtime strings."
    );
    expect(invokedAttemptIds).toEqual([]);
  });

  it("should preserve input order and continue past blocked targets", async () => {
    const targets = [
      createPromotionTarget({
        attemptId: "att_blocked_1",
        runtime: "blocked-cli"
      }),
      createPromotionTarget({
        attemptId: "att_supported_1"
      }),
      createPromotionTarget({
        attemptId: "att_blocked_2",
        runtime: "blocked-cli"
      }),
      createPromotionTarget({
        attemptId: "att_supported_2",
        runtime: "gemini-cli",
        sourceKind: "delegated"
      })
    ] satisfies AttemptPromotionTarget[];
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptPromotionTargetBatch({
        targets,
        invokeHandoff: async (request) => {
          invokedAttemptIds.push(request.attemptId);
        },
        resolveHandoffCapability: (runtime: string) => runtime !== "blocked-cli"
      })
    ).resolves.toEqual({
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
    });
    expect(invokedAttemptIds).toEqual(["att_supported_1", "att_supported_2"]);
  });

  it("should not invoke handoff for blocked batch entries", async () => {
    const targets = [
      createPromotionTarget({
        attemptId: "att_blocked_1"
      }),
      createPromotionTarget({
        attemptId: "att_blocked_2",
        runtime: "gemini-cli"
      })
    ] satisfies AttemptPromotionTarget[];
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptPromotionTargetBatch({
        targets,
        invokeHandoff: async (request) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).resolves.toEqual({
      results: [
        createBlockedPromotionTargetApply({
          attemptId: "att_blocked_1"
        }),
        createBlockedPromotionTargetApply({
          attemptId: "att_blocked_2",
          runtime: "gemini-cli"
        })
      ]
    });
    expect(invokedAttemptIds).toEqual([]);
  });

  it("should fail fast on the first supported invoker error and stop later supported targets", async () => {
    const expectedError = new Error("handoff failed");
    const targets = [
      createPromotionTarget({
        attemptId: "att_supported_1"
      }),
      createPromotionTarget({
        attemptId: "att_supported_2",
        runtime: "gemini-cli"
      }),
      createPromotionTarget({
        attemptId: "att_supported_3",
        sourceKind: "delegated"
      })
    ] satisfies AttemptPromotionTarget[];
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptPromotionTargetBatch({
        targets,
        invokeHandoff: async (request) => {
          invokedAttemptIds.push(request.attemptId);

          if (request.attemptId === "att_supported_2") {
            throw expectedError;
          }
        },
        resolveHandoffCapability: () => true
      })
    ).rejects.toThrow(expectedError);
    expect(invokedAttemptIds).toEqual(["att_supported_1", "att_supported_2"]);
  });

  it("should fail loudly when a batch promotion target is invalid", async () => {
    const targets = [
      {
        ...createPromotionTarget(),
        targetBasis: "unexpected_basis"
      }
    ] as unknown as readonly AttemptPromotionTarget[];

    await expect(
      applyAttemptPromotionTargetBatch({
        targets,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptPromotionTargetBatch({
        targets,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      'Attempt handoff target requires target.targetBasis to be "promotion_decision_summary".'
    );
  });

  it("should fail loudly when a batch promotion target entry is not an object before deriving a promotion target-apply result", async () => {
    const targets = [undefined] as unknown as readonly AttemptPromotionTarget[];

    await expect(
      applyAttemptPromotionTargetBatch({
        targets,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptPromotionTargetBatch({
        targets,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt promotion target apply batch requires targets entries to be objects."
    );
  });

  it("should fail loudly when a promotion target does not produce a promotion target-apply result", async () => {
    const applySpy = vi
      .spyOn(
        promotionTargetApplyModule,
        "applyAttemptPromotionTarget"
      )
      .mockResolvedValueOnce(undefined as never);

    try {
      await expect(
        applyAttemptPromotionTargetBatch({
          targets: [createPromotionTarget()],
          invokeHandoff: async () => undefined
        })
      ).rejects.toThrow(
        "Attempt promotion target apply batch requires each target to produce a promotion target-apply result."
      );
    } finally {
      applySpy.mockRestore();
    }
  });

  it("should fail loudly when promotion target entries are sparse or non-objects before later helpers run", async () => {
    const sparseTargets = new Array<AttemptPromotionTarget>(1);

    await expect(
      applyAttemptPromotionTargetBatch({
        targets: sparseTargets,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt promotion target apply batch requires targets entries to be objects."
    );
  });

  it("should fail before invoking when a later promotion target entry is malformed", async () => {
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptPromotionTargetBatch({
        targets: [
          createPromotionTarget({
            attemptId: "att_supported_1"
          }),
          undefined,
          createPromotionTarget({
            attemptId: "att_supported_2"
          })
        ] as unknown as readonly AttemptPromotionTarget[],
        invokeHandoff: async (request) => {
          invokedAttemptIds.push(request.attemptId);
        },
        resolveHandoffCapability: () => true
      })
    ).rejects.toThrow(
      "Attempt promotion target apply batch requires targets entries to be objects."
    );
    expect(invokedAttemptIds).toEqual([]);
  });

  it("should fail before invoking when a later target identity becomes invalid after normalization", async () => {
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptPromotionTargetBatch({
        targets: [
          createPromotionTarget({
            attemptId: "att_supported_1"
          }),
          {
            ...createPromotionTarget({
              attemptId: "att_invalid",
              runtime: "gemini-cli"
            }),
            taskId: "   "
          } as AttemptPromotionTarget,
          createPromotionTarget({
            attemptId: "att_supported_2",
            runtime: "gemini-cli"
          })
        ],
        invokeHandoff: async (request) => {
          invokedAttemptIds.push(request.attemptId);
        },
        resolveHandoffCapability: () => true
      })
    ).rejects.toThrow(
      "Attempt promotion target apply batch requires targets entries to include non-empty taskId, attemptId, and runtime strings."
    );
    expect(invokedAttemptIds).toEqual([]);
  });

  it("should not mutate the supplied promotion targets", async () => {
    const targets = [
      createPromotionTarget({
        attemptId: "att_blocked"
      }),
      createPromotionTarget({
        attemptId: "att_supported",
        runtime: "gemini-cli",
        sourceKind: "delegated"
      })
    ] satisfies AttemptPromotionTarget[];
    const snapshot = structuredClone(targets);

    await expect(
      applyAttemptPromotionTargetBatch({
        targets,
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: (runtime: string) => runtime !== "codex-cli"
      })
    ).resolves.toEqual({
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
    expect(targets).toEqual(snapshot);
  });

  it("should keep the batch result shape minimal without aggregate or report metadata", async () => {
    const result = (await applyAttemptPromotionTargetBatch({
      targets: [
        {
          ...createPromotionTarget(),
          report: { candidateCount: 1 },
          explanation: { code: "selected" },
          queue: { name: "default" },
          partialFailure: { enabled: false }
        } as AttemptPromotionTarget
      ],
      invokeHandoff: async () => undefined,
      resolveHandoffCapability: () => true
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      results: [createSupportedPromotionTargetApply()]
    });
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("aggregatePolicy");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("partialFailure");
    expect(result).not.toHaveProperty("queue");
    expect(result).not.toHaveProperty("report");
    expect(result).not.toHaveProperty("manifest");
  });

  it("should apply stable promotion targets through the canonical promotion-to-handoff chain", async () => {
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

    await expect(
      applyAttemptPromotionTargetBatch({
        targets: [promotionTarget!],
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: () => true
      })
    ).resolves.toEqual({
      results: [
        createSupportedPromotionTargetApply({
          status: "running",
          sourceKind: "delegated"
        })
      ]
    });
  });
});

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

function createBlockedPromotionTargetApply(
  overrides: Partial<AttemptPromotionTarget> = {}
): AttemptPromotionTargetApply {
  const target = createPromotionTarget(overrides);

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
          readiness: createBlockedReadiness()
        },
        consume: {
          request: {
            taskId: target.taskId,
            attemptId: target.attemptId,
            runtime: target.runtime,
            status: target.status,
            sourceKind: target.sourceKind
          },
          readiness: createBlockedReadiness(),
          invoked: false
        }
      }
    }
  };
}

function createSupportedPromotionTargetApply(
  overrides: Partial<AttemptPromotionTarget> = {}
): AttemptPromotionTargetApply {
  const target = createPromotionTarget(overrides);

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
          readiness: createSupportedReadiness()
        },
        consume: {
          request: {
            taskId: target.taskId,
            attemptId: target.attemptId,
            runtime: target.runtime,
            status: target.status,
            sourceKind: target.sourceKind
          },
          readiness: createSupportedReadiness(),
          invoked: true
        }
      }
    }
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
