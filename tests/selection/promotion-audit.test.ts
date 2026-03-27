import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import {
  deriveAttemptPromotionAuditSummary,
  deriveAttemptPromotionCandidate,
  deriveAttemptPromotionResult
} from "../../src/selection/internal.js";
import type { AttemptPromotionResult } from "../../src/selection/internal.js";
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

describe("selection promotion-audit helpers", () => {
  it("should return a stable empty promotion audit summary for an empty promotion result", () => {
    expect(
      deriveAttemptPromotionAuditSummary(deriveAttemptPromotionResult([]))
    ).toEqual({
      auditBasis: "promotion_result",
      taskId: undefined,
      selectedAttemptId: undefined,
      candidateCount: 0,
      comparableCandidateCount: 0,
      promotionReadyCandidateCount: 0,
      recommendedForPromotion: false,
      candidates: []
    });
  });

  it("should derive a stable single-candidate promotion audit summary", () => {
    const candidate = createPromotionCandidate({
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
          },
          {
            name: "unit",
            required: true,
            status: "passed"
          },
          {
            name: "docs",
            required: false,
            status: "skipped"
          }
        ]
      })
    });
    const result = deriveAttemptPromotionResult([candidate]);

    expect(deriveAttemptPromotionAuditSummary(result)).toEqual({
      auditBasis: "promotion_result",
      taskId: "task_shared",
      selectedAttemptId: "att_ready",
      candidateCount: 1,
      comparableCandidateCount: 1,
      promotionReadyCandidateCount: 1,
      recommendedForPromotion: true,
      candidates: [
        {
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "running",
          sourceKind: "delegated",
          summary: candidate.summary,
          recommendedForPromotion: true,
          blockingRequiredCheckNames: [],
          failedOrErrorCheckNames: [],
          pendingCheckNames: []
        }
      ]
    });
  });

  it("should preserve blocking required skipped checks without throwing", () => {
    const candidate = createPromotionCandidate({
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
    });

    const summary = deriveAttemptPromotionAuditSummary(
      deriveAttemptPromotionResult([candidate])
    );

    expect(summary.candidates).toHaveLength(1);
    expect(summary.candidates[0]?.blockingRequiredCheckNames).toEqual(["lint"]);
    expect(summary.candidates[0]?.failedOrErrorCheckNames).toEqual([]);
    expect(summary.candidates[0]?.pendingCheckNames).toEqual([]);
  });

  it("should preserve promotion-result candidate order in the audit summary", () => {
    const result = deriveAttemptPromotionResult([
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

    const auditSummary = deriveAttemptPromotionAuditSummary(result);

    expect(auditSummary.selectedAttemptId).toBe("att_ready");
    expect(auditSummary.candidateCount).toBe(3);
    expect(auditSummary.comparableCandidateCount).toBe(2);
    expect(auditSummary.promotionReadyCandidateCount).toBe(1);
    expect(auditSummary.recommendedForPromotion).toBe(true);
    expect(auditSummary.candidates.map((candidate) => candidate.attemptId)).toEqual(
      ["att_ready", "att_pending", "att_incomplete"]
    );
  });

  it("should fail loudly when result.promotionResultBasis is invalid", () => {
    const result = {
      ...deriveAttemptPromotionResult([]),
      promotionResultBasis: "unexpected_basis"
    } as unknown as AttemptPromotionResult;

    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      'Attempt promotion audit summary requires result.promotionResultBasis to be "promotion_candidate".'
    );
  });

  it("should fail loudly when result.selected does not match the canonical promotion result", () => {
    const firstCandidate = createPromotionCandidate({
      attemptId: "att_b",
      verification: createVerification({
        state: "pending",
        checks: []
      })
    });
    const secondCandidate = createPromotionCandidate({
      attemptId: "att_a",
      verification: createVerification({
        state: "verified",
        checks: []
      })
    });
    const canonical = deriveAttemptPromotionResult([firstCandidate, secondCandidate]);
    const mismatched = {
      ...canonical,
      selected: canonical.candidates[1]
    };

    expect(() => deriveAttemptPromotionAuditSummary(mismatched)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionAuditSummary(mismatched)).toThrow(
      "Attempt promotion audit summary requires result.selected to match the canonical promotion result."
    );
  });

  it("should fail loudly when result.taskId does not match the canonical promotion result", () => {
    const result = {
      ...deriveAttemptPromotionResult([
        createPromotionCandidate({
          attemptId: "att_ready",
          verification: createVerification({
            state: "verified",
            checks: []
          })
        })
      ]),
      taskId: "task_other"
    };

    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      "Attempt promotion audit summary requires result.taskId to match the canonical promotion result."
    );
  });

  it("should fail loudly when comparableCandidateCount does not match the derived count", () => {
    const result = {
      ...deriveAttemptPromotionResult([
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

    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      "Attempt promotion audit summary requires result.comparableCandidateCount to match the count derived from result.candidates."
    );
  });

  it("should fail loudly when promotionReadyCandidateCount does not match the derived count", () => {
    const result = {
      ...deriveAttemptPromotionResult([
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

    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      "Attempt promotion audit summary requires result.promotionReadyCandidateCount to match the count derived from result.candidates."
    );
  });

  it("should fail loudly when result.recommendedForPromotion does not match the selected promotion candidate", () => {
    const result = {
      ...deriveAttemptPromotionResult([
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

    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      "Attempt promotion audit summary requires result.recommendedForPromotion to match the selected promotion candidate."
    );
  });

  it("should fail loudly when candidate order does not match the canonical promotion result", () => {
    const canonical = deriveAttemptPromotionResult([
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
    const mismatched = {
      ...canonical,
      candidates: [...canonical.candidates].reverse()
    };

    expect(() => deriveAttemptPromotionAuditSummary(mismatched)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionAuditSummary(mismatched)).toThrow(
      "Attempt promotion audit summary requires result.candidates to preserve canonical promotion-result ordering."
    );
  });

  it("should fail loudly when audit-visible artifact-summary name lists do not match artifactSummary.checks", () => {
    const candidate = createPromotionCandidate({
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
    });
    const result = deriveAttemptPromotionResult([
      {
        ...candidate,
        artifactSummary: {
          ...candidate.artifactSummary,
          blockingRequiredCheckNames: ["unit"]
        }
      }
    ]);

    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      "Attempt promotion audit summary requires candidate.artifactSummary.blockingRequiredCheckNames to match candidate.artifactSummary.checks."
    );
  });

  it("should fail loudly when candidate.sourceKind is outside the existing source-kind vocabulary", () => {
    const candidate = {
      ...createPromotionCandidate({
        attemptId: "att_invalid_source",
        verification: createVerification({
          state: "verified",
          checks: []
        })
      }),
      sourceKind: "bogus"
    };
    const result = deriveAttemptPromotionResult([
      candidate as unknown as ReturnType<typeof createPromotionCandidate>
    ]);

    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionAuditSummary(result)).toThrow(
      "Attempt promotion audit summary requires candidate.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  });

  it("should not mutate the supplied result, candidates, or artifact-summary name arrays", () => {
    const result = Object.freeze(
      deriveAttemptPromotionResult([
        Object.freeze(
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
                  name: "docs",
                  required: false,
                  status: "error"
                },
                {
                  name: "unit",
                  required: true,
                  status: "pending"
                }
              ]
            })
          })
        )
      ])
    );
    const snapshot = structuredClone(result);

    const auditSummary = deriveAttemptPromotionAuditSummary(result);

    expect(result).toEqual(snapshot);
    expect(auditSummary.candidates[0]?.blockingRequiredCheckNames).toEqual([
      "lint",
      "unit"
    ]);
    expect(auditSummary.candidates[0]?.failedOrErrorCheckNames).toEqual([
      "lint",
      "docs"
    ]);
    expect(auditSummary.candidates[0]?.pendingCheckNames).toEqual(["unit"]);
    expect(auditSummary.candidates[0]?.blockingRequiredCheckNames).not.toBe(
      result.candidates[0]?.artifactSummary.blockingRequiredCheckNames
    );
    expect(auditSummary.candidates[0]?.failedOrErrorCheckNames).not.toBe(
      result.candidates[0]?.artifactSummary.failedOrErrorCheckNames
    );
    expect(auditSummary.candidates[0]?.pendingCheckNames).not.toBe(
      result.candidates[0]?.artifactSummary.pendingCheckNames
    );
    expect(auditSummary.candidates[0]?.summary).not.toBe(
      result.candidates[0]?.summary
    );
  });

  it("should not leak subprocess, session, runtime-state, or full artifact summaries", () => {
    const result = deriveAttemptPromotionResult([
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
    ]);

    const auditSummary = deriveAttemptPromotionAuditSummary(result);

    expect(auditSummary).not.toHaveProperty("session");
    expect(auditSummary).not.toHaveProperty("controlPlane");
    expect(auditSummary).not.toHaveProperty("runtimeState");
    expect(auditSummary.candidates[0]).not.toHaveProperty("artifactSummary");
    expect(auditSummary.candidates[0]).not.toHaveProperty("checks");
    expect(auditSummary.candidates[0]?.summary).not.toHaveProperty("exitCode");
    expect(auditSummary.candidates[0]?.summary).not.toHaveProperty(
      "failureKind"
    );
  });
});

function createPromotionCandidate(
  overrides: Partial<AttemptManifest> & Pick<AttemptManifest, "attemptId"> & {
    verification?: AttemptVerification;
  }
) {
  const manifest = createManifest(overrides);
  const artifactSummary = createArtifactSummary(manifest.verification);

  return deriveAttemptPromotionCandidate(manifest, artifactSummary);
}

function createIncomparablePromotionCandidate(input: {
  attemptId: string;
  runtime: string;
  status: AttemptManifest["status"];
  sourceKind: AttemptManifest["sourceKind"];
}) {
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
    promotionBasis: "verification_artifact_summary" as const,
    attemptId: input.attemptId,
    taskId: "task_shared",
    runtime: input.runtime,
    status: input.status,
    sourceKind: input.sourceKind,
    summary,
    artifactSummary: {
      summaryBasis: "verification_execution" as const,
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
