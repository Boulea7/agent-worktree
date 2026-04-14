import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import {
  applyAttemptHandoff,
  deriveAttemptHandoffRequest,
  deriveAttemptHandoffTarget,
  deriveAttemptPromotionAuditSummary,
  deriveAttemptPromotionCandidate,
  deriveAttemptPromotionDecisionSummary,
  deriveAttemptPromotionExplanationSummary,
  deriveAttemptPromotionReport,
  deriveAttemptPromotionResult,
  deriveAttemptPromotionTarget,
  type AttemptHandoffRequest,
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

describe("selection handoff-apply helpers", () => {
  it("should fail loudly when the supplied apply input or callbacks are malformed", async () => {
    await expect(applyAttemptHandoff(undefined as never)).rejects.toThrow(
      ValidationError
    );
    await expect(applyAttemptHandoff(undefined as never)).rejects.toThrow(
      "Attempt handoff apply input must be an object."
    );

    await expect(
      applyAttemptHandoff({
        request: createHandoffRequest(),
        invokeHandoff: undefined as never
      })
    ).rejects.toThrow(
      "Attempt handoff apply requires invokeHandoff to be a function."
    );

    await expect(
      applyAttemptHandoff({
        request: createHandoffRequest(),
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: "yes" as never
      })
    ).rejects.toThrow(
      "Attempt handoff apply requires resolveHandoffCapability to be a function when provided."
    );
  });

  it("should return undefined when the supplied handoff request is undefined", async () => {
    const invokeHandoff = vi.fn(async () => undefined);

    await expect(
      applyAttemptHandoff({
        request: undefined,
        invokeHandoff
      })
    ).resolves.toBeUndefined();
    expect(invokeHandoff).not.toHaveBeenCalled();
  });

  it("should fail closed when inherited apply wrapper fields or accessor-shaped callbacks are supplied", async () => {
    const inheritedInput = Object.create({
      request: createHandoffRequest(),
      invokeHandoff: async () => undefined
    });

    await expect(applyAttemptHandoff(inheritedInput as never)).rejects.toThrow(
      ValidationError
    );

    await expect(
      applyAttemptHandoff({
        request: createHandoffRequest(),
        get invokeHandoff() {
          throw new Error("getter boom");
        }
      } as never)
    ).rejects.toThrow(ValidationError);
  });

  it("should compose a supported handoff consumer and consume result for a supported request", async () => {
    const request = createHandoffRequest({
      status: "running",
      sourceKind: "delegated"
    });
    const invokeHandoff = vi.fn(async () => undefined);

    await expect(
      applyAttemptHandoff({
        request,
        invokeHandoff,
        resolveHandoffCapability: () => true
      })
    ).resolves.toEqual({
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
    });
    expect(invokeHandoff).toHaveBeenCalledTimes(1);
  });

  it("should compose a blocked handoff consumer and blocked consume result for an unsupported request", async () => {
    const invokeHandoff = vi.fn(async () => undefined);

    await expect(
      applyAttemptHandoff({
        request: createHandoffRequest(),
        invokeHandoff
      })
    ).resolves.toEqual({
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
    });
    expect(invokeHandoff).not.toHaveBeenCalled();
  });

  it("should call the capability resolver with the request runtime", async () => {
    const resolveHandoffCapability = vi.fn(() => true);

    await applyAttemptHandoff({
      request: createHandoffRequest({
        runtime: "gemini-cli"
      }),
      invokeHandoff: async () => undefined,
      resolveHandoffCapability
    });

    expect(resolveHandoffCapability).toHaveBeenCalledTimes(1);
    expect(resolveHandoffCapability).toHaveBeenCalledWith("gemini-cli");
  });

  it("should surface invalid request failures directly without wrapping them", async () => {
    const request = {
      ...createHandoffRequest(),
      attemptId: "   "
    } as unknown as AttemptHandoffRequest;

    await expect(
      applyAttemptHandoff({
        request,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoff({
        request,
        invokeHandoff: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff consumer requires request.attemptId to be a non-empty string."
    );
  });

  it("should surface invoker failures directly without returning a partial apply result", async () => {
    const expectedError = new Error("handoff failed");

    await expect(
      applyAttemptHandoff({
        request: createHandoffRequest(),
        invokeHandoff: async () => {
          throw expectedError;
        },
        resolveHandoffCapability: () => true
      })
    ).rejects.toThrow(expectedError);
  });

  it("should not mutate the supplied request and should derive fresh consumer request objects", async () => {
    const request = Object.freeze(
      createHandoffRequest({
        sourceKind: "delegated"
      })
    );
    const snapshot = structuredClone(request);
    const result = await applyAttemptHandoff({
      request,
      invokeHandoff: async () => undefined,
      resolveHandoffCapability: () => true
    });

    expect(request).toEqual(snapshot);
    expect(result).toEqual({
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
    });
    expect(result).not.toBeUndefined();
    expect(result?.consumer.request).not.toBe(request);
    expect(result?.consume.request).toBe(result?.consumer.request);
  });

  it("should keep the apply result shape minimal without leaking orchestration or persistence metadata", async () => {
    const result = (await applyAttemptHandoff({
      request: {
        ...createHandoffRequest(),
        handoffBasis: "promotion_target",
        promotionMetadata: { selected: true },
        explanation: { code: "selected" },
        report: { candidateCount: 1 },
        manifest: { attemptId: "att_ready" },
        event: { kind: "handoff_requested" },
        queue: { name: "default" },
        merge: { allowed: false },
        review: { required: true }
      } as AttemptHandoffRequest,
      invokeHandoff: async () => undefined,
      resolveHandoffCapability: () => true
    })) as unknown as Record<string, unknown>;

    expect(result).toBeDefined();
    expect(result).toEqual({
      consumer: {
        request: createHandoffRequest(),
        readiness: {
          blockingReasons: [],
          canConsumeHandoff: true,
          hasBlockingReasons: false,
          handoffSupported: true
        }
      },
      consume: {
        request: createHandoffRequest(),
        readiness: {
          blockingReasons: [],
          canConsumeHandoff: true,
          hasBlockingReasons: false,
          handoffSupported: true
        },
        invoked: true
      }
    });
    expect(result).not.toHaveProperty("request");
    expect(result).not.toHaveProperty("target");
    expect(result).not.toHaveProperty("resultSummary");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("recordedAt");
    expect(result).not.toHaveProperty("event");
    expect(result).not.toHaveProperty("policy");
    expect(result).not.toHaveProperty("queue");
    expect(result).not.toHaveProperty("merge");
    expect(result).not.toHaveProperty("review");
  });

  it("should apply a stable handoff request through the canonical promotion-to-handoff chain", async () => {
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
      applyAttemptHandoff({
        request: deriveAttemptHandoffRequest(
          deriveAttemptHandoffTarget(promotionTarget)
        ),
        invokeHandoff: async () => undefined,
        resolveHandoffCapability: () => true
      })
    ).resolves.toEqual({
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
    });
  });
});

function createHandoffRequest(
  overrides: Partial<AttemptHandoffRequest> = {}
): AttemptHandoffRequest {
  return {
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
