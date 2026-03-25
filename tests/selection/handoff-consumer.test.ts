import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import {
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
  type AttemptHandoffRequest,
  type AttemptPromotionCandidate
} from "../../src/selection/index.js";
import {
  deriveAttemptVerificationArtifactSummary,
  deriveAttemptVerificationSummary
} from "../../src/verification/index.js";
import type {
  AttemptVerificationArtifactSummary,
  AttemptVerificationCheckStatus,
  AttemptVerificationExecutedCheck,
  AttemptVerificationExecutionResult
} from "../../src/verification/index.js";

describe("selection handoff-consumer helpers", () => {
  it("should return undefined when the supplied handoff request is undefined", () => {
    expect(
      deriveAttemptHandoffConsumer({
        request: undefined
      })
    ).toBeUndefined();
  });

  it("should derive a supported handoff consumer when the runtime resolver returns true", () => {
    expect(
      deriveAttemptHandoffConsumer({
        request: createHandoffRequest({
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "running",
          sourceKind: "delegated"
        }),
        resolveHandoffCapability: () => true
      })
    ).toEqual({
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
    });
  });

  it("should derive a blocked handoff consumer when no runtime resolver is provided", () => {
    expect(
      deriveAttemptHandoffConsumer({
        request: createHandoffRequest()
      })
    ).toEqual({
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
    });
  });

  it("should derive a blocked handoff consumer when the runtime resolver returns false", () => {
    expect(
      deriveAttemptHandoffConsumer({
        request: createHandoffRequest(),
        resolveHandoffCapability: () => false
      })
    ).toEqual({
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
    });
  });

  it("should fail loudly when request.taskId is not a string when provided", () => {
    const request = {
      ...createHandoffRequest(),
      taskId: 42
    } as unknown as AttemptHandoffRequest;

    expect(() =>
      deriveAttemptHandoffConsumer({
        request
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffConsumer({
        request
      })
    ).toThrow(
      "Attempt handoff consumer requires request.taskId to be a string when provided."
    );
  });

  it("should fail loudly when request.attemptId is empty", () => {
    const request = {
      ...createHandoffRequest(),
      attemptId: "   "
    } as unknown as AttemptHandoffRequest;

    expect(() =>
      deriveAttemptHandoffConsumer({
        request
      })
    ).toThrow(
      "Attempt handoff consumer requires request.attemptId to be a non-empty string."
    );
  });

  it("should fail loudly when request.runtime is empty", () => {
    const request = {
      ...createHandoffRequest(),
      runtime: ""
    } as unknown as AttemptHandoffRequest;

    expect(() =>
      deriveAttemptHandoffConsumer({
        request
      })
    ).toThrow(
      "Attempt handoff consumer requires request.runtime to be a non-empty string."
    );
  });

  it("should fail loudly when request.status uses an unknown attempt status", () => {
    const request = {
      ...createHandoffRequest(),
      status: "unknown"
    } as unknown as AttemptHandoffRequest;

    expect(() =>
      deriveAttemptHandoffConsumer({
        request
      })
    ).toThrow(
      "Attempt handoff consumer requires request.status to use the existing attempt status vocabulary."
    );
  });

  it("should fail loudly when request.sourceKind uses an unknown source kind", () => {
    const request = {
      ...createHandoffRequest(),
      sourceKind: "sideways"
    } as unknown as AttemptHandoffRequest;

    expect(() =>
      deriveAttemptHandoffConsumer({
        request
      })
    ).toThrow(
      "Attempt handoff consumer requires request.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  });

  it("should not mutate the supplied handoff request and should return a fresh consumer object", () => {
    const request = Object.freeze(
      createHandoffRequest({
        sourceKind: "delegated"
      })
    );
    const snapshot = structuredClone(request);

    const consumer = deriveAttemptHandoffConsumer({
      request,
      resolveHandoffCapability: () => true
    });

    expect(request).toEqual(snapshot);
    expect(consumer).toEqual({
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
    });
    expect(consumer).not.toBeUndefined();
    expect(consumer?.request).not.toBe(request);
  });

  it("should not leak invocation or runtime internals into the derived handoff consumer", () => {
    const consumer = deriveAttemptHandoffConsumer({
      request: {
        ...createHandoffRequest(),
        handoffBasis: "promotion_target",
        promotionMetadata: { selected: true },
        blocker: { reason: "none" },
        explanation: { code: "selected" },
        artifactSummary: { checks: [] },
        checks: [],
        session: { sessionId: "sess_123" },
        controlPlane: { nodeId: "node_123" },
        runtimeState: { state: "running" }
      } as AttemptHandoffRequest,
      resolveHandoffCapability: () => true
    }) as unknown as Record<string, unknown>;

    expect(consumer).toBeDefined();
    expect(consumer).not.toHaveProperty("invoked");
    expect(consumer).not.toHaveProperty("outcome");
    expect(consumer).not.toHaveProperty("error");
    expect(consumer).not.toHaveProperty("adapterResult");
    expect(consumer).not.toHaveProperty("manifest");
    expect(consumer).not.toHaveProperty("session");
    expect(consumer).not.toHaveProperty("controlPlane");
    expect(consumer).not.toHaveProperty("runtimeState");
    expect((consumer.request as Record<string, unknown>)).not.toHaveProperty(
      "handoffBasis"
    );
    expect((consumer.request as Record<string, unknown>)).not.toHaveProperty(
      "promotionMetadata"
    );
    expect((consumer.request as Record<string, unknown>)).not.toHaveProperty(
      "blocker"
    );
    expect((consumer.request as Record<string, unknown>)).not.toHaveProperty(
      "explanation"
    );
    expect((consumer.request as Record<string, unknown>)).not.toHaveProperty(
      "artifactSummary"
    );
    expect((consumer.request as Record<string, unknown>)).not.toHaveProperty(
      "checks"
    );
    expect((consumer.request as Record<string, unknown>)).not.toHaveProperty(
      "session"
    );
    expect((consumer.request as Record<string, unknown>)).not.toHaveProperty(
      "controlPlane"
    );
    expect((consumer.request as Record<string, unknown>)).not.toHaveProperty(
      "runtimeState"
    );
  });

  it("should call the supplied runtime resolver with the request runtime", () => {
    const resolveHandoffCapability = vi.fn(() => true);

    const consumer = deriveAttemptHandoffConsumer({
      request: createHandoffRequest({
        runtime: "gemini-cli"
      }),
      resolveHandoffCapability
    });

    expect(resolveHandoffCapability).toHaveBeenCalledTimes(1);
    expect(resolveHandoffCapability).toHaveBeenCalledWith("gemini-cli");
    expect(consumer?.readiness).toEqual({
      blockingReasons: [],
      canConsumeHandoff: true,
      hasBlockingReasons: false,
      handoffSupported: true
    });
  });

  it("should derive a stable handoff consumer through the canonical promotion-to-handoff chain", () => {
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

    expect(
      deriveAttemptHandoffConsumer({
        request: deriveAttemptHandoffRequest(
          deriveAttemptHandoffTarget(promotionTarget)
        ),
        resolveHandoffCapability: () => true
      })
    ).toEqual({
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
    throw new Error(`Expected verification check ${index} to use a string status.`);
  }

  return {
    name: record.name,
    required: record.required === true,
    status: record.status as AttemptVerificationCheckStatus
  };
}
