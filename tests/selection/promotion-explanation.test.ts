import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import {
  deriveAttemptPromotionAuditSummary,
  deriveAttemptPromotionCandidate,
  deriveAttemptPromotionExplanationSummary,
  deriveAttemptPromotionReport,
  deriveAttemptPromotionResult
} from "../../src/selection/internal.js";
import type {
  AttemptPromotionAuditSummary,
  AttemptPromotionCandidate,
  AttemptPromotionExplanationCandidate,
  AttemptPromotionReport
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

describe("selection promotion-explanation helpers", () => {
  it("should return a stable empty explanation summary for an empty promotion report", () => {
    const report = createPromotionReport([]);

    expect(deriveAttemptPromotionExplanationSummary(report)).toEqual({
      explanationBasis: "promotion_report",
      taskId: undefined,
      selectedAttemptId: undefined,
      candidateCount: 0,
      comparableCandidateCount: 0,
      promotionReadyCandidateCount: 0,
      recommendedForPromotion: false,
      selected: undefined,
      candidates: []
    });
  });

  it("should derive a stable single-candidate explanation summary", () => {
    const report = createPromotionReport([
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

    expect(deriveAttemptPromotionExplanationSummary(report)).toEqual({
      explanationBasis: "promotion_report",
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
      candidates: [
        {
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
        }
      ]
    });
  });

  it("should preserve report order while deriving explanation candidates", () => {
    const report = createPromotionReport([
      createPromotionCandidate({
        attemptId: "att_pending",
        status: "failed",
        runtime: "gemini-cli",
        sourceKind: "delegated",
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
      }),
      createPromotionCandidate({
        attemptId: "att_ready",
        status: "created",
        runtime: "codex-cli",
        sourceKind: "direct",
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
    ]);

    const explanation = deriveAttemptPromotionExplanationSummary(report);

    expect(explanation.selectedAttemptId).toBe("att_ready");
    expect(explanation.candidates.map((candidate) => candidate.attemptId)).toEqual([
      "att_ready",
      "att_pending",
      "att_incomplete"
    ]);
    expect(explanation.candidates.map((candidate) => candidate.explanationCode)).toEqual([
      "selected",
      "required_checks_pending",
      "verification_incomplete"
    ]);
  });

  it("should mark additional ready candidates as promotion_ready when they are not selected", () => {
    const report = createPromotionReport([
      createPromotionCandidate({
        attemptId: "att_b",
        verification: createVerification({
          state: "verified",
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

    const explanation = deriveAttemptPromotionExplanationSummary(report);

    expect(explanation.candidates).toHaveLength(2);
    expect(explanation.candidates[0]?.attemptId).toBe("att_a");
    expect(explanation.candidates[0]?.explanationCode).toBe("selected");
    expect(explanation.candidates[1]?.attemptId).toBe("att_b");
    expect(explanation.candidates[1]?.explanationCode).toBe("promotion_ready");
    expect(explanation.candidates[1]?.isSelected).toBe(false);
  });

  it("should derive required_checks_failed when required checks failed or errored", () => {
    const report = createPromotionReport([
      createPromotionCandidate({
        attemptId: "att_selected",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      }),
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

    const explanation = deriveAttemptPromotionExplanationSummary(report);
    const failedCandidate = explanation.candidates[1];

    expect(failedCandidate).toEqual({
      attemptId: "att_failed",
      runtime: "codex-cli",
      status: "created",
      sourceKind: undefined,
      hasComparablePayload: true,
      isSelected: false,
      recommendedForPromotion: false,
      explanationCode: "required_checks_failed",
      blockingRequiredCheckNames: ["lint"],
      failedOrErrorCheckNames: ["lint"],
      pendingCheckNames: []
    });
  });

  it("should keep the selected explanation code priority even when the selected candidate is blocked", () => {
    const report = createPromotionReport([
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

    const explanation = deriveAttemptPromotionExplanationSummary(report);

    expect(explanation.recommendedForPromotion).toBe(false);
    expect(explanation.selected?.explanationCode).toBe("selected");
    expect(explanation.selected?.failedOrErrorCheckNames).toEqual(["lint"]);
  });

  it("should derive required_checks_pending when required checks are pending", () => {
    const report = createPromotionReport([
      createPromotionCandidate({
        attemptId: "att_selected",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      }),
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

    const explanation = deriveAttemptPromotionExplanationSummary(report);
    const pendingCandidate = explanation.candidates[1];

    expect(pendingCandidate?.explanationCode).toBe("required_checks_pending");
    expect(pendingCandidate?.blockingRequiredCheckNames).toEqual(["lint"]);
    expect(pendingCandidate?.pendingCheckNames).toEqual(["lint"]);
  });

  it("should derive verification_incomplete when only optional checks failed", () => {
    const report = createPromotionReport([
      createPromotionCandidate({
        attemptId: "att_selected",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      }),
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

    const explanation = deriveAttemptPromotionExplanationSummary(report);

    expect(explanation.candidates[1]?.blockingRequiredCheckNames).toEqual([]);
    expect(explanation.candidates[1]?.failedOrErrorCheckNames).toEqual(["docs"]);
    expect(explanation.candidates[1]?.explanationCode).toBe(
      "verification_incomplete"
    );
  });

  it("should derive verification_incomplete when only optional checks are pending", () => {
    const report = createPromotionReport([
      createPromotionCandidate({
        attemptId: "att_selected",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      }),
      createPromotionCandidate({
        attemptId: "att_optional_pending",
        verification: createVerification({
          state: "pending",
          checks: [
            {
              name: "docs",
              required: false,
              status: "pending"
            }
          ]
        })
      })
    ]);

    const explanation = deriveAttemptPromotionExplanationSummary(report);

    expect(explanation.candidates[1]?.blockingRequiredCheckNames).toEqual([]);
    expect(explanation.candidates[1]?.pendingCheckNames).toEqual(["docs"]);
    expect(explanation.candidates[1]?.explanationCode).toBe(
      "verification_incomplete"
    );
  });

  it("should derive verification_incomplete for non-ready candidates without failed or pending required checks", () => {
    const report = createPromotionReport([
      createPromotionCandidate({
        attemptId: "att_selected",
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
    ]);

    const explanation = deriveAttemptPromotionExplanationSummary(report);

    expect(explanation.candidates[1]?.explanationCode).toBe(
      "verification_incomplete"
    );
  });

  it("should fail loudly when report.reportBasis is invalid", () => {
    const report = {
      ...createPromotionReport([]),
      reportBasis: "unexpected_basis"
    } as unknown as AttemptPromotionReport;

    expect(() => deriveAttemptPromotionExplanationSummary(report)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionExplanationSummary(report)).toThrow(
      'Attempt promotion explanation summary requires report.reportBasis to be "promotion_audit_summary".'
    );
  });

  it("should fail loudly when selectedAttemptId does not match the first report candidate", () => {
    const report = {
      ...createPromotionReport([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
            checks: []
          })
        })
      ]),
      selectedAttemptId: "att_other"
    };

    expect(() => deriveAttemptPromotionExplanationSummary(report)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionExplanationSummary(report)).toThrow(
      "Attempt promotion explanation summary requires report.selectedAttemptId to match the first candidate when candidates are present."
    );
  });

  it("should fail loudly when report.selected does not match the first report candidate", () => {
    const report = createPromotionReport([
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
    const mismatchedReport = {
      ...report,
      selected: report.candidates[1]
    };

    expect(() => deriveAttemptPromotionExplanationSummary(mismatchedReport)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionExplanationSummary(mismatchedReport)).toThrow(
      "Attempt promotion explanation summary requires report.selected to match the first candidate."
    );
  });

  it("should fail loudly when report counts do not match the canonical report candidate derivation", () => {
    const report = createPromotionReport([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      })
    ]);

    expect(() =>
      deriveAttemptPromotionExplanationSummary({
        ...report,
        candidateCount: 0
      })
    ).toThrow("Attempt promotion explanation summary requires report.candidateCount to match report.candidates.length.");
    expect(() =>
      deriveAttemptPromotionExplanationSummary({
        ...report,
        comparableCandidateCount: 0
      })
    ).toThrow(
      "Attempt promotion explanation summary requires report.comparableCandidateCount to match the count derived from report.candidates."
    );
    expect(() =>
      deriveAttemptPromotionExplanationSummary({
        ...report,
        promotionReadyCandidateCount: 0
      })
    ).toThrow(
      "Attempt promotion explanation summary requires report.promotionReadyCandidateCount to match the count derived from report.candidates."
    );
    expect(() =>
      deriveAttemptPromotionExplanationSummary({
        ...report,
        recommendedForPromotion: false
      })
    ).toThrow(
      "Attempt promotion explanation summary requires report.recommendedForPromotion to match the selected report candidate."
    );
  });

  it("should fail loudly when canonical report subgroups do not match the supplied report", () => {
    const report = createPromotionReport([
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
      }),
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
    ]);

    expect(() =>
      deriveAttemptPromotionExplanationSummary({
        ...report,
        promotionReadyCandidates: []
      })
    ).toThrow(
      "Attempt promotion explanation summary requires report.promotionReadyCandidates to match the stable filtered promotion-ready subgroup."
    );
    expect(() =>
      deriveAttemptPromotionExplanationSummary({
        ...report,
        nonPromotionReadyCandidates: []
      })
    ).toThrow(
      "Attempt promotion explanation summary requires report.nonPromotionReadyCandidates to match the stable filtered non-promotion-ready subgroup."
    );
    expect(() =>
      deriveAttemptPromotionExplanationSummary({
        ...report,
        pendingCandidates: []
      })
    ).toThrow(
      "Attempt promotion explanation summary requires report.pendingCandidates to match the stable filtered pending subgroup."
    );
    expect(() =>
      deriveAttemptPromotionExplanationSummary({
        ...report,
        nonPromotionReadyCandidates: [...report.nonPromotionReadyCandidates].reverse()
      })
    ).toThrow(
      "Attempt promotion explanation summary requires report.nonPromotionReadyCandidates to match the stable filtered non-promotion-ready subgroup."
    );
  });

  it("should fail loudly when report.taskId is neither a string nor undefined", () => {
    const report = {
      ...createPromotionReport([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
            checks: []
          })
        })
      ]),
      taskId: 123
    } as unknown as AttemptPromotionReport;

    expect(() => deriveAttemptPromotionExplanationSummary(report)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionExplanationSummary(report)).toThrow(
      "Attempt promotion explanation summary requires report.taskId to be a string when provided."
    );
  });

  it("should fail loudly when candidate.sourceKind falls outside the existing vocabulary", () => {
    const report = createPromotionReport([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      })
    ]);
    const invalidReport = {
      ...report,
      candidates: [
        {
          ...report.candidates[0],
          sourceKind: "invalid"
        }
      ]
    } as unknown as AttemptPromotionReport;

    expect(() => deriveAttemptPromotionExplanationSummary(invalidReport)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionExplanationSummary(invalidReport)).toThrow(
      "Attempt promotion explanation summary requires candidate.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  });

  it("should not mutate the supplied report or reuse candidate array references", () => {
    const report = Object.freeze(
      createPromotionReport([
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
      ])
    );
    const snapshot = structuredClone(report);

    const explanation = deriveAttemptPromotionExplanationSummary(report);

    expect(report).toEqual(snapshot);
    expect(explanation.candidates).not.toBe(report.candidates);
    expect(explanation.selected).not.toBe(report.selected);
    expect(explanation.candidates[0]).not.toBe(report.candidates[0]);
    expect(explanation.selected).not.toBe(explanation.candidates[0]);
    expect(explanation.candidates[0]?.blockingRequiredCheckNames).not.toBe(
      report.candidates[0]?.blockingRequiredCheckNames
    );
    expect(explanation.candidates[0]?.failedOrErrorCheckNames).not.toBe(
      report.candidates[0]?.failedOrErrorCheckNames
    );
    expect(explanation.candidates[0]?.pendingCheckNames).not.toBe(
      report.candidates[0]?.pendingCheckNames
    );
  });

  it("should not leak summary, artifact, check, or runtime internals into the explanation summary", () => {
    const explanation = deriveAttemptPromotionExplanationSummary(
      createPromotionReport([
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

    const selected = explanation.selected as AttemptPromotionExplanationCandidate;

    expect(explanation).not.toHaveProperty("summary");
    expect(explanation).not.toHaveProperty("artifactSummary");
    expect(explanation).not.toHaveProperty("checks");
    expect(explanation).not.toHaveProperty("session");
    expect(explanation).not.toHaveProperty("controlPlane");
    expect(explanation).not.toHaveProperty("runtimeState");
    expect(selected).not.toHaveProperty("summary");
    expect(selected).not.toHaveProperty("artifactSummary");
    expect(selected).not.toHaveProperty("checks");
    expect(selected).not.toHaveProperty("session");
  });
});

function createPromotionReport(
  candidates: readonly AttemptPromotionCandidate[]
): AttemptPromotionReport {
  return deriveAttemptPromotionReport(
    deriveAttemptPromotionAuditSummary(deriveAttemptPromotionResult(candidates))
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
