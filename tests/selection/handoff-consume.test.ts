import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import {
  consumeAttemptHandoff,
  deriveAttemptHandoffConsumer,
  deriveAttemptHandoffRequest,
  deriveAttemptHandoffTarget,
  deriveAttemptPromotionAuditSummary,
  deriveAttemptPromotionCandidate,
  deriveAttemptPromotionDecisionSummary,
  deriveAttemptPromotionExplanationSummary,
  deriveAttemptPromotionReport,
  deriveAttemptPromotionResult,
  deriveAttemptPromotionTarget,
  type AttemptHandoffConsumer,
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

describe("selection handoff-consume helpers", () => {
  it("should invoke handoff exactly once for a supported handoff consumer", async () => {
    const consumer = createHandoffConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeHandoff: true,
        hasBlockingReasons: false,
        handoffSupported: true
      }
    });
    let seenRequest: AttemptHandoffRequest | undefined;
    const invokeHandoff = vi.fn(async (request: AttemptHandoffRequest) => {
      seenRequest = request;
    });

    await expect(
      consumeAttemptHandoff({
        consumer,
        invokeHandoff
      })
    ).resolves.toEqual({
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
    });
    expect(invokeHandoff).toHaveBeenCalledTimes(1);
    expect(invokeHandoff).toHaveBeenCalledWith(consumer.request);
    expect(seenRequest).toBe(consumer.request);
  });

  it("should not invoke handoff for a blocked handoff consumer", async () => {
    const consumer = createHandoffConsumer();
    const invokeHandoff = vi.fn(async () => {});

    await expect(
      consumeAttemptHandoff({
        consumer,
        invokeHandoff
      })
    ).resolves.toEqual({
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
    });
    expect(invokeHandoff).not.toHaveBeenCalled();
  });

  it("should pass the exact handoff request object to the supplied invoker", async () => {
    const consumer = createHandoffConsumer({
      request: createHandoffRequest({
        runtime: "gemini-cli",
        sourceKind: "delegated"
      }),
      readiness: {
        blockingReasons: [],
        canConsumeHandoff: true,
        hasBlockingReasons: false,
        handoffSupported: true
      }
    });

    await consumeAttemptHandoff({
      consumer,
      invokeHandoff: async (request) => {
        expect(request).toBe(consumer.request);
      }
    });
  });

  it("should surface invoker failures directly without wrapping them", async () => {
    const expectedError = new Error("handoff failed");
    const consumer = createHandoffConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeHandoff: true,
        hasBlockingReasons: false,
        handoffSupported: true
      }
    });

    await expect(
      consumeAttemptHandoff({
        consumer,
        invokeHandoff: async (request) => {
          expect(request).toBe(consumer.request);
          throw expectedError;
        }
      })
    ).rejects.toThrow(expectedError);
  });

  it("should not mutate the supplied handoff consumer", async () => {
    const consumer = createHandoffConsumer({
      request: createHandoffRequest({
        sourceKind: "delegated"
      }),
      readiness: {
        blockingReasons: [],
        canConsumeHandoff: true,
        hasBlockingReasons: false,
        handoffSupported: true
      }
    });
    const snapshot = structuredClone(consumer);

    await expect(
      consumeAttemptHandoff({
        consumer,
        invokeHandoff: async () => {}
      })
    ).resolves.toEqual({
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
    });
    expect(consumer).toEqual(snapshot);
  });

  it("should preserve the minimal consume result shape without adding lifecycle or persistence fields", async () => {
    const result = (await consumeAttemptHandoff({
      consumer: createHandoffConsumer(),
      invokeHandoff: async () => {}
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
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
    });
    expect(result).not.toHaveProperty("outcome");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("adapterResult");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("recordedAt");
    expect(result).not.toHaveProperty("event");
    expect(result).not.toHaveProperty("resultSummary");
    expect(result).not.toHaveProperty("session");
    expect(result).not.toHaveProperty("controlPlane");
    expect(result).not.toHaveProperty("runtimeState");
  });

  it("should consume a stable handoff request through the canonical promotion-to-handoff chain", async () => {
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
    const consumer = deriveAttemptHandoffConsumer({
      request: deriveAttemptHandoffRequest(
        deriveAttemptHandoffTarget(promotionTarget)
      ),
      resolveHandoffCapability: () => true
    });

    await expect(
      consumeAttemptHandoff({
        consumer: consumer as AttemptHandoffConsumer,
        invokeHandoff: async () => {}
      })
    ).resolves.toEqual({
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
    });
  });

  it("should fail before invoking handoff when readiness carries a non-boolean handoffSupported value", async () => {
    const consumer = createHandoffConsumer({
      readiness: {
        blockingReasons: [],
        canConsumeHandoff: true,
        hasBlockingReasons: false,
        handoffSupported: "yes" as never
      }
    });
    const invokeHandoff = vi.fn(async () => {});

    await expect(
      consumeAttemptHandoff({
        consumer,
        invokeHandoff
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoff).not.toHaveBeenCalled();
  });

  it("should fail before invoking handoff when readiness claims unsupported handoff can still be consumed", async () => {
    const consumer = createHandoffConsumer({
      readiness: {
        blockingReasons: ["handoff_unsupported"],
        canConsumeHandoff: true,
        hasBlockingReasons: true,
        handoffSupported: false
      }
    });
    const invokeHandoff = vi.fn(async () => {});

    await expect(
      consumeAttemptHandoff({
        consumer,
        invokeHandoff
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoff).not.toHaveBeenCalled();
  });

  it("should fail before invoking handoff when readiness blockingReasons contains sparse array holes", async () => {
    const consumer = createHandoffConsumer({
      readiness: {
        blockingReasons: new Array<string>(1) as never,
        canConsumeHandoff: false,
        hasBlockingReasons: true,
        handoffSupported: false
      }
    });
    const invokeHandoff = vi.fn(async () => {});

    await expect(
      consumeAttemptHandoff({
        consumer,
        invokeHandoff
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoff).not.toHaveBeenCalled();
  });

  it("should fail before invoking handoff when readiness blockingReasons relies on inherited array indexes", async () => {
    const blockingReasons = new Array<string>(1);

    Object.setPrototypeOf(blockingReasons, {
      ...Array.prototype,
      0: "handoff_unsupported"
    });

    const consumer = createHandoffConsumer({
      readiness: {
        blockingReasons: blockingReasons as never,
        canConsumeHandoff: false,
        hasBlockingReasons: true,
        handoffSupported: false
      }
    });
    const invokeHandoff = vi.fn(async () => {});

    await expect(
      consumeAttemptHandoff({
        consumer,
        invokeHandoff
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoff).not.toHaveBeenCalled();
  });

  it("should fail before invoking handoff when readiness blockingReasons contains an unknown reason", async () => {
    const consumer = createHandoffConsumer({
      readiness: {
        blockingReasons: ["unexpected_reason"] as never,
        canConsumeHandoff: false,
        hasBlockingReasons: true,
        handoffSupported: false
      }
    });
    const invokeHandoff = vi.fn(async () => {});

    await expect(
      consumeAttemptHandoff({
        consumer,
        invokeHandoff
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeHandoff).not.toHaveBeenCalled();
  });
});

function createHandoffConsumer(
  overrides: Partial<AttemptHandoffConsumer> = {}
): AttemptHandoffConsumer {
  return {
    request: createHandoffRequest(),
    readiness: {
      blockingReasons: ["handoff_unsupported"],
      canConsumeHandoff: false,
      hasBlockingReasons: true,
      handoffSupported: false
    },
    ...overrides
  };
}

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
    throw new Error(`Expected verification check ${index} to use a string status.`);
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
