import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import {
  applyAttemptHandoffTarget,
  deriveAttemptHandoffTarget,
  deriveAttemptPromotionAuditSummary,
  deriveAttemptPromotionCandidate,
  deriveAttemptPromotionDecisionSummary,
  deriveAttemptPromotionExplanationSummary,
  deriveAttemptPromotionReport,
  deriveAttemptPromotionResult,
  deriveAttemptPromotionTarget,
  type AttemptHandoffTarget,
  type AttemptPromotionCandidate
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

describe("selection handoff-target-apply helpers", () => {
  it("should return undefined when the supplied handoff target is undefined", async () => {
    let invoked = false;

    await expect(
      applyAttemptHandoffTarget({
        target: undefined,
        invokeHandoff: async () => {
          invoked = true;
        }
      })
    ).resolves.toBeUndefined();
    expect(invoked).toBe(false);
  });

  it("should compose a supported handoff request and apply result from a supported target", async () => {
    await expect(
      applyAttemptHandoffTarget({
        target: createHandoffTarget({
          status: "running",
          sourceKind: "delegated"
        }),
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: () => true
      })
    ).resolves.toEqual({
      request: {
        taskId: "task_shared",
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "running",
        sourceKind: "delegated"
      },
      apply: {
        consumer: {
          request: {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "running",
            sourceKind: "delegated"
          },
          readiness: {
            blockingReasons: [],
            canConsumeHandoff: true,
            hasBlockingReasons: false,
            handoffSupported: true
          }
        },
        consume: {
          request: {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "running",
            sourceKind: "delegated"
          },
          readiness: {
            blockingReasons: [],
            canConsumeHandoff: true,
            hasBlockingReasons: false,
            handoffSupported: true
          },
          invoked: true
        }
      }
    });
  });

  it("should compose a blocked handoff request and blocked apply result from an unsupported target", async () => {
    let invoked = false;

    await expect(
      applyAttemptHandoffTarget({
        target: createHandoffTarget(),
        invokeHandoff: async () => {
          invoked = true;
        }
      })
    ).resolves.toEqual({
      request: {
        taskId: "task_shared",
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "created",
        sourceKind: undefined
      },
      apply: {
        consumer: {
          request: {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          },
          readiness: {
            blockingReasons: ["handoff_unsupported"],
            canConsumeHandoff: false,
            hasBlockingReasons: true,
            handoffSupported: false
          }
        },
        consume: {
          request: {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          },
          readiness: {
            blockingReasons: ["handoff_unsupported"],
            canConsumeHandoff: false,
            hasBlockingReasons: true,
            handoffSupported: false
          },
          invoked: false
        }
      }
    });
    expect(invoked).toBe(false);
  });

  it("should fail loudly when the supplied target is invalid", async () => {
    const target = {
      ...createHandoffTarget(),
      handoffBasis: "unexpected_basis"
    } as unknown as AttemptHandoffTarget;

    await expect(
      applyAttemptHandoffTarget({
        target,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffTarget({
        target,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      'Attempt handoff request requires target.handoffBasis to be "promotion_target".'
    );
  });

  it("should surface invoker failures directly without returning a partial target apply result", async () => {
    const expectedError = new Error("handoff failed");

    await expect(
      applyAttemptHandoffTarget({
        target: createHandoffTarget(),
        invokeHandoff: async () => {
          throw expectedError;
        },
        resolveHandoffCapability: () => true
      })
    ).rejects.toThrow(expectedError);
  });

  it("should not mutate the supplied handoff target and should derive fresh request objects", async () => {
    const target = Object.freeze(
      createHandoffTarget({
        sourceKind: "delegated"
      })
    );
    const snapshot = structuredClone(target);
    const result = await applyAttemptHandoffTarget({
      target,
      invokeHandoff: async () => undefined,
      resolveHandoffCapability: () => true
    });

    expect(target).toEqual(snapshot);
    expect(result).toEqual({
      request: {
        taskId: "task_shared",
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "created",
        sourceKind: "delegated"
      },
      apply: {
        consumer: {
          request: {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: "delegated"
          },
          readiness: {
            blockingReasons: [],
            canConsumeHandoff: true,
            hasBlockingReasons: false,
            handoffSupported: true
          }
        },
        consume: {
          request: {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: "delegated"
          },
          readiness: {
            blockingReasons: [],
            canConsumeHandoff: true,
            hasBlockingReasons: false,
            handoffSupported: true
          },
          invoked: true
        }
      }
    });
    expect(result).not.toBeUndefined();
    expect(result?.request).not.toBe(target as unknown);
    expect(result?.apply.consumer.request).not.toBe(result?.request);
  });

  it("should keep the target-apply result shape minimal without leaking promotion or runtime metadata", async () => {
    const result = (await applyAttemptHandoffTarget({
      target: {
        ...createHandoffTarget(),
        targetBasis: "promotion_decision_summary",
        decision: { canPromote: true },
        explanation: { code: "selected" },
        report: { candidateCount: 1 },
        manifest: { attemptId: "att_ready" },
        runtimeState: { state: "running" },
        controlPlane: { nodeId: "node_123" }
      } as AttemptHandoffTarget,
      invokeHandoff: async () => undefined,
      resolveHandoffCapability: () => true
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      request: {
        taskId: "task_shared",
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "created",
        sourceKind: undefined
      },
      apply: {
        consumer: {
          request: {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          },
          readiness: {
            blockingReasons: [],
            canConsumeHandoff: true,
            hasBlockingReasons: false,
            handoffSupported: true
          }
        },
        consume: {
          request: {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "created",
            sourceKind: undefined
          },
          readiness: {
            blockingReasons: [],
            canConsumeHandoff: true,
            hasBlockingReasons: false,
            handoffSupported: true
          },
          invoked: true
        }
      }
    });
    expect(result).not.toHaveProperty("target");
    expect(result).not.toHaveProperty("promotionMetadata");
    expect(result).not.toHaveProperty("decision");
    expect(result).not.toHaveProperty("explanation");
    expect(result).not.toHaveProperty("report");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("runtimeState");
    expect(result).not.toHaveProperty("controlPlane");
  });

  it("should apply a stable target through the canonical promotion-to-handoff chain", async () => {
    const promotionTarget = deriveAttemptPromotionTarget(
      deriveAttemptPromotionDecisionSummary(
        deriveAttemptPromotionExplanationSummary(
          deriveAttemptPromotionReport(
            deriveAttemptPromotionAuditSummary(
              deriveAttemptPromotionResult([
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
      applyAttemptHandoffTarget({
        target: deriveAttemptHandoffTarget(promotionTarget),
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: () => true
      })
    ).resolves.toEqual({
      request: {
        taskId: "task_shared",
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "running",
        sourceKind: "delegated"
      },
      apply: {
        consumer: {
          request: {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "running",
            sourceKind: "delegated"
          },
          readiness: {
            blockingReasons: [],
            canConsumeHandoff: true,
            hasBlockingReasons: false,
            handoffSupported: true
          }
        },
        consume: {
          request: {
            taskId: "task_shared",
            attemptId: "att_ready",
            runtime: "codex-cli",
            status: "running",
            sourceKind: "delegated"
          },
          readiness: {
            blockingReasons: [],
            canConsumeHandoff: true,
            hasBlockingReasons: false,
            handoffSupported: true
          },
          invoked: true
        }
      }
    });
  });
});

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

  return deriveAttemptPromotionCandidate(manifest, artifactSummary);
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
