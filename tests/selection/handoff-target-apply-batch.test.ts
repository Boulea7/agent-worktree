import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffTarget,
  AttemptPromotionCandidate
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

const applyAttemptHandoffTargetBatch = (
  selection as Record<string, unknown>
).applyAttemptHandoffTargetBatch as (input: {
  targets: readonly AttemptHandoffTarget[];
  invokeHandoff: (request: {
    taskId: string | undefined;
    attemptId: string;
    runtime: string;
    status: string;
    sourceKind: string | undefined;
  }) => void | Promise<void>;
  resolveHandoffCapability?: (runtime: string) => boolean;
}) => Promise<{
  results: {
    request: {
      taskId: string | undefined;
      attemptId: string;
      runtime: string;
      status: string;
      sourceKind: string | undefined;
    };
    apply: {
      consumer: {
        request: {
          taskId: string | undefined;
          attemptId: string;
          runtime: string;
          status: string;
          sourceKind: string | undefined;
        };
        readiness: {
          blockingReasons: string[];
          canConsumeHandoff: boolean;
          hasBlockingReasons: boolean;
          handoffSupported: boolean;
        };
      };
      consume: {
        request: {
          taskId: string | undefined;
          attemptId: string;
          runtime: string;
          status: string;
          sourceKind: string | undefined;
        };
        readiness: {
          blockingReasons: string[];
          canConsumeHandoff: boolean;
          hasBlockingReasons: boolean;
          handoffSupported: boolean;
        };
        invoked: boolean;
      };
    };
  }[];
}>;

