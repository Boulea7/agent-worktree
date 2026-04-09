import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import { deriveAttemptPromotionReport as deriveAttemptPromotionReportDirect } from "../../src/selection/promotion-report.js";
import {
  deriveAttemptPromotionAuditSummary,
  deriveAttemptPromotionCandidate,
  deriveAttemptPromotionReport,
  deriveAttemptPromotionResult
} from "../../src/selection/internal.js";
import type {
  AttemptPromotionAuditSummary,
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
  AttemptVerificationExecutionResult,
  AttemptVerificationSummary
} from "../../src/verification/internal.js";

describe("selection promotion-report helpers", () => {
  it("should return a stable empty promotion report for an empty audit summary", () => {
    const summary = deriveAttemptPromotionAuditSummary(
      deriveAttemptPromotionResult([])
    );

    expect(deriveAttemptPromotionReport(summary)).toEqual({
      reportBasis: "promotion_audit_summary",
      taskId: undefined,
      selectedAttemptId: undefined,
      candidateCount: 0,
      comparableCandidateCount: 0,
      promotionReadyCandidateCount: 0,
      recommendedForPromotion: false,
      candidates: [],
      selected: undefined,
      promotionReadyCandidates: [],
      nonPromotionReadyCandidates: [],
      pendingCandidates: []
    });
  });

  it("should derive a stable single-candidate promotion report", () => {
    const summary = createPromotionAuditSummary([
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

    expect(deriveAttemptPromotionReport(summary)).toEqual({
      reportBasis: "promotion_audit_summary",
      taskId: "task_shared",
      selectedAttemptId: "att_ready",
      candidateCount: 1,
      comparableCandidateCount: 1,
      promotionReadyCandidateCount: 1,
      recommendedForPromotion: true,
      candidates: [summary.candidates[0]],
      selected: summary.candidates[0],
      promotionReadyCandidates: [summary.candidates[0]],
      nonPromotionReadyCandidates: [],
      pendingCandidates: []
    });
  });

  it("should preserve skipped required checks on report candidates", () => {
    const summary = createPromotionAuditSummary([
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

    const report = deriveAttemptPromotionReport(summary);

    expect(report.candidates[0]?.skippedCheckNames).toEqual(["lint"]);
    expect(report.candidates[0]?.pendingCheckNames).toEqual(["unit"]);
  });

  it("should preserve candidate order while deriving grouped report projections", () => {
    const summary = createPromotionAuditSummary([
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

    const report = deriveAttemptPromotionReport(summary);

    expect(report.selectedAttemptId).toBe("att_ready");
    expect(report.candidates.map((candidate) => candidate.attemptId)).toEqual([
      "att_ready",
      "att_pending",
      "att_incomplete"
    ]);
    expect(
      report.promotionReadyCandidates.map((candidate) => candidate.attemptId)
    ).toEqual(["att_ready"]);
    expect(
      report.nonPromotionReadyCandidates.map((candidate) => candidate.attemptId)
    ).toEqual(["att_pending", "att_incomplete"]);
    expect(report.pendingCandidates.map((candidate) => candidate.attemptId)).toEqual(
      ["att_pending"]
    );
  });

  it("should fail loudly when summary.auditBasis is invalid", () => {
    const summary = {
      ...createPromotionAuditSummary([]),
      auditBasis: "unexpected_basis"
    } as unknown as AttemptPromotionAuditSummary;

    expect(() => deriveAttemptPromotionReport(summary)).toThrow(ValidationError);
    expect(() => deriveAttemptPromotionReport(summary)).toThrow(
      'Attempt promotion report requires summary.auditBasis to be "promotion_result".'
    );
  });

  it("should fail loudly when the supplied report summary container is malformed", () => {
    expect(() =>
      deriveAttemptPromotionReportDirect(null as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionReportDirect(null as never)
    ).toThrow("Attempt promotion report requires summary to be an object.");

    expect(() =>
      deriveAttemptPromotionReportDirect([] as never)
    ).toThrow("Attempt promotion report requires summary to be an object.");
  });

  it("should fail loudly when summary.candidates is malformed or sparse", () => {
    expect(() =>
      deriveAttemptPromotionReport({
        ...createPromotionAuditSummary([]),
        candidates: undefined as never
      })
    ).toThrow(
      "Attempt promotion report requires summary.candidates to be an array."
    );

    const sparseCandidates = new Array<AttemptPromotionAuditSummary["candidates"][number]>(1);

    expect(() =>
      deriveAttemptPromotionReport({
        ...createPromotionAuditSummary([]),
        candidateCount: 1,
        comparableCandidateCount: 0,
        promotionReadyCandidateCount: 0,
        selectedAttemptId: undefined,
        recommendedForPromotion: false,
        candidates: sparseCandidates as never
      })
    ).toThrow(
      "Attempt promotion report requires summary.candidates entries to be objects."
    );
  });

  it("should fail loudly when selectedAttemptId does not match the first candidate", () => {
    const summary = {
      ...createPromotionAuditSummary([
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

    expect(() => deriveAttemptPromotionReport(summary)).toThrow(ValidationError);
    expect(() => deriveAttemptPromotionReport(summary)).toThrow(
      "Attempt promotion report requires summary.selectedAttemptId to match the first candidate when candidates are present."
    );
  });

  it("should fail loudly when candidateCount does not match the supplied candidates", () => {
    const summary = {
      ...createPromotionAuditSummary([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
            checks: []
          })
        })
      ]),
      candidateCount: 0
    };

    expect(() => deriveAttemptPromotionReport(summary)).toThrow(ValidationError);
    expect(() => deriveAttemptPromotionReport(summary)).toThrow(
      "Attempt promotion report requires summary.candidateCount to match summary.candidates.length."
    );
  });

  it("should fail loudly when comparableCandidateCount does not match the derived count", () => {
    const summary = {
      ...createPromotionAuditSummary([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
            checks: []
          })
        })
      ]),
      comparableCandidateCount: 0
    };

    expect(() => deriveAttemptPromotionReport(summary)).toThrow(ValidationError);
    expect(() => deriveAttemptPromotionReport(summary)).toThrow(
      "Attempt promotion report requires summary.comparableCandidateCount to match the count derived from summary.candidates."
    );
  });

  it("should fail loudly when promotionReadyCandidateCount does not match the derived count", () => {
    const summary = {
      ...createPromotionAuditSummary([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
            checks: []
          })
        })
      ]),
      promotionReadyCandidateCount: 0
    };

    expect(() => deriveAttemptPromotionReport(summary)).toThrow(ValidationError);
    expect(() => deriveAttemptPromotionReport(summary)).toThrow(
      "Attempt promotion report requires summary.promotionReadyCandidateCount to match the count derived from summary.candidates."
    );
  });

  it("should fail loudly when recommendedForPromotion does not match the selected audit candidate", () => {
    const summary = {
      ...createPromotionAuditSummary([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
            checks: []
          })
        })
      ]),
      recommendedForPromotion: false
    };

    expect(() => deriveAttemptPromotionReport(summary)).toThrow(ValidationError);
    expect(() => deriveAttemptPromotionReport(summary)).toThrow(
      "Attempt promotion report requires summary.recommendedForPromotion to match the selected audit candidate."
    );
  });

  it("should fail loudly when candidate.recommendedForPromotion does not match candidate.summary.isSelectionReady", () => {
    const baseSummary = createPromotionAuditSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      })
    ]);
    const invalidSummary = {
      ...baseSummary,
      recommendedForPromotion: false,
      promotionReadyCandidateCount: 0,
      candidates: [
        {
          ...baseSummary.candidates[0],
          recommendedForPromotion: false
        }
      ]
    } as AttemptPromotionAuditSummary;

    expect(() => deriveAttemptPromotionReport(invalidSummary)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionReport(invalidSummary)).toThrow(
      "Attempt promotion report requires candidate.recommendedForPromotion to match candidate.summary.isSelectionReady."
    );
  });

  it("should fail loudly when candidate metadata is missing or invalid", () => {
    const baseSummary = createPromotionAuditSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      })
    ]);
    const blankAttemptIdSummary = {
      ...baseSummary,
      selectedAttemptId: "   ",
      candidates: [
        {
          ...baseSummary.candidates[0],
          attemptId: "   "
        }
      ]
    } as AttemptPromotionAuditSummary;
    const invalidStatusSummary = {
      ...baseSummary,
      candidates: [
        {
          ...baseSummary.candidates[0],
          status: "invalid"
        }
      ]
    } as unknown as AttemptPromotionAuditSummary;

    expect(() => deriveAttemptPromotionReport(blankAttemptIdSummary)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionReport(blankAttemptIdSummary)).toThrow(
      "Attempt promotion report requires candidate.attemptId to be a non-empty string."
    );
    expect(() => deriveAttemptPromotionReport(invalidStatusSummary)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionReport(invalidStatusSummary)).toThrow(
      "Attempt promotion report requires candidate.status to use the existing attempt status vocabulary."
    );
  });

  it("should fail loudly when summary.taskId is blank", () => {
    const summary = {
      ...createPromotionAuditSummary([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
            checks: []
          })
        })
      ]),
      taskId: "   "
    } as AttemptPromotionAuditSummary;

    expect(() => deriveAttemptPromotionReport(summary)).toThrow(ValidationError);
    expect(() => deriveAttemptPromotionReport(summary)).toThrow(
      "Attempt promotion report requires summary.taskId to be a non-empty string when provided."
    );
  });

  it("should fail loudly when summary.candidates contain duplicate attempt identities", () => {
    const summary = createPromotionAuditSummary([
      createPromotionCandidate({
        attemptId: "att_a",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      }),
      createPromotionCandidate({
        attemptId: "att_b",
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
      deriveAttemptPromotionReport({
        ...summary,
        candidates: [
          summary.candidates[0]!,
          {
            ...summary.candidates[1]!,
            attemptId: "att_a"
          }
        ]
      })
    ).toThrow(
      "Attempt promotion report requires summary.candidates to use unique candidate.attemptId values."
    );
  });

  it("should fail loudly when candidate check-name arrays are invalid", () => {
    const baseSummary = createPromotionAuditSummary([
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
    const invalidSummary = {
      ...baseSummary,
      candidates: [
        {
          ...baseSummary.candidates[0],
          pendingCheckNames: ["lint", "   "]
        }
      ]
    } as AttemptPromotionAuditSummary;

    expect(() => deriveAttemptPromotionReport(invalidSummary)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionReport(invalidSummary)).toThrow(
      "Attempt promotion report requires candidate.pendingCheckNames to use non-empty string entries."
    );
  });

  it("should fail loudly when candidate.summary is not an object", () => {
    const baseSummary = createPromotionAuditSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      })
    ]);
    const invalidSummary = {
      ...baseSummary,
      candidates: [
        {
          ...baseSummary.candidates[0],
          summary: undefined
        }
      ]
    } as unknown as AttemptPromotionAuditSummary;

    expect(() => deriveAttemptPromotionReport(invalidSummary)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionReport(invalidSummary)).toThrow(
      "Attempt promotion report requires candidate.summary to be an object."
    );
  });

  it("should fail loudly when candidate.summary uses an invalid verification outcome vocabulary", () => {
    const baseSummary = createPromotionAuditSummary([
      createPromotionCandidate({
        attemptId: "att_ready",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      })
    ]);
    const invalidSummary = {
      ...baseSummary,
      candidates: [
        {
          ...baseSummary.candidates[0],
          summary: {
            ...baseSummary.candidates[0]!.summary,
            overallOutcome: "bogus"
          }
        }
      ]
    } as unknown as AttemptPromotionAuditSummary;

    expect(() => deriveAttemptPromotionReport(invalidSummary)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionReport(invalidSummary)).toThrow(
      "Attempt promotion report requires candidate.summary.overallOutcome to use the existing verification overall-outcome vocabulary."
    );
  });

  it("should not mutate the supplied audit summary or reuse candidate array references", () => {
    const summary = Object.freeze(
      createPromotionAuditSummary([
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
    const snapshot = structuredClone(summary);

    const report = deriveAttemptPromotionReport(summary);

    expect(summary).toEqual(snapshot);
    expect(report.candidates).not.toBe(summary.candidates);
    expect(report.promotionReadyCandidates).not.toBe(summary.candidates);
    expect(report.nonPromotionReadyCandidates).not.toBe(summary.candidates);
    expect(report.pendingCandidates).not.toBe(summary.candidates);
    expect(report.candidates[0]).not.toBe(summary.candidates[0]);
    expect(report.candidates[0]?.pendingCheckNames).not.toBe(
      summary.candidates[0]?.pendingCheckNames
    );
  });

  it("should not leak artifact summaries, checks, or runtime internals into the report", () => {
    const report = deriveAttemptPromotionReport(
      createPromotionAuditSummary([
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

    expect(report).not.toHaveProperty("session");
    expect(report).not.toHaveProperty("controlPlane");
    expect(report).not.toHaveProperty("runtimeState");
    expect(report.candidates[0]).not.toHaveProperty("artifactSummary");
    expect(report.candidates[0]).not.toHaveProperty("checks");
    expect(report.selected).not.toHaveProperty("artifactSummary");
  });
});

function createPromotionAuditSummary(
  candidates: readonly AttemptPromotionCandidate[]
) {
  return deriveAttemptPromotionAuditSummary(
    deriveAttemptPromotionResult(candidates)
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
