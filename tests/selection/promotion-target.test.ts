import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import { deriveAttemptPromotionTarget as deriveAttemptPromotionTargetDirect } from "../../src/selection/promotion-target.js";
import {
  deriveAttemptPromotionAuditSummary,
  deriveAttemptPromotionCandidate,
  deriveAttemptPromotionDecisionSummary,
  deriveAttemptPromotionExplanationSummary,
  deriveAttemptPromotionReport,
  deriveAttemptPromotionResult,
  deriveAttemptPromotionTarget
} from "../../src/selection/internal.js";
import type {
  AttemptPromotionCandidate,
  AttemptPromotionDecisionSummary
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

describe("selection promotion-target helpers", () => {
  it("should return undefined for a stable no-candidates decision summary", () => {
    const summary = createPromotionDecisionSummary([]);

    expect(deriveAttemptPromotionTarget(summary)).toBeUndefined();
  });

  it("should derive a minimal promotion target when the decision is promotable", () => {
    const summary = createPromotionDecisionSummary([
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
    ]);

    expect(deriveAttemptPromotionTarget(summary)).toEqual({
      targetBasis: "promotion_decision_summary",
      taskId: "task_shared",
      attemptId: "att_ready",
      runtime: "codex-cli",
      status: "running",
      sourceKind: "delegated"
    });
  });

  it("should trim selected attemptId and runtime when deriving a promotable target", () => {
    const summary = createPromotionDecisionSummary([
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
    ]);

    expect(
      deriveAttemptPromotionTarget({
        ...summary,
        selectedAttemptId: "  att_ready  ",
        selectedIdentity: {
          taskId: "  task_shared  ",
          attemptId: "  att_ready  ",
          runtime: "  codex-cli  "
        },
        selected: {
          ...summary.selected!,
          attemptId: "  att_ready  ",
          runtime: "  codex-cli  "
        }
      })
    ).toEqual({
      targetBasis: "promotion_decision_summary",
      taskId: "task_shared",
      attemptId: "att_ready",
      runtime: "codex-cli",
      status: "running",
      sourceKind: "delegated"
    });
  });

  it("should return undefined when the selected decision candidate is blocked by failed checks", () => {
    const summary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_failed",
        verification: createVerification({
          state: "failed",
          checks: [
            {
              name: "lint",
              required: true,
              status: "failed"
            }
          ]
        })
      })
    ]);

    expect(deriveAttemptPromotionTarget(summary)).toBeUndefined();
  });

  it("should return undefined when the selected decision candidate is blocked by pending checks", () => {
    const summary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_pending",
        verification: createVerification({
          state: "pending",
          checks: [
            {
              name: "lint",
              required: true,
              status: "pending"
            }
          ]
        })
      })
    ]);

    expect(deriveAttemptPromotionTarget(summary)).toBeUndefined();
  });

  it("should return undefined when the selected decision candidate is verification_incomplete", () => {
    const summary = createPromotionDecisionSummary([
      createIncomparablePromotionCandidate({
        attemptId: "att_incomplete",
        status: "verified",
        runtime: "opencode",
        sourceKind: "fork"
      })
    ]);

    expect(deriveAttemptPromotionTarget(summary)).toBeUndefined();
  });

  it("should return undefined when a required check is skipped", () => {
    const summary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_required_skipped",
        verification: createVerification({
          state: "failed",
          checks: [
            {
              name: "lint",
              required: true,
              status: "skipped"
            }
          ]
        })
      })
    ]);

    expect(summary.blockingReasons).toEqual(["required_checks_failed"]);
    expect(deriveAttemptPromotionTarget(summary)).toBeUndefined();
  });

  it("should return undefined when required checks are skipped and pending together", () => {
    const summary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_required_skipped_pending",
        verification: createVerification({
          state: "failed",
          checks: [
            {
              name: "lint",
              required: true,
              status: "skipped"
            },
            {
              name: "unit",
              required: true,
              status: "pending"
            }
          ]
        })
      })
    ]);

    expect(summary.blockingReasons).toEqual([
      "required_checks_failed",
      "required_checks_pending"
    ]);
    expect(deriveAttemptPromotionTarget(summary)).toBeUndefined();
  });

  it("should return undefined when only optional checks failed", () => {
    const summary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_optional_failed",
        verification: createVerification({
          state: "failed",
          checks: [
            {
              name: "docs",
              required: false,
              status: "failed"
            }
          ]
        })
      })
    ]);

    expect(summary.blockingReasons).toEqual(["verification_incomplete"]);
    expect(deriveAttemptPromotionTarget(summary)).toBeUndefined();
  });

  it("should fail loudly when a promotable summary reports zero comparable candidates", () => {
    const summary = {
      ...createPromotionDecisionSummary([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
            checks: [
              {
                name: "lint",
                required: true,
                status: "passed"
              }
            ]
          })
        })
      ]),
      comparableCandidateCount: 0
    };

    expect(() => deriveAttemptPromotionTarget(summary)).toThrow(
      "Attempt promotion target requires summary.comparableCandidateCount to be at least 1 when summary.canPromote is true."
    );
  });

  it("should fail loudly when a promotable summary reports zero promotion-ready candidates", () => {
    const summary = {
      ...createPromotionDecisionSummary([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
            checks: [
              {
                name: "lint",
                required: true,
                status: "passed"
              }
            ]
          })
        })
      ]),
      promotionReadyCandidateCount: 0
    };

    expect(() => deriveAttemptPromotionTarget(summary)).toThrow(
      "Attempt promotion target requires summary.promotionReadyCandidateCount to be at least 1 when summary.canPromote is true."
    );
  });

  it("should fail loudly when summary.decisionBasis is invalid", () => {
    const summary = {
      ...createPromotionDecisionSummary([]),
      decisionBasis: "unexpected_basis"
    } as unknown as AttemptPromotionDecisionSummary;

    expect(() => deriveAttemptPromotionTarget(summary)).toThrow(ValidationError);
    expect(() => deriveAttemptPromotionTarget(summary)).toThrow(
      'Attempt promotion target requires summary.decisionBasis to be "promotion_explanation_summary".'
    );
  });

  it("should fail loudly when the supplied promotion decision container is malformed", () => {
    expect(() =>
      deriveAttemptPromotionTargetDirect(null as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionTargetDirect(null as never)
    ).toThrow("Attempt promotion target requires summary to be an object.");

    expect(() =>
      deriveAttemptPromotionTargetDirect([] as never)
    ).toThrow("Attempt promotion target requires summary to be an object.");
  });

  it("should fail closed when reading summary through an accessor-shaped input", () => {
    expect(() =>
      deriveAttemptPromotionTargetDirect({
        get decisionBasis() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionTargetDirect({
        get decisionBasis() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow("Attempt promotion target requires summary to be a readable object.");
  });

  it("should fail loudly when candidateCount is inconsistent with selectedAttemptId or selected", () => {
    const emptySummary = {
      ...createPromotionDecisionSummary([]),
      candidateCount: 1
    };
    const nonEmptySummary = {
      ...createPromotionDecisionSummary([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
            checks: [
              {
                name: "lint",
                required: true,
                status: "passed"
              }
            ]
          })
        })
      ]),
      candidateCount: 0,
      comparableCandidateCount: 0,
      promotionReadyCandidateCount: 0
    };

    expect(() => deriveAttemptPromotionTarget(emptySummary)).toThrow(
      "Attempt promotion target requires summary.selectedAttemptId to be a non-empty string when summary.candidateCount is greater than 0."
    );
    expect(() => deriveAttemptPromotionTarget(nonEmptySummary)).toThrow(
      "Attempt promotion target requires summary.selectedAttemptId to be undefined when summary.candidateCount is 0."
    );
  });

  it("should fail loudly when summary.selected identity fields or summary.selected do not match the canonical selected candidate", () => {
    const summary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: [
            {
              name: "lint",
              required: true,
              status: "passed"
            }
          ]
        })
      })
    ]);

    expect(() =>
      deriveAttemptPromotionTarget({
        ...summary,
        selectedAttemptId: "att_other"
      })
    ).toThrow(
      "Attempt promotion target requires summary.selectedAttemptId to match summary.selected.attemptId."
    );
    expect(() =>
      deriveAttemptPromotionTarget({
        ...summary,
        selectedIdentity: undefined
      })
    ).toThrow(
      "Attempt promotion target requires summary.selectedIdentity to be defined when summary.candidateCount is greater than 0."
    );
    expect(() =>
      deriveAttemptPromotionTarget({
        ...summary,
        selectedIdentity: {
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "gemini-cli"
        }
      })
    ).toThrow(
      "Attempt promotion target requires summary.selectedIdentity to match summary.selected taskId, attemptId, and runtime."
    );
    expect(() =>
      deriveAttemptPromotionTarget({
        ...summary,
        selected: {
          ...summary.selected!,
          attemptId: "att_other"
        }
      })
    ).toThrow(
      "Attempt promotion target requires summary.selectedAttemptId to match summary.selected.attemptId."
    );
  });

  it("should fail loudly when summary.taskId is undefined", () => {
    const summary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: [
            {
              name: "lint",
              required: true,
              status: "passed"
            }
          ]
        })
      })
    ]);

    expect(() =>
      deriveAttemptPromotionTarget({
        ...summary,
        taskId: undefined
      })
    ).toThrow(ValidationError);
  });

  it("should fail loudly when comparableCandidateCount is not a valid light-checked integer", () => {
    const summary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: [
            {
              name: "lint",
              required: true,
              status: "passed"
            }
          ]
        })
      })
    ]);

    expect(() =>
      deriveAttemptPromotionTarget({
        ...summary,
        comparableCandidateCount: -1
      })
    ).toThrow(
      "Attempt promotion target requires summary.comparableCandidateCount to be a non-negative integer."
    );
    expect(() =>
      deriveAttemptPromotionTarget({
        ...summary,
        comparableCandidateCount: 2
      })
    ).toThrow(
      "Attempt promotion target requires summary.comparableCandidateCount to be less than or equal to summary.candidateCount."
    );
  });

  it("should fail loudly when promotionReadyCandidateCount falls outside the light-validated range", () => {
    const summary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: [
            {
              name: "lint",
              required: true,
              status: "passed"
            }
          ]
        })
      })
    ]);

    expect(() =>
      deriveAttemptPromotionTarget({
        ...summary,
        promotionReadyCandidateCount: -1
      })
    ).toThrow(
      "Attempt promotion target requires summary.promotionReadyCandidateCount to be a non-negative integer."
    );
    expect(() =>
      deriveAttemptPromotionTarget({
        ...summary,
        promotionReadyCandidateCount: 2
      })
    ).toThrow(
      "Attempt promotion target requires summary.promotionReadyCandidateCount to be less than or equal to summary.candidateCount."
    );
  });

  it("should fail loudly when summary.blockingReasons do not match the canonical selected-candidate blockers", () => {
    const failedAndPendingSummary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_blocked",
        verification: createVerification({
          state: "failed",
          checks: [
            {
              name: "lint",
              required: true,
              status: "failed"
            },
            {
              name: "unit",
              required: true,
              status: "pending"
            }
          ]
        })
      })
    ]);
    const emptySummary = {
      ...createPromotionDecisionSummary([]),
      blockingReasons: ["verification_incomplete"]
    } as AttemptPromotionDecisionSummary;

    expect(() =>
      deriveAttemptPromotionTarget({
        ...failedAndPendingSummary,
        blockingReasons: [
          "required_checks_pending",
          "required_checks_failed"
        ]
      })
    ).toThrow(
      "Attempt promotion target requires summary.blockingReasons to match the canonical blocker derivation from summary.selected."
    );
    expect(() => deriveAttemptPromotionTarget(emptySummary)).toThrow(
      "Attempt promotion target requires summary.blockingReasons to match the canonical blocker derivation from summary.selected."
    );
  });

  it("should fail loudly when canPromote or hasBlockingReasons do not match summary.blockingReasons", () => {
    const readySummary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: [
            {
              name: "lint",
              required: true,
              status: "passed"
            }
          ]
        })
      })
    ]);
    const blockedSummary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_failed",
        verification: createVerification({
          state: "failed",
          checks: [
            {
              name: "lint",
              required: true,
              status: "failed"
            }
          ]
        })
      })
    ]);

    expect(() =>
      deriveAttemptPromotionTarget({
        ...readySummary,
        canPromote: false
      })
    ).toThrow(
      "Attempt promotion target requires summary.canPromote to match whether summary.blockingReasons is empty."
    );
    expect(() =>
      deriveAttemptPromotionTarget({
        ...blockedSummary,
        hasBlockingReasons: false
      })
    ).toThrow(
      "Attempt promotion target requires summary.hasBlockingReasons to match whether summary.blockingReasons is non-empty."
    );
  });

  it("should fail loudly when selected metadata is invalid", () => {
    const summary = createPromotionDecisionSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: [
            {
              name: "lint",
              required: true,
              status: "passed"
            }
          ]
        })
      })
    ]);

    expect(() =>
      deriveAttemptPromotionTarget({
        ...summary,
        selected: {
          ...summary.selected!,
          hasComparablePayload: "invalid"
        }
      } as unknown as AttemptPromotionDecisionSummary)
    ).toThrow(
      "Attempt promotion target requires summary.selected.hasComparablePayload to be a boolean."
    );
    expect(() =>
      deriveAttemptPromotionTarget({
        ...summary,
        selected: {
          ...summary.selected!,
          explanationCode: "promotion_ready"
        }
      })
    ).toThrow(
      'Attempt promotion target requires summary.selected.explanationCode to be "selected".'
    );
    expect(() =>
      deriveAttemptPromotionTarget({
        ...summary,
        selected: {
          ...summary.selected!,
          blockingRequiredCheckNames: ["lint", "   "]
        }
      })
    ).toThrow(
      "Attempt promotion target requires summary.selected.blockingRequiredCheckNames to use non-empty string entries."
    );
  });

  it("should not mutate the supplied decision summary and should return a fresh target object", () => {
    const summary = Object.freeze(
      createPromotionDecisionSummary([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
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
    );
    const snapshot = structuredClone(summary);

    const target = deriveAttemptPromotionTarget(summary);

    expect(summary).toEqual(snapshot);
    expect(target).toEqual({
      targetBasis: "promotion_decision_summary",
      taskId: "task_shared",
      attemptId: "att_ready",
      runtime: "codex-cli",
      status: "created",
      sourceKind: undefined
    });
    expect(target).not.toBe(summary as unknown);
  });

  it("should not leak blockers, explanation payloads, or runtime internals into the derived target", () => {
    const target = deriveAttemptPromotionTarget(
      createPromotionDecisionSummary([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
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
    );

    expect(target).toBeDefined();
    expect(target).not.toHaveProperty("blockingReasons");
    expect(target).not.toHaveProperty("canPromote");
    expect(target).not.toHaveProperty("hasBlockingReasons");
    expect(target).not.toHaveProperty("selected");
    expect(target).not.toHaveProperty("summary");
    expect(target).not.toHaveProperty("artifactSummary");
    expect(target).not.toHaveProperty("checks");
    expect(target).not.toHaveProperty("session");
    expect(target).not.toHaveProperty("controlPlane");
    expect(target).not.toHaveProperty("runtimeState");
  });
});

function createPromotionDecisionSummary(
  candidates: readonly AttemptPromotionCandidate[]
): AttemptPromotionDecisionSummary {
  return deriveAttemptPromotionDecisionSummary(
    deriveAttemptPromotionExplanationSummary(
      deriveAttemptPromotionReport(
        deriveAttemptPromotionAuditSummary(deriveAttemptPromotionResult(candidates))
      )
    )
  );
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

function createIncomparablePromotionCandidate(input: {
  attemptId: string;
  runtime: string;
  status: AttemptManifest["status"];
  sourceKind: AttemptManifest["sourceKind"];
}): AttemptPromotionCandidate {
  const summary: AttemptVerificationSummary = {
    sourceState: "unknown",
    overallOutcome: "incomplete",
    requiredOutcome: "incomplete",
    counts: {
      total: 0,
      valid: 0,
      invalid: 0,
      required: 0,
      optional: 0,
      passed: 0,
      failed: 0,
      pending: 0,
      skipped: 0,
      error: 0
    },
    hasInvalidChecks: false,
    hasComparablePayload: false,
    isSelectionReady: false
  };

  return {
    promotionBasis: "verification_artifact_summary",
    attemptId: input.attemptId,
    taskId: "task_shared",
    runtime: input.runtime,
    status: input.status,
    sourceKind: input.sourceKind,
    summary,
    artifactSummary: {
      summaryBasis: "verification_execution",
      summary,
      checks: [],
      blockingRequiredCheckNames: [],
      failedOrErrorCheckNames: [],
      pendingCheckNames: [],
      skippedCheckNames: [],
      passedCheckNames: [],
      recommendedForPromotion: false
    },
    recommendedForPromotion: false
  };
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
        checks: [
          {
            name: "lint",
            required: true,
            status: "passed"
          }
        ]
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