describe("selection handoff-target-apply-batch helpers", () => {
  it("should fail closed when the supplied target-apply batch input or callbacks are malformed", async () => {
    await expect(
      applyAttemptHandoffTargetBatch(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffTargetBatch(undefined as never)
    ).rejects.toThrow("Attempt handoff target apply batch input must be an object.");

    await expect(
      applyAttemptHandoffTargetBatch({
        targets: undefined as never,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff target apply batch requires targets to be an array."
    );

    await expect(
      applyAttemptHandoffTargetBatch({
        targets: [],
        invokeHandoff: undefined as never
      })
    ).rejects.toThrow(
      "Attempt handoff target apply batch requires invokeHandoff to be a function."
    );

    await expect(
      applyAttemptHandoffTargetBatch({
        targets: [],
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Attempt handoff target apply batch requires resolveHandoffCapability to be a function when provided."
    );
  });

  it("should return an empty batch result for an empty target list", async () => {
    await expect(
      applyAttemptHandoffTargetBatch({
        targets: [],
        invokeHandoff: async () => {
          throw new Error("empty batches must not invoke handoff");
        }
      })
    ).resolves.toEqual({
      results: []
    });
  });

  it("should preserve input order and continue past blocked targets", async () => {
    const targets = [
      createHandoffTarget({
        attemptId: "att_blocked_1",
        runtime: "blocked-cli"
      }),
      createHandoffTarget({
        attemptId: "att_supported_1"
      }),
      createHandoffTarget({
        attemptId: "att_blocked_2",
        runtime: "blocked-cli"
      }),
      createHandoffTarget({
        attemptId: "att_supported_2",
        runtime: "gemini-cli",
        sourceKind: "delegated"
      })
    ] satisfies AttemptHandoffTarget[];
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffTargetBatch({
        targets,
        invokeHandoff: async (request) => {
          invokedAttemptIds.push(request.attemptId);
        },
        resolveHandoffCapability: (runtime: string) => runtime !== "blocked-cli"
      })
    ).resolves.toEqual({
      results: [
        createBlockedTargetApply({
          attemptId: "att_blocked_1",
          runtime: "blocked-cli"
        }),
        createSupportedTargetApply({
          attemptId: "att_supported_1"
        }),
        createBlockedTargetApply({
          attemptId: "att_blocked_2",
          runtime: "blocked-cli"
        }),
        createSupportedTargetApply({
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
      createHandoffTarget({
        attemptId: "att_blocked_1"
      }),
      createHandoffTarget({
        attemptId: "att_blocked_2",
        runtime: "gemini-cli"
      })
    ] satisfies AttemptHandoffTarget[];
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffTargetBatch({
        targets,
        invokeHandoff: async (request) => {
          invokedAttemptIds.push(request.attemptId);
        }
      })
    ).resolves.toEqual({
      results: [
        createBlockedTargetApply({
          attemptId: "att_blocked_1"
        }),
        createBlockedTargetApply({
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
      createHandoffTarget({
        attemptId: "att_supported_1"
      }),
      createHandoffTarget({
        attemptId: "att_supported_2",
        runtime: "gemini-cli"
      }),
      createHandoffTarget({
        attemptId: "att_supported_3",
        sourceKind: "delegated"
      })
    ] satisfies AttemptHandoffTarget[];
    const invokedAttemptIds: string[] = [];

    await expect(
      applyAttemptHandoffTargetBatch({
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

  it("should fail loudly when a batch target is invalid", async () => {
    const targets = [
      {
        ...createHandoffTarget(),
        handoffBasis: "unexpected_basis"
      }
    ] as unknown as readonly AttemptHandoffTarget[];

    await expect(
      applyAttemptHandoffTargetBatch({
        targets,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffTargetBatch({
        targets,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      'Attempt handoff request requires target.handoffBasis to be "promotion_target".'
    );
  });

  it("should fail loudly when a batch entry is not an object before deriving a target-apply result", async () => {
    const targets = [undefined] as unknown as readonly AttemptHandoffTarget[];

    await expect(
      applyAttemptHandoffTargetBatch({
        targets,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffTargetBatch({
        targets,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff target apply batch requires targets entries to be objects."
    );
  });

  it("should fail loudly when target entries are sparse or non-objects before later helpers run", async () => {
    const sparseTargets = new Array<AttemptHandoffTarget>(1);

    await expect(
      applyAttemptHandoffTargetBatch({
        targets: sparseTargets,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff target apply batch requires targets entries to be objects."
    );
  });

  it("should not mutate the supplied targets", async () => {
    const targets = [
      createHandoffTarget({
        attemptId: "att_blocked"
      }),
      createHandoffTarget({
        attemptId: "att_supported",
        runtime: "gemini-cli",
        sourceKind: "delegated"
      })
    ] satisfies AttemptHandoffTarget[];
    const snapshot = structuredClone(targets);

    await expect(
      applyAttemptHandoffTargetBatch({
        targets,
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: (runtime: string) => runtime !== "codex-cli"
      })
    ).resolves.toEqual({
      results: [
        createBlockedTargetApply({
          attemptId: "att_blocked"
        }),
        createSupportedTargetApply({
          attemptId: "att_supported",
          runtime: "gemini-cli",
          sourceKind: "delegated"
        })
      ]
    });
    expect(targets).toEqual(snapshot);
  });

  it("should keep the batch result shape minimal without aggregate or queue metadata", async () => {
    const result = (await applyAttemptHandoffTargetBatch({
      targets: [
        {
          ...createHandoffTarget(),
          report: { candidateCount: 1 },
          queue: { name: "default" },
          partialFailure: { enabled: false }
        } as AttemptHandoffTarget
      ],
      invokeHandoff: async () => undefined,
      resolveHandoffCapability: () => true
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      results: [createSupportedTargetApply()]
    });
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("aggregatePolicy");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("partialFailure");
    expect(result).not.toHaveProperty("queue");
    expect(result).not.toHaveProperty("manifest");
  });

  it("should apply stable targets through the canonical promotion-to-handoff chain", async () => {
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
      applyAttemptHandoffTargetBatch({
        targets: [selection.deriveAttemptHandoffTarget(promotionTarget)!],
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: () => true
      })
    ).resolves.toEqual({
      results: [
        createSupportedTargetApply({
          status: "running",
          sourceKind: "delegated"
        })
      ]
    });
  });
});

function createBlockedReadiness() {
  return {
    blockingReasons: ["handoff_unsupported"],
    canConsumeHandoff: false,
    hasBlockingReasons: true,
    handoffSupported: false
  } as const;
}

function createSupportedReadiness() {
  return {
    blockingReasons: [],
    canConsumeHandoff: true,
    hasBlockingReasons: false,
    handoffSupported: true
  } as const;
}

function createBlockedTargetApply(
  overrides: Partial<AttemptHandoffTarget> = {}
) {
  const target = createHandoffTarget(overrides);

  return {
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
  };
}

function createSupportedTargetApply(
  overrides: Partial<AttemptHandoffTarget> = {}
) {
  const target = createHandoffTarget(overrides);

  return {
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
  };
}

function createHandoffTarget(
  overrides: Partial<AttemptHandoffTarget> = {}
): AttemptHandoffTarget {
  return {
    handoffBasis: "promotion_target",
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
