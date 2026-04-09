import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import * as selection from "../../src/selection/internal.js";
import type {
  AttemptPromotionCandidate,
  AttemptPromotionTarget,
  AttemptPromotionTargetApply,
  AttemptPromotionTargetApplyInput
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

const applyAttemptPromotionTarget = (
  selection as Partial<{
    applyAttemptPromotionTarget: (
      input: AttemptPromotionTargetApplyInput
    ) => Promise<AttemptPromotionTargetApply | undefined>;
  }>
).applyAttemptPromotionTarget as (
  input: AttemptPromotionTargetApplyInput
) => Promise<AttemptPromotionTargetApply | undefined>;

describe("selection promotion-target-apply helpers", () => {
  it("should fail loudly when the supplied promotion target-apply input or callbacks are malformed", async () => {
    await expect(
      applyAttemptPromotionTarget(undefined as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptPromotionTarget(undefined as never)
    ).rejects.toThrow("Attempt promotion target apply input must be an object.");

    await expect(
      applyAttemptPromotionTarget({
        target: createPromotionTarget(),
        invokeHandoff: undefined as never
      })
    ).rejects.toThrow(
      "Attempt promotion target apply requires invokeHandoff to be a function."
    );

    await expect(
      applyAttemptPromotionTarget({
        target: createPromotionTarget(),
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Attempt promotion target apply requires resolveHandoffCapability to be a function when provided."
    );
  });

  it("should return undefined when the supplied promotion target is undefined", async () => {
    let invoked = false;

    await expect(
      applyAttemptPromotionTarget({
        target: undefined,
        invokeHandoff: async () => {
          invoked = true;
        }
      })
    ).resolves.toBeUndefined();
    expect(invoked).toBe(false);
  });

  it("should compose a supported handoff target and target-apply result from a supported promotion target", async () => {
    await expect(
      applyAttemptPromotionTarget({
        target: createPromotionTarget({
          status: "running",
          sourceKind: "delegated"
        }),
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: () => true
      })
    ).resolves.toEqual(
      createSupportedPromotionTargetApply({
        status: "running",
        sourceKind: "delegated"
      })
    );
  });

  it("should compose a blocked handoff target and blocked target-apply result when handoff is unsupported", async () => {
    let invoked = false;

    await expect(
      applyAttemptPromotionTarget({
        target: createPromotionTarget(),
        invokeHandoff: async () => {
          invoked = true;
        }
      })
    ).resolves.toEqual(createBlockedPromotionTargetApply());
    expect(invoked).toBe(false);
  });

  it("should fail loudly when the supplied promotion target is invalid", async () => {
    const target = {
      ...createPromotionTarget(),
      targetBasis: "unexpected_basis"
    } as unknown as AttemptPromotionTarget;

    await expect(
      applyAttemptPromotionTarget({
        target,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptPromotionTarget({
        target,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      'Attempt handoff target requires target.targetBasis to be "promotion_decision_summary".'
    );
  });

  it("should surface invoker failures directly without returning a partial promotion target-apply result", async () => {
    const expectedError = new Error("handoff failed");

    await expect(
      applyAttemptPromotionTarget({
        target: createPromotionTarget(),
        invokeHandoff: async () => {
          throw expectedError;
        },
        resolveHandoffCapability: () => true
      })
    ).rejects.toThrow(expectedError);
  });

  it("should fail loudly when a defined promotion target does not produce a target-apply result", async () => {
    vi.resetModules();
    vi.doMock("../../src/selection/handoff-target-apply.js", async () => {
      const actual = await vi.importActual<
        typeof import("../../src/selection/handoff-target-apply.js")
      >("../../src/selection/handoff-target-apply.js");

      return {
        ...actual,
        applyAttemptHandoffTarget: async () => undefined
      };
    });

    try {
      const promotionTargetApplyModule = await import(
        "../../src/selection/promotion-target-apply.js"
      );

      await expect(
        promotionTargetApplyModule.applyAttemptPromotionTarget({
          target: createPromotionTarget(),
          invokeHandoff: async () => undefined,
          resolveHandoffCapability: () => true
        })
      ).rejects.toMatchObject({
        name: "ValidationError",
        message:
          "Attempt promotion target apply requires target to produce a target-apply result."
      });
      await expect(
        promotionTargetApplyModule.applyAttemptPromotionTarget({
          target: createPromotionTarget(),
          invokeHandoff: async () => undefined,
          resolveHandoffCapability: () => true
        })
      ).rejects.toThrow(
        "Attempt promotion target apply requires target to produce a target-apply result."
      );
    } finally {
      vi.doUnmock("../../src/selection/handoff-target-apply.js");
      vi.resetModules();
    }
  });

  it("should not mutate the supplied promotion target and should derive a fresh handoff target", async () => {
    const target = Object.freeze(
      createPromotionTarget({
        sourceKind: "delegated"
      })
    );
    const snapshot = structuredClone(target);
    const result = await applyAttemptPromotionTarget({
      target,
      invokeHandoff: async () => undefined,
      resolveHandoffCapability: () => true
    });

    expect(target).toEqual(snapshot);
    expect(result).toEqual(
      createSupportedPromotionTargetApply({
        sourceKind: "delegated"
      })
    );
    expect(result).not.toBeUndefined();
    expect(result?.handoffTarget).not.toBe(target as unknown);
    expect(result?.targetApply.request).not.toBe(target as unknown);
  });

  it("should keep the result shape minimal without leaking promotion decision or runtime metadata", async () => {
    const result = (await applyAttemptPromotionTarget({
      target: {
        ...createPromotionTarget(),
        decision: { canPromote: true },
        explanation: { code: "selected" },
        report: { candidateCount: 1 },
        manifest: { attemptId: "att_ready" },
        runtimeState: { state: "running" },
        controlPlane: { nodeId: "node_123" }
      } as AttemptPromotionTarget,
      invokeHandoff: async () => undefined,
      resolveHandoffCapability: () => true
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual(createSupportedPromotionTargetApply());
    expect(result).not.toHaveProperty("target");
    expect(result).not.toHaveProperty("promotionTarget");
    expect(result).not.toHaveProperty("decision");
    expect(result).not.toHaveProperty("explanation");
    expect(result).not.toHaveProperty("report");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("runtimeState");
    expect(result).not.toHaveProperty("controlPlane");
  });

  it("should apply a stable promotion target through the canonical promotion-to-handoff chain", async () => {
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
      applyAttemptPromotionTarget({
        target: promotionTarget,
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: () => true
      })
    ).resolves.toEqual(
      createSupportedPromotionTargetApply({
        status: "running",
        sourceKind: "delegated"
      })
    );
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

function createBlockedPromotionTargetApply(
  overrides: Partial<AttemptPromotionTarget> = {}
) {
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
) {
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
