import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import {
  deriveAttemptPromotionCandidate,
  deriveAttemptPromotionResult
} from "../../src/selection/internal.js";
import {
  deriveAttemptVerificationArtifactSummary,
  deriveAttemptVerificationSummary
} from "../../src/verification/internal.js";
import type {
  AttemptVerificationArtifactSummary,
  AttemptVerificationCheckStatus,
  AttemptVerificationExecutedCheck,
  AttemptVerificationSummary
} from "../../src/verification/internal.js";
import type {
  AttemptPromotionCandidate
} from "../../src/selection/internal.js";
import type {
  AttemptVerificationExecutionResult
} from "../../src/verification/internal.js";

describe("selection promotion-result helpers", () => {
  it("should fail loudly when the supplied candidate container is malformed or sparse", () => {
    expect(() => deriveAttemptPromotionResult(null as never)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult(null as never)).toThrow(
      "Attempt promotion result requires candidates to be an array."
    );

    expect(() =>
      deriveAttemptPromotionResult([null] as unknown as AttemptPromotionCandidate[])
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionResult([null] as unknown as AttemptPromotionCandidate[])
    ).toThrow(
      "Attempt promotion result requires candidates entries to be objects."
    );

    const sparseCandidates = new Array<AttemptPromotionCandidate>(1);

    expect(() => deriveAttemptPromotionResult(sparseCandidates)).toThrow(
      "Attempt promotion result requires candidates entries to be objects."
    );
  });

  it("should return a stable empty promotion result for an empty candidate list", () => {
    expect(deriveAttemptPromotionResult([])).toEqual({
      promotionResultBasis: "promotion_candidate",
      taskId: undefined,
      candidates: [],
      selected: undefined,
      comparableCandidateCount: 0,
      promotionReadyCandidateCount: 0,
      recommendedForPromotion: false
    });
  });

  it("should derive a stable single-candidate promotion result", () => {
    const candidate = createPromotionCandidate({
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
    });

    expect(deriveAttemptPromotionResult([candidate])).toEqual({
      promotionResultBasis: "promotion_candidate",
      taskId: "task_shared",
      candidates: [candidate],
      selected: candidate,
      comparableCandidateCount: 1,
      promotionReadyCandidateCount: 1,
      recommendedForPromotion: true
    });
  });

  it("should sort candidates best-first using the existing verification comparator only", () => {
    const candidates = [
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
          checks: [
            {
              name: "lint",
              required: true,
              status: "passed"
            }
          ]
        })
      }),
      createIncomparablePromotionCandidate({
        attemptId: "att_incomplete",
        status: "verified",
        runtime: "opencode",
        sourceKind: "fork"
      })
    ];

    const result = deriveAttemptPromotionResult(candidates);

    expect(result.candidates.map((candidate) => candidate.attemptId)).toEqual([
      "att_ready",
      "att_pending",
      "att_incomplete"
    ]);
    expect(result.selected?.attemptId).toBe("att_ready");
    expect(result.comparableCandidateCount).toBe(2);
    expect(result.promotionReadyCandidateCount).toBe(1);
    expect(result.recommendedForPromotion).toBe(true);
  });

  it("should ignore artifact-only differences when summaries are identical", () => {
    const candidateA = createPromotionCandidate({
      attemptId: "att_a",
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
    });
    const candidateB = createPromotionCandidate({
      attemptId: "att_b",
      verification: createVerification({
        state: "passed",
        checks: [
          {
            name: "unit",
            required: true,
            status: "passed"
          }
        ]
      })
    });

    const result = deriveAttemptPromotionResult([candidateB, candidateA]);

    expect(result.candidates.map((candidate) => candidate.attemptId)).toEqual([
      "att_a",
      "att_b"
    ]);
    expect(result.selected?.attemptId).toBe("att_a");
  });

  it("should fail loudly when candidates from different taskIds are mixed", () => {
    const candidates = [
      createPromotionCandidate({
        attemptId: "att_a",
        taskId: "task_a"
      }),
      createPromotionCandidate({
        attemptId: "att_b",
        taskId: "task_b"
      })
    ];

    expect(() => deriveAttemptPromotionResult(candidates)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult(candidates)).toThrow(
      "Attempt promotion result requires candidates from a single taskId."
    );
  });

  it("should fail loudly when candidates reuse a normalized canonical identity", () => {
    const candidates = [
      createPromotionCandidate({
        attemptId: "att_dup",
        runtime: "codex-cli"
      }),
      createPromotionCandidate({
        attemptId: " att_dup ",
        runtime: " codex-cli " as never,
        taskId: " task_shared "
      })
    ];

    expect(() => deriveAttemptPromotionResult(candidates)).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult(candidates)).toThrow(
      "Attempt promotion result requires candidates to use unique (taskId, attemptId, runtime) identities."
    );
  });

  it("should fail loudly when candidate.promotionBasis is invalid", () => {
    const candidate = {
      ...createPromotionCandidate({
        attemptId: "att_invalid_basis"
      }),
      promotionBasis: "unexpected_basis"
    } as unknown as AttemptPromotionCandidate;

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      'Attempt promotion result requires candidate.promotionBasis to be "verification_artifact_summary".'
    );
  });

  it("should fail loudly when candidate.artifactSummary.summaryBasis is invalid", () => {
    const candidate = {
      ...createPromotionCandidate({
        attemptId: "att_invalid_artifact_basis"
      }),
      artifactSummary: {
        ...createPromotionCandidate({
          attemptId: "att_shadow"
        }).artifactSummary,
        summaryBasis: "unexpected_basis"
      }
    } as unknown as AttemptPromotionCandidate;

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      'Attempt promotion result requires candidate.artifactSummary.summaryBasis to be "verification_execution".'
    );
  });

  it("should fail loudly when candidate metadata is missing or invalid", () => {
    const baseCandidate = createPromotionCandidate({
      attemptId: "att_metadata"
    });
    const blankAttemptIdCandidate = {
      ...baseCandidate,
      attemptId: "   "
    };
    const blankRuntimeCandidate = {
      ...baseCandidate,
      runtime: "   "
    };
    const invalidStatusCandidate = {
      ...baseCandidate,
      status: "invalid"
    } as unknown as AttemptPromotionCandidate;

    expect(() =>
      deriveAttemptPromotionResult([blankAttemptIdCandidate])
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionResult([blankAttemptIdCandidate])
    ).toThrow(
      "Attempt promotion result requires candidate.attemptId to be a non-empty string."
    );
    expect(() =>
      deriveAttemptPromotionResult([blankRuntimeCandidate])
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionResult([blankRuntimeCandidate])
    ).toThrow(
      "Attempt promotion result requires candidate.runtime to be a non-empty string."
    );
    expect(() =>
      deriveAttemptPromotionResult([invalidStatusCandidate])
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionResult([invalidStatusCandidate])
    ).toThrow(
      "Attempt promotion result requires candidate.status to use the existing attempt status vocabulary."
    );
  });

  it("should fail loudly when candidate.sourceKind uses values outside the existing vocabulary", () => {
    const candidate = {
      ...createPromotionCandidate({
        attemptId: "att_invalid_source_kind"
      }),
      sourceKind: "invalid"
    } as unknown as AttemptPromotionCandidate;

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      "Attempt promotion result requires candidate.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  });

  it("should fail loudly when candidate.summary does not match candidate.artifactSummary.summary", () => {
    const baseCandidate = createPromotionCandidate({
      attemptId: "att_summary_mismatch",
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
    });
    const candidate = {
      ...baseCandidate,
      artifactSummary: {
        ...baseCandidate.artifactSummary,
        summary: {
          ...baseCandidate.artifactSummary.summary,
          sourceState: "passed"
        }
      }
    };

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      "Attempt promotion result requires candidate.summary to match candidate.artifactSummary.summary."
    );
  });

  it("should fail loudly when candidate.recommendedForPromotion does not match candidate.summary.isSelectionReady", () => {
    const candidate = {
      ...createPromotionCandidate({
        attemptId: "att_summary_recommendation_mismatch"
      }),
      recommendedForPromotion: false
    };

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      "Attempt promotion result requires candidate.recommendedForPromotion to match candidate.summary.isSelectionReady."
    );
  });

  it("should fail loudly when candidate.recommendedForPromotion does not match candidate.artifactSummary.recommendedForPromotion", () => {
    const baseCandidate = createPromotionCandidate({
      attemptId: "att_artifact_recommendation_mismatch",
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
    });
    const candidate = {
      ...baseCandidate,
      artifactSummary: {
        ...baseCandidate.artifactSummary,
        recommendedForPromotion: false
      }
    };

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      "Attempt promotion result requires candidate.recommendedForPromotion to match candidate.artifactSummary.recommendedForPromotion."
    );
  });

  it("should fail loudly when candidate.artifactSummary.blockingRequiredCheckNames drifts from candidate.artifactSummary.checks", () => {
    const baseCandidate = createPromotionCandidate({
      attemptId: "att_blocking_required_drift",
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
    const candidate = {
      ...baseCandidate,
      artifactSummary: {
        ...baseCandidate.artifactSummary,
        blockingRequiredCheckNames: []
      }
    };

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      "Attempt promotion result requires candidate.artifactSummary.blockingRequiredCheckNames to match candidate.artifactSummary.checks."
    );
  });

  it("should fail loudly when candidate.artifactSummary.pendingCheckNames drifts from candidate.artifactSummary.checks", () => {
    const baseCandidate = createPromotionCandidate({
      attemptId: "att_pending_name_drift",
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
    });
    const candidate = {
      ...baseCandidate,
      artifactSummary: {
        ...baseCandidate.artifactSummary,
        pendingCheckNames: []
      }
    };

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      "Attempt promotion result requires candidate.artifactSummary.pendingCheckNames to match candidate.artifactSummary.checks."
    );
  });

  it("should fail loudly when candidate.summary and candidate.artifactSummary.summary drift together from candidate.artifactSummary.checks", () => {
    const baseCandidate = createPromotionCandidate({
      attemptId: "att_summary_checks_drift",
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
    });
    const driftedSummary = deriveAttemptVerificationSummary(
      createVerification({
        state: "failed",
        checks: [
          {
            name: "lint",
            required: true,
            status: "failed"
          }
        ]
      })
    );
    const candidate = {
      ...baseCandidate,
      summary: driftedSummary,
      artifactSummary: {
        ...baseCandidate.artifactSummary,
        summary: driftedSummary,
        recommendedForPromotion: false
      },
      recommendedForPromotion: false
    };

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      "Attempt promotion result requires candidate.artifactSummary.summary to match the summary derived from candidate.artifactSummary.checks."
    );
  });

  it("should fail loudly when candidate.artifactSummary.checks contain malformed entries even if candidate.summary and candidate.artifactSummary.summary still agree", () => {
    const baseCandidate = createPromotionCandidate({
      attemptId: "att_malformed_artifact_check_result",
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
    });
    const candidate = {
      ...baseCandidate,
      artifactSummary: {
        ...baseCandidate.artifactSummary,
        checks: [
          {
            name: "lint",
            required: true,
            status: "bogus"
          }
        ]
      }
    } as unknown as AttemptPromotionCandidate;

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      "Attempt promotion result requires candidate.artifactSummary.checks to use the existing verification check vocabulary."
    );
  });

  it("should fail loudly when candidate.artifactSummary.checks contain names with surrounding whitespace", () => {
    const baseCandidate = createPromotionCandidate({
      attemptId: "att_spaced_artifact_check_result",
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
    });
    const candidate = {
      ...baseCandidate,
      artifactSummary: {
        ...baseCandidate.artifactSummary,
        checks: [
          {
            name: " lint ",
            required: true,
            status: "passed"
          }
        ],
        passedCheckNames: ["lint"]
      }
    } as unknown as AttemptPromotionCandidate;

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      ValidationError
    );
    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      "Attempt promotion result requires candidate.artifactSummary.checks to use the existing verification check vocabulary."
    );
  });

  it("should fail loudly when candidate.artifactSummary.summary is malformed", () => {
    const baseCandidate = createPromotionCandidate({
      attemptId: "att_malformed_summary_result",
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
    });
    const candidate = {
      ...baseCandidate,
      artifactSummary: {
        ...baseCandidate.artifactSummary,
        summary: null as never
      }
    } as unknown as AttemptPromotionCandidate;

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      "Attempt promotion result requires candidate.artifactSummary.summary to be an object."
    );
  });

  it("should fail loudly when candidate.artifactSummary itself is malformed", () => {
    const candidate = {
      ...createPromotionCandidate({
        attemptId: "att_malformed_artifact_summary_result",
        verification: createVerification({
          state: "passed",
          checks: []
        })
      }),
      artifactSummary: null as never
    } as unknown as AttemptPromotionCandidate;

    expect(() => deriveAttemptPromotionResult([candidate])).toThrow(
      "Attempt promotion result requires candidate.artifactSummary to be an object."
    );
  });

  it("should not mutate candidates or the supplied candidate array", () => {
    const firstCandidate = Object.freeze(
      createPromotionCandidate({
        attemptId: "att_z",
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
    );
    const secondCandidate = Object.freeze(
      createPromotionCandidate({
        attemptId: "att_a",
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
    );
    const candidates = [firstCandidate, secondCandidate];
    const snapshot = structuredClone(candidates);

    expect(() => deriveAttemptPromotionResult(candidates)).not.toThrow();
    expect(candidates).toEqual(snapshot);
    expect(candidates.map((candidate) => candidate.attemptId)).toEqual([
      "att_z",
      "att_a"
    ]);
  });

  it("should not leak subprocess or runtime internals into the promotion result", () => {
    const candidates = [
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
    ];

    const result = deriveAttemptPromotionResult(candidates);

    expect(result).not.toHaveProperty("session");
    expect(result).not.toHaveProperty("controlPlane");
    expect(result).not.toHaveProperty("runtimeState");
    expect(result.selected).toBeDefined();
    expect(result.selected?.artifactSummary.checks[0]).not.toHaveProperty(
      "exitCode"
    );
    expect(result.selected?.artifactSummary.checks[0]).not.toHaveProperty(
      "failureKind"
    );
  });
});

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
  // This helper intentionally synthesizes an incomplete-but-consistent candidate
  // so aggregation tests can lock comparator behavior for non-comparable inputs.
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
