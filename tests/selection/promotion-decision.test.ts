import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import {
  deriveAttemptPromotionAuditSummary,
  deriveAttemptPromotionCandidate,
  deriveAttemptPromotionDecisionSummary,
  deriveAttemptPromotionExplanationSummary,
  deriveAttemptPromotionReport,
  deriveAttemptPromotionResult
} from "../../src/selection/internal.js";
import type {
  AttemptPromotionCandidate,
  AttemptPromotionExplanationCandidate,
  AttemptPromotionExplanationSummary
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

describe("selection promotion-decision helpers", () => {
  it("should return a stable no-candidates decision summary for an empty explanation summary", () => {
    const summary = createPromotionExplanationSummary([]);

    expect(deriveAttemptPromotionDecisionSummary(summary)).toEqual({
      decisionBasis: "promotion_explanation_summary",
      taskId: undefined,
      selectedAttemptId: undefined,
      candidateCount: 0,
      comparableCandidateCount: 0,
      promotionReadyCandidateCount: 0,
      recommendedForPromotion: false,
      selected: undefined,
      blockingReasons: ["no_candidates"],
      canPromote: false,
      hasBlockingReasons: true
    });
  });

  it("should derive a promotable decision summary when the selected explanation candidate is ready", () => {
    const summary = createPromotionExplanationSummary([
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

    expect(deriveAttemptPromotionDecisionSummary(summary)).toEqual({
      decisionBasis: "promotion_explanation_summary",
      taskId: "task_shared",
      selectedAttemptId: "att_ready",
      candidateCount: 1,
      comparableCandidateCount: 1,
      promotionReadyCandidateCount: 1,
      recommendedForPromotion: true,
      selected: {
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "running",
        sourceKind: "delegated",
        hasComparablePayload: true,
        isSelected: true,
        recommendedForPromotion: true,
        explanationCode: "selected",
        blockingRequiredCheckNames: [],
        failedOrErrorCheckNames: [],
        pendingCheckNames: []
      },
      blockingReasons: [],
      canPromote: true,
      hasBlockingReasons: false
    });
  });

  it("should derive required_checks_failed when the selected explanation candidate has failed checks", () => {
    const summary = createPromotionExplanationSummary([
      createPromotionCandidate({
        attemptId: "att_blocked",
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

    const decision = deriveAttemptPromotionDecisionSummary(summary);

    expect(decision.canPromote).toBe(false);
    expect(decision.blockingReasons).toEqual(["required_checks_failed"]);
  });

  it("should derive required_checks_pending when the selected explanation candidate has pending checks", () => {
    const summary = createPromotionExplanationSummary([
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

    const decision = deriveAttemptPromotionDecisionSummary(summary);

    expect(decision.canPromote).toBe(false);
    expect(decision.blockingReasons).toEqual(["required_checks_pending"]);
  });

  it("should derive both failed and pending blockers in stable order", () => {
    const summary = createPromotionExplanationSummary([
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

    const decision = deriveAttemptPromotionDecisionSummary(summary);

    expect(decision.blockingReasons).toEqual([
      "required_checks_failed",
      "required_checks_pending"
    ]);
  });

  it("should derive verification_incomplete when the selected explanation candidate is not ready without failed or pending checks", () => {
    const summary = createPromotionExplanationSummary([
      createIncomparablePromotionCandidate({
        attemptId: "att_incomplete",
        status: "verified",
        runtime: "opencode",
        sourceKind: "fork"
      })
    ]);

    const decision = deriveAttemptPromotionDecisionSummary(summary);

    expect(decision.canPromote).toBe(false);
    expect(decision.blockingReasons).toEqual(["verification_incomplete"]);
  });

  it("should fail loudly when comparableCandidateCount drifts from explanation candidates", () => {
    const summary = {
      ...createPromotionExplanationSummary([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
            checks: []
          })
        }),
        createIncomparablePromotionCandidate({
          attemptId: "att_incomplete",
          status: "verified",
          runtime: "opencode",
          sourceKind: "fork"
        })
      ]),
      comparableCandidateCount: 0
    };

    expect(() => deriveAttemptPromotionDecisionSummary(summary)).toThrow(
      "Attempt promotion decision summary requires summary.comparableCandidateCount to match the count derived from summary.candidates."
    );
  });

  it("should fail loudly when summary.explanationBasis is invalid", () => {
    const summary = {
      ...createPromotionExplanationSummary([]),
      explanationBasis: "unexpected_basis"
    } as unknown as AttemptPromotionExplanationSummary;

    expect(() => deriveAttemptPromotionDecisionSummary(summary)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionDecisionSummary(summary)).toThrow(
      'Attempt promotion decision summary requires summary.explanationBasis to be "promotion_report".'
    );
  });

  it("should fail loudly when summary counts do not match canonical decision derivation", () => {
    const summary = createPromotionExplanationSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      })
    ]);

    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        candidateCount: 0
      })
    ).toThrow(
      "Attempt promotion decision summary requires summary.candidateCount to match summary.candidates.length."
    );
    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        comparableCandidateCount: 0,
      })
    ).toThrow(
      "Attempt promotion decision summary requires summary.comparableCandidateCount to match the count derived from summary.candidates."
    );
    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        promotionReadyCandidateCount: 0
      })
    ).toThrow(
      "Attempt promotion decision summary requires summary.promotionReadyCandidateCount to match the count derived from summary.candidates."
    );
    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        recommendedForPromotion: false
      })
    ).toThrow(
      "Attempt promotion decision summary requires summary.recommendedForPromotion to match the selected explanation candidate."
    );
  });

  it("should fail loudly when summary.selectedAttemptId or summary.selected does not match the first explanation candidate", () => {
    const summary = createPromotionExplanationSummary([
      createPromotionCandidate({
        attemptId: "att_b",
        verification: createVerification({
          state: "pending",
          checks: []
        })
      }),
      createPromotionCandidate({
        attemptId: "att_a",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      })
    ]);

    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        selectedAttemptId: "att_other"
      })
    ).toThrow(
      "Attempt promotion decision summary requires summary.selectedAttemptId to match the first candidate when candidates are present."
    );
    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        selected: summary.candidates[1]
      })
    ).toThrow(
      "Attempt promotion decision summary requires summary.selected to match the first candidate."
    );
  });

  it("should fail loudly when selected flags are inconsistent with canonical first-candidate semantics", () => {
    const summary = createPromotionExplanationSummary([
      createPromotionCandidate({
        attemptId: "att_b",
        verification: createVerification({
          state: "pending",
          checks: []
        })
      }),
      createPromotionCandidate({
        attemptId: "att_a",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      })
    ]);

    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        candidates: [
          {
            ...summary.candidates[0]!,
            isSelected: false
          },
          summary.candidates[1]!
        ]
      })
    ).toThrow(
      "Attempt promotion decision summary requires the first candidate to be selected."
    );
    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        candidates: [
          summary.candidates[0]!,
          {
            ...summary.candidates[1]!,
            isSelected: true
          }
        ]
      })
    ).toThrow(
      "Attempt promotion decision summary requires non-first candidates to be unselected."
    );
  });

  it("should fail loudly when comparableCandidateCount is not a valid light-checked integer", () => {
    const summary = createPromotionExplanationSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      })
    ]);

    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        comparableCandidateCount: -1
      })
    ).toThrow(
      "Attempt promotion decision summary requires summary.comparableCandidateCount to be a non-negative integer."
    );
    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        comparableCandidateCount: 2
      })
    ).toThrow(
      "Attempt promotion decision summary requires summary.comparableCandidateCount to be less than or equal to summary.candidateCount."
    );
  });

  it("should fail loudly when explanation candidate metadata is invalid", () => {
    const summary = createPromotionExplanationSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      })
    ]);

    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        candidates: [
          {
            ...summary.candidates[0]!,
            hasComparablePayload: "invalid",
          }
        ]
      } as unknown as AttemptPromotionExplanationSummary)
    ).toThrow(
      "Attempt promotion decision summary requires candidate.hasComparablePayload to be a boolean."
    );
    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        candidates: [
          {
            ...summary.candidates[0]!,
            explanationCode: "invalid"
          }
        ]
      } as unknown as AttemptPromotionExplanationSummary)
    ).toThrow(
      "Attempt promotion decision summary requires candidate.explanationCode to use the existing promotion explanation vocabulary."
    );
    expect(() =>
      deriveAttemptPromotionDecisionSummary({
        ...summary,
        candidates: [
          {
            ...summary.candidates[0]!,
            blockingRequiredCheckNames: ["lint", "   "]
          }
        ]
      })
    ).toThrow(
      "Attempt promotion decision summary requires candidate.blockingRequiredCheckNames to use non-empty string entries."
    );
  });

  it("should not mutate the supplied explanation summary or reuse selected references", () => {
    const summary = Object.freeze(
      createPromotionExplanationSummary([
        createPromotionCandidate({
          attemptId: "att_blocked",
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
      ])
    );
    const snapshot = structuredClone(summary);

    const decision = deriveAttemptPromotionDecisionSummary(summary);

    expect(summary).toEqual(snapshot);
    expect(decision.selected).not.toBe(summary.selected);
    expect(decision.selected).not.toBe(summary.candidates[0]);
    expect(decision.selected?.failedOrErrorCheckNames).not.toBe(
      summary.selected?.failedOrErrorCheckNames
    );
    expect(decision.blockingReasons).not.toBe(summary.candidates[0]?.failedOrErrorCheckNames);
  });

  it("should not leak candidate collections or runtime internals into the decision summary", () => {
    const decision = deriveAttemptPromotionDecisionSummary(
      createPromotionExplanationSummary([
        createPromotionCandidate({
          attemptId: "att_non_leaky",
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
      ])
    );

    expect(decision).not.toHaveProperty("candidates");
    expect(decision).not.toHaveProperty("summary");
    expect(decision).not.toHaveProperty("artifactSummary");
    expect(decision).not.toHaveProperty("checks");
    expect(decision).not.toHaveProperty("session");
    expect(decision).not.toHaveProperty("controlPlane");
    expect(decision).not.toHaveProperty("runtimeState");
    expect(decision.selected).not.toHaveProperty("summary");
    expect(decision.selected).not.toHaveProperty("artifactSummary");
  });
});

function createPromotionExplanationSummary(
  candidates: readonly AttemptPromotionCandidate[]
): AttemptPromotionExplanationSummary {
  return deriveAttemptPromotionExplanationSummary(
    deriveAttemptPromotionReport(
      deriveAttemptPromotionAuditSummary(deriveAttemptPromotionResult(candidates))
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
    sourceState: "pending",
    overallOutcome: "incomplete",
    requiredOutcome: "incomplete",
    counts: {
      total: 1,
      valid: 0,
      invalid: 1,
      required: 0,
      optional: 0,
      passed: 0,
      failed: 0,
      pending: 0,
      skipped: 0,
      error: 0
    },
    hasInvalidChecks: true,
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
