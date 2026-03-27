import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type { AttemptVerification } from "../../src/manifest/types.js";
import {
  deriveAttemptVerificationArtifactSummary,
  deriveAttemptVerificationPayload,
  deriveAttemptVerificationSummary
} from "../../src/verification/internal.js";
import type {
  AttemptVerificationCheckStatus,
  AttemptVerificationExecutedCheck,
  AttemptVerificationExecutionResult,
  AttemptVerificationSummary
} from "../../src/verification/internal.js";

describe("verification artifact summary helpers", () => {
  it("should derive a stable artifact summary when all required checks pass", () => {
    const result = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "passed",
          exitCode: 0
        }),
        createExecutedCheck({
          name: "unit",
          required: true,
          status: "passed",
          exitCode: 0
        }),
        createExecutedCheck({
          name: "docs",
          required: false,
          status: "skipped"
        })
      ]
    });

    expect(deriveAttemptVerificationArtifactSummary(result)).toEqual({
      summaryBasis: "verification_execution",
      summary: deriveAttemptVerificationSummary(result.verification),
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
      ],
      blockingRequiredCheckNames: [],
      failedOrErrorCheckNames: [],
      pendingCheckNames: [],
      skippedCheckNames: ["docs"],
      passedCheckNames: ["lint", "unit"],
      recommendedForPromotion: true
    });
  });

  it("should keep optional failures and errors out of blockingRequiredCheckNames", () => {
    const result = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "passed",
          exitCode: 0
        }),
        createExecutedCheck({
          name: "docs",
          required: false,
          status: "failed",
          exitCode: 2
        }),
        createExecutedCheck({
          name: "e2e",
          required: false,
          status: "error",
          failureKind: "timeout"
        })
      ]
    });

    const summary = deriveAttemptVerificationArtifactSummary(result);

    expect(summary.blockingRequiredCheckNames).toEqual([]);
    expect(summary.failedOrErrorCheckNames).toEqual(["docs", "e2e"]);
    expect(summary.recommendedForPromotion).toBe(false);
  });

  it("should collect required failed error and pending checks as blocking in input order", () => {
    const result = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "failed",
          exitCode: 1
        }),
        createExecutedCheck({
          name: "unit",
          required: true,
          status: "pending"
        }),
        createExecutedCheck({
          name: "smoke",
          required: true,
          status: "error",
          failureKind: "timeout"
        }),
        createExecutedCheck({
          name: "docs",
          required: false,
          status: "pending"
        })
      ]
    });

    expect(
      deriveAttemptVerificationArtifactSummary(result).blockingRequiredCheckNames
    ).toEqual(["lint", "unit", "smoke"]);
  });

  it("should treat a required skipped check as a blocking required check", () => {
    const result = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "skipped"
        }),
        createExecutedCheck({
          name: "docs",
          required: false,
          status: "passed",
          exitCode: 0
        })
      ]
    });

    expect(deriveAttemptVerificationArtifactSummary(result)).toEqual({
      summaryBasis: "verification_execution",
      summary: deriveAttemptVerificationSummary(result.verification),
      checks: [
        {
          name: "lint",
          required: true,
          status: "skipped"
        },
        {
          name: "docs",
          required: false,
          status: "passed"
        }
      ],
      blockingRequiredCheckNames: ["lint"],
      failedOrErrorCheckNames: [],
      pendingCheckNames: [],
      skippedCheckNames: ["lint"],
      passedCheckNames: ["docs"],
      recommendedForPromotion: false
    });
  });

  it("should collect passed pending and skipped check names without sorting or deduping", () => {
    const result = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "passed",
          exitCode: 0
        }),
        createExecutedCheck({
          name: "lint",
          required: false,
          status: "passed",
          exitCode: 0
        }),
        createExecutedCheck({
          name: "unit",
          required: true,
          status: "pending"
        }),
        createExecutedCheck({
          name: "docs",
          required: false,
          status: "skipped"
        })
      ]
    });

    const summary = deriveAttemptVerificationArtifactSummary(result);

    expect(summary.passedCheckNames).toEqual(["lint", "lint"]);
    expect(summary.pendingCheckNames).toEqual(["unit"]);
    expect(summary.skippedCheckNames).toEqual(["docs"]);
  });

  it("should set recommendedForPromotion from summary.isSelectionReady", () => {
    const readyResult = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "passed",
          exitCode: 0
        })
      ]
    });
    const blockedResult = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "pending"
        })
      ]
    });

    expect(
      deriveAttemptVerificationArtifactSummary(readyResult).recommendedForPromotion
    ).toBe(readyResult.summary.isSelectionReady);
    expect(
      deriveAttemptVerificationArtifactSummary(blockedResult).recommendedForPromotion
    ).toBe(blockedResult.summary.isSelectionReady);
  });

  it("should fail loudly when the supplied summary does not match the verification payload", () => {
    const result = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "passed",
          exitCode: 0
        })
      ],
      summary: createSummaryOverride({
        overallOutcome: "failed",
        requiredOutcome: "failed",
        isSelectionReady: false
      })
    });

    expect(() => deriveAttemptVerificationArtifactSummary(result)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when result.checks and result.verification.checks lengths differ", () => {
    const result = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "passed",
          exitCode: 0
        })
      ],
      verification: {
        state: "passed",
        checks: []
      }
    });

    expect(() => deriveAttemptVerificationArtifactSummary(result)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when a verification check name does not match its executed check", () => {
    const result = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "passed",
          exitCode: 0
        })
      ],
      verification: {
        state: "passed",
        checks: [
          {
            name: "unit",
            required: true,
            status: "passed"
          }
        ]
      }
    });

    expect(() => deriveAttemptVerificationArtifactSummary(result)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when a verification check required flag does not match its executed check", () => {
    const result = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "passed",
          exitCode: 0
        })
      ],
      verification: {
        state: "passed",
        checks: [
          {
            name: "lint",
            required: false,
            status: "passed"
          }
        ]
      }
    });

    expect(() => deriveAttemptVerificationArtifactSummary(result)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when a verification check status does not match its executed check", () => {
    const result = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "passed",
          exitCode: 0
        })
      ],
      verification: {
        state: "failed",
        checks: [
          {
            name: "lint",
            required: true,
            status: "failed"
          }
        ]
      }
    });

    expect(() => deriveAttemptVerificationArtifactSummary(result)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when a verification check is malformed under the existing normalization rules", () => {
    const verification = {
      state: "passed",
      checks: [
        {
          status: "passed",
          required: true
        }
      ]
    } satisfies AttemptVerification;
    const result = {
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "passed",
          exitCode: 0
        })
      ],
      verification,
      summary: deriveAttemptVerificationSummary(verification)
    } satisfies AttemptVerificationExecutionResult;

    expect(() => deriveAttemptVerificationArtifactSummary(result)).toThrow(
      ValidationError
    );
  });

  it("should fail loudly when a passed executed check carries contradictory execution metadata", () => {
    const result = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "passed",
          exitCode: 99,
          failureKind: "timeout"
        })
      ]
    });

    expect(() => deriveAttemptVerificationArtifactSummary(result)).toThrow(
      ValidationError
    );
  });

  it("should not mutate the supplied execution result", () => {
    const result = {
      checks: [
        Object.freeze(
          createExecutedCheck({
            name: "lint",
            required: true,
            status: "passed",
            exitCode: 0
          })
        ),
        Object.freeze(
          createExecutedCheck({
            name: "docs",
            required: false,
            status: "error",
            failureKind: "timeout"
          })
        )
      ],
      verification: {
        state: "failed",
        checks: [
          Object.freeze({
            name: "lint",
            required: true,
            status: "passed"
          }),
          Object.freeze({
            name: "docs",
            required: false,
            status: "error"
          })
        ]
      },
      summary: deriveAttemptVerificationSummary({
        state: "failed",
        checks: [
          {
            name: "lint",
            required: true,
            status: "passed"
          },
          {
            name: "docs",
            required: false,
            status: "error"
          }
        ]
      })
    } satisfies AttemptVerificationExecutionResult;
    const snapshot = structuredClone(result);

    expect(() => deriveAttemptVerificationArtifactSummary(result)).not.toThrow();
    expect(result).toEqual(snapshot);
  });

  it("should not leak execution internals into the artifact summary", () => {
    const result = createExecutionResult({
      checks: [
        createExecutedCheck({
          name: "lint",
          required: true,
          status: "failed",
          exitCode: 2
        }),
        createExecutedCheck({
          name: "e2e",
          required: false,
          status: "error",
          failureKind: "timeout"
        })
      ]
    });

    const summary = deriveAttemptVerificationArtifactSummary(result);

    expect(summary.checks).toEqual([
      {
        name: "lint",
        required: true,
        status: "failed"
      },
      {
        name: "e2e",
        required: false,
        status: "error"
      }
    ]);
    expect(summary.checks[0]).not.toHaveProperty("exitCode");
    expect(summary.checks[0]).not.toHaveProperty("stdout");
    expect(summary.checks[0]).not.toHaveProperty("stderr");
    expect(summary.checks[1]).not.toHaveProperty("failureKind");
    expect(summary).not.toHaveProperty("controlPlane");
    expect(summary).not.toHaveProperty("session");
    expect(summary).not.toHaveProperty("runtimeState");
  });

  it("should derive a stable empty artifact summary for an empty execution result", () => {
    const result = createExecutionResult({
      checks: []
    });

    expect(deriveAttemptVerificationArtifactSummary(result)).toEqual({
      summaryBasis: "verification_execution",
      summary: deriveAttemptVerificationSummary(result.verification),
      checks: [],
      blockingRequiredCheckNames: [],
      failedOrErrorCheckNames: [],
      pendingCheckNames: [],
      skippedCheckNames: [],
      passedCheckNames: [],
      recommendedForPromotion: false
    });
  });
});

