import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffFinalizationRequest,
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

const applyAttemptHandoffFinalization = (
  selection as Partial<{
    applyAttemptHandoffFinalization: (input: {
      request: AttemptHandoffFinalizationRequest | undefined;
      invokeHandoffFinalization: (
        request: AttemptHandoffFinalizationRequest
      ) => void | Promise<void>;
      resolveHandoffFinalizationCapability?: (runtime: string) => boolean;
    }) => Promise<
      | {
          consumer: {
            request: AttemptHandoffFinalizationRequest;
            readiness: {
              blockingReasons: string[];
              canConsumeHandoffFinalization: boolean;
              hasBlockingReasons: boolean;
              handoffFinalizationSupported: boolean;
            };
          };
          consume: {
            request: AttemptHandoffFinalizationRequest;
            readiness: {
              blockingReasons: string[];
              canConsumeHandoffFinalization: boolean;
              hasBlockingReasons: boolean;
              handoffFinalizationSupported: boolean;
            };
            invoked: boolean;
          };
        }
      | undefined
    >;
  }>
).applyAttemptHandoffFinalization as (input: {
  request: AttemptHandoffFinalizationRequest | undefined;
  invokeHandoffFinalization: (
    request: AttemptHandoffFinalizationRequest
  ) => void | Promise<void>;
  resolveHandoffFinalizationCapability?: (runtime: string) => boolean;
}) => Promise<
  | {
      consumer: {
        request: AttemptHandoffFinalizationRequest;
        readiness: {
          blockingReasons: string[];
          canConsumeHandoffFinalization: boolean;
          hasBlockingReasons: boolean;
          handoffFinalizationSupported: boolean;
        };
      };
      consume: {
        request: AttemptHandoffFinalizationRequest;
        readiness: {
          blockingReasons: string[];
          canConsumeHandoffFinalization: boolean;
          hasBlockingReasons: boolean;
          handoffFinalizationSupported: boolean;
        };
        invoked: boolean;
      };
    }
  | undefined
>;

