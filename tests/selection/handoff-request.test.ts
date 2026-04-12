import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import {
  deriveAttemptHandoffRequest,
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
  AttemptVerificationExecutionResult,
  AttemptVerificationSummary
} from "../../src/verification/internal.js";

describe("selection handoff-request helpers", () => {
  it("should return undefined when the supplied handoff target is undefined", () => {
    expect(deriveAttemptHandoffRequest(undefined)).toBeUndefined();
  });

  it("should derive a minimal handoff request from a valid handoff target", () => {
    expect(
      deriveAttemptHandoffRequest(
        createHandoffTarget({
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "running",
          sourceKind: "delegated"
        })
      )
    ).toEqual({
      taskId: "task_shared",
      attemptId: "att_ready",
      runtime: "codex-cli",
      status: "running",
      sourceKind: "delegated"
    });
  });

  it("should preserve sourceKind while requiring a concrete taskId on the derived request", () => {
    expect(
      deriveAttemptHandoffRequest(
        createHandoffTarget({
          sourceKind: undefined
        })
      )
    ).toEqual({
      taskId: "task_shared",
      attemptId: "att_ready",
      runtime: "codex-cli",
      status: "created",
      sourceKind: undefined
    });
  });

  it("should trim taskId, attemptId, and runtime when deriving a handoff request", () => {
    expect(
      deriveAttemptHandoffRequest(
        createHandoffTarget({
          taskId: "  task_shared  ",
          attemptId: "  att_ready  ",
          runtime: "  codex-cli  "
        })
      )
    ).toEqual({
      taskId: "task_shared",
      attemptId: "att_ready",
      runtime: "codex-cli",
      status: "created",
      sourceKind: undefined
    });
  });

  it("should fail loudly when target.handoffBasis is invalid", () => {
    const target = {
      ...createHandoffTarget(),
      handoffBasis: "unexpected_basis"
    } as unknown as AttemptHandoffTarget;

    expect(() => deriveAttemptHandoffRequest(target)).toThrow(ValidationError);
    expect(() => deriveAttemptHandoffRequest(target)).toThrow(
      'Attempt handoff request requires target.handoffBasis to be "promotion_target".'
    );
  });

  it("should fail loudly when target is not an object", () => {
    expect(() => deriveAttemptHandoffRequest(null as never)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptHandoffRequest(null as never)).toThrow(
      "Attempt handoff request requires target to be an object when provided."
    );
  });

  it("should fail closed when reading target through an accessor-shaped input", () => {
    expect(() =>
      deriveAttemptHandoffRequest({
        get handoffBasis() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffRequest({
        get handoffBasis() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow(
      "Attempt handoff request requires target to be a readable object when provided."
    );
  });

  it("should fail loudly when target.taskId is not a non-empty string", () => {
    const target = {
      ...createHandoffTarget(),
      taskId: 42
    } as unknown as AttemptHandoffTarget;

    expect(() => deriveAttemptHandoffRequest(target)).toThrow(
      "Attempt handoff request requires target.taskId to be a non-empty string."
    );
  });

  it("should fail loudly when target.taskId is undefined", () => {
    const target = {
      ...createHandoffTarget(),
      taskId: undefined
    } as unknown as AttemptHandoffTarget;

    expect(() => deriveAttemptHandoffRequest(target)).toThrow(
      "Attempt handoff request requires target.taskId to be a non-empty string."
    );
  });

  it("should fail loudly when target.taskId is blank-only whitespace", () => {
    const target = {
      ...createHandoffTarget(),
      taskId: "   "
    } as unknown as AttemptHandoffTarget;

    expect(() => deriveAttemptHandoffRequest(target)).toThrow(
      "Attempt handoff request requires target.taskId to be a non-empty string."
    );
  });

  it("should fail loudly when target.attemptId is empty", () => {
    const target = {
      ...createHandoffTarget(),
      attemptId: "   "
    } as unknown as AttemptHandoffTarget;

    expect(() => deriveAttemptHandoffRequest(target)).toThrow(
      "Attempt handoff request requires target.attemptId to be a non-empty string."
    );
  });

  it("should fail loudly when target.runtime is empty", () => {
    const target = {
      ...createHandoffTarget(),
      runtime: ""
    } as unknown as AttemptHandoffTarget;

    expect(() => deriveAttemptHandoffRequest(target)).toThrow(
      "Attempt handoff request requires target.runtime to be a non-empty string."
    );
  });

  it("should fail loudly when target.status uses an unknown attempt status", () => {
    const target = {
      ...createHandoffTarget(),
      status: "unknown"
    } as unknown as AttemptHandoffTarget;

    expect(() => deriveAttemptHandoffRequest(target)).toThrow(
      "Attempt handoff request requires target.status to use the existing attempt status vocabulary."
    );
  });

  it("should fail loudly when target.sourceKind uses an unknown source kind", () => {
    const target = {
      ...createHandoffTarget(),
      sourceKind: "sideways"
    } as unknown as AttemptHandoffTarget;

    expect(() => deriveAttemptHandoffRequest(target)).toThrow(
      "Attempt handoff request requires target.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  });

  it("should derive the request without mutating the supplied handoff target and should return a fresh object", () => {
    const target = Object.freeze(createHandoffTarget());
    const snapshot = structuredClone(target);

    const request = deriveAttemptHandoffRequest(target);

    expect(target).toEqual(snapshot);
    expect(request).toEqual({
      taskId: "task_shared",
      attemptId: "att_ready",
      runtime: "codex-cli",
      status: "created",
      sourceKind: undefined
    });
    expect(request).not.toBe(target as unknown);
  });

  it("should not leak target metadata, promotion details, or runtime internals into the derived request", () => {
    const request = deriveAttemptHandoffRequest({
      ...createHandoffTarget(),
      targetBasis: "promotion_decision_summary",
      canPromote: true,
      blockingReasons: [],
      explanation: { code: "selected" },
      artifactSummary: { checks: [] },
      checks: [],
      session: { sessionId: "sess_123" },
      controlPlane: { nodeId: "node_123" },
      runtimeState: { state: "running" }
    } as AttemptHandoffTarget);

    expect(request).toBeDefined();
    expect(request).not.toHaveProperty("handoffBasis");
    expect(request).not.toHaveProperty("targetBasis");
    expect(request).not.toHaveProperty("canPromote");
    expect(request).not.toHaveProperty("blockingReasons");
    expect(request).not.toHaveProperty("explanation");
    expect(request).not.toHaveProperty("artifactSummary");
    expect(request).not.toHaveProperty("checks");
    expect(request).not.toHaveProperty("session");
    expect(request).not.toHaveProperty("controlPlane");
    expect(request).not.toHaveProperty("runtimeState");
  });

  it("should derive a stable handoff request through the canonical promotion-to-handoff chain", () => {
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
      deriveAttemptHandoffRequest(deriveAttemptHandoffTarget(promotionTarget))
    ).toEqual({
      taskId: "task_shared",
      attemptId: "att_ready",
      runtime: "codex-cli",
      status: "running",
      sourceKind: "delegated"
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