function createExecutionResult(input: {
  checks: readonly AttemptVerificationExecutedCheck[];
  verification?: AttemptVerification;
  summary?: AttemptVerificationSummary;
}): AttemptVerificationExecutionResult {
  const verification =
    input.verification ??
    deriveAttemptVerificationPayload({
      state: deriveVerificationState(input.checks),
      checks: input.checks.map((check) => ({
        name: check.name,
        required: check.required,
        status: check.status
      }))
    });
  const summary =
    input.summary ?? deriveAttemptVerificationSummary(verification);

  return {
    checks: [...input.checks],
    verification,
    summary
  };
}

function createExecutedCheck(input: {
  name: string;
  required: boolean;
  status: AttemptVerificationCheckStatus;
  exitCode?: number;
  failureKind?: AttemptVerificationExecutedCheck["failureKind"];
}): AttemptVerificationExecutedCheck {
  return {
    name: input.name,
    required: input.required,
    status: input.status,
    ...(input.exitCode === undefined ? {} : { exitCode: input.exitCode }),
    ...(input.failureKind === undefined
      ? {}
      : { failureKind: input.failureKind })
  };
}

function deriveVerificationState(
  checks: readonly AttemptVerificationExecutedCheck[]
): string {
  if (checks.length === 0) {
    return "pending";
  }

  if (checks.some((check) => check.status === "failed" || check.status === "error")) {
    return "failed";
  }

  if (checks.some((check) => check.status === "pending")) {
    return "pending";
  }

  return "passed";
}

function createSummaryOverride(
  overrides: Partial<AttemptVerificationSummary>
): AttemptVerificationSummary {
  return {
    ...deriveAttemptVerificationSummary({
      state: "passed",
      checks: [
        {
          name: "lint",
          required: true,
          status: "passed"
        }
      ]
    }),
    ...overrides
  };
}