describe("selection handoff-finalization-apply helpers", () => {
  it("should return undefined when the supplied finalization request is undefined", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyAttemptHandoffFinalization({
        request: undefined,
        invokeHandoffFinalization
      })
    ).resolves.toBeUndefined();
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should compose a supported finalization consumer and consume result for a supported request", async () => {
    const request = createFinalizationRequest({
      status: "running",
      sourceKind: "delegated"
    });
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyAttemptHandoffFinalization({
        request,
        invokeHandoffFinalization,
        resolveHandoffFinalizationCapability: () => true
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
          canConsumeHandoffFinalization: true,
          hasBlockingReasons: false,
          handoffFinalizationSupported: true
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
          canConsumeHandoffFinalization: true,
          hasBlockingReasons: false,
          handoffFinalizationSupported: true
        },
        invoked: true
      }
    });
    expect(invokeHandoffFinalization).toHaveBeenCalledTimes(1);
  });

  it("should compose a blocked finalization consumer and blocked consume result for an unsupported request", async () => {
    const invokeHandoffFinalization = vi.fn(async () => undefined);

    await expect(
      applyAttemptHandoffFinalization({
        request: createFinalizationRequest(),
        invokeHandoffFinalization
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
          blockingReasons: ["handoff_finalization_unsupported"],
          canConsumeHandoffFinalization: false,
          hasBlockingReasons: true,
          handoffFinalizationSupported: false
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
          blockingReasons: ["handoff_finalization_unsupported"],
          canConsumeHandoffFinalization: false,
          hasBlockingReasons: true,
          handoffFinalizationSupported: false
        },
        invoked: false
      }
    });
    expect(invokeHandoffFinalization).not.toHaveBeenCalled();
  });

  it("should call the capability resolver with the request runtime", async () => {
    const resolveHandoffFinalizationCapability = vi.fn(() => true);

    await applyAttemptHandoffFinalization({
      request: createFinalizationRequest({
        runtime: "gemini-cli"
      }),
      invokeHandoffFinalization: async () => undefined,
      resolveHandoffFinalizationCapability
    });

    expect(resolveHandoffFinalizationCapability).toHaveBeenCalledTimes(1);
    expect(resolveHandoffFinalizationCapability).toHaveBeenCalledWith(
      "gemini-cli"
    );
  });

  it("should surface invalid request failures directly without wrapping them", async () => {
    const request = {
      ...createFinalizationRequest(),
      attemptId: "   "
    } as unknown as AttemptHandoffFinalizationRequest;

    await expect(
      applyAttemptHandoffFinalization({
        request,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(ValidationError);
    await expect(
      applyAttemptHandoffFinalization({
        request,
        invokeHandoffFinalization: async () => undefined
      })
    ).rejects.toThrow(
      "Attempt handoff finalization consumer requires request.attemptId to be a non-empty string."
    );
  });

  it("should surface invoker failures directly without returning a partial apply result", async () => {
    const expectedError = new Error("handoff finalization failed");

    await expect(
      applyAttemptHandoffFinalization({
        request: createFinalizationRequest(),
        invokeHandoffFinalization: async () => {
          throw expectedError;
        },
        resolveHandoffFinalizationCapability: () => true
      })
    ).rejects.toThrow(expectedError);
  });

  it("should not mutate the supplied request and should derive fresh consumer request objects", async () => {
    const request = Object.freeze(
      createFinalizationRequest({
        sourceKind: "delegated"
      })
    );
    const snapshot = structuredClone(request);
    const result = await applyAttemptHandoffFinalization({
      request,
      invokeHandoffFinalization: async () => undefined,
      resolveHandoffFinalizationCapability: () => true
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
          canConsumeHandoffFinalization: true,
          hasBlockingReasons: false,
          handoffFinalizationSupported: true
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
          canConsumeHandoffFinalization: true,
          hasBlockingReasons: false,
          handoffFinalizationSupported: true
        },
        invoked: true
      }
    });
    expect(result).not.toBeUndefined();
    expect(result?.consumer.request).not.toBe(request);
    expect(result?.consume.request).toBe(result?.consumer.request);
  });

  it("should keep the apply result shape minimal without leaking orchestration or persistence metadata", async () => {
    const result = (await applyAttemptHandoffFinalization({
      request: {
        ...createFinalizationRequest(),
        finalizationBasis: "handoff_decision_summary",
        explanation: { code: "handoff_invoked" },
        report: { resultCount: 1 },
        manifest: { attemptId: "att_ready" },
        event: { kind: "handoff_finalization_requested" },
        queue: { name: "default" },
        merge: { allowed: false },
        review: { required: true }
      } as AttemptHandoffFinalizationRequest,
      invokeHandoffFinalization: async () => undefined,
      resolveHandoffFinalizationCapability: () => true
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      consumer: {
        request: createFinalizationRequest(),
        readiness: {
          blockingReasons: [],
          canConsumeHandoffFinalization: true,
          hasBlockingReasons: false,
          handoffFinalizationSupported: true
        }
      },
      consume: {
        request: createFinalizationRequest(),
        readiness: {
          blockingReasons: [],
          canConsumeHandoffFinalization: true,
          hasBlockingReasons: false,
          handoffFinalizationSupported: true
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

  it("should apply a stable finalization request through the canonical promotion-to-finalization chain", async () => {
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
    const finalizationTargets =
      selection.deriveAttemptHandoffFinalizationTargetSummary(explanation);
    const finalizationRequests =
      selection.deriveAttemptHandoffFinalizationRequestSummary(
        finalizationTargets
      );

    await expect(
      applyAttemptHandoffFinalization({
        request: finalizationRequests?.requests[0],
        invokeHandoffFinalization: async () => undefined,
        resolveHandoffFinalizationCapability: () => true
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
          canConsumeHandoffFinalization: true,
          hasBlockingReasons: false,
          handoffFinalizationSupported: true
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
          canConsumeHandoffFinalization: true,
          hasBlockingReasons: false,
          handoffFinalizationSupported: true
        },
        invoked: true
      }
    });
  });
});

function createFinalizationRequest(
  overrides: Partial<AttemptHandoffFinalizationRequest> = {}
): AttemptHandoffFinalizationRequest {
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
  overrides: Partial<AttemptManifest> &
    Pick<AttemptManifest, "attemptId"> & {
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
