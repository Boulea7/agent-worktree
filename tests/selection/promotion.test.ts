import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptManifest,
  AttemptVerification
} from "../../src/manifest/types.js";
import { deriveAttemptPromotionCandidate } from "../../src/selection/internal.js";
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

describe("selection promotion helpers", () => {
  it("should derive a stable promotion candidate from manifest metadata and artifact summary", () => {
    const verification = createVerification({
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
    });
    const manifest = createManifest({
      attemptId: "att_ready",
      status: "running",
      runtime: "codex-cli",
      sourceKind: "delegated",
      verification
    });
    const artifactSummary = createArtifactSummary(verification);

    expect(deriveAttemptPromotionCandidate(manifest, artifactSummary)).toEqual({
      promotionBasis: "verification_artifact_summary",
      attemptId: "att_ready",
      taskId: "task_shared",
      runtime: "codex-cli",
      status: "running",
      sourceKind: "delegated",
      summary: deriveAttemptVerificationSummary(manifest.verification),
      artifactSummary,
      recommendedForPromotion: true
    });
  });

  it("should keep sourceKind undefined when the manifest omits it", () => {
    const verification = createVerification({
      state: "pending",
      checks: []
    });
    const manifest = createManifest({
      attemptId: "att_direct",
      verification
    });
    const artifactSummary = createArtifactSummary(verification);

    expect(
      deriveAttemptPromotionCandidate(manifest, artifactSummary).sourceKind
    ).toBeUndefined();
  });

  it("should set recommendedForPromotion directly from artifactSummary.recommendedForPromotion", () => {
    const verification = createVerification({
      state: "pending",
      checks: [
        {
          name: "lint",
          required: true,
          status: "pending"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_pending",
      verification
    });
    const artifactSummary = createArtifactSummary(verification);

    expect(
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
        .recommendedForPromotion
    ).toBe(artifactSummary.recommendedForPromotion);
  });

  it("should block promotion when a required check is skipped", () => {
    const verification = createVerification({
      state: "passed",
      checks: [
        {
          name: "lint",
          required: true,
          status: "skipped"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_required_skipped",
      verification
    });
    const artifactSummary = createArtifactSummary(verification);

    expect(deriveAttemptPromotionCandidate(manifest, artifactSummary)).toEqual({
      promotionBasis: "verification_artifact_summary",
      attemptId: "att_required_skipped",
      taskId: "task_shared",
      runtime: "codex-cli",
      status: "created",
      sourceKind: undefined,
      summary: deriveAttemptVerificationSummary(manifest.verification),
      artifactSummary,
      recommendedForPromotion: false
    });
  });

  it("should fail loudly when artifactSummary.summaryBasis is not verification_execution", () => {
    const verification = createVerification({
      state: "passed",
      checks: [
        {
          name: "lint",
          required: true,
          status: "passed"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_invalid_basis",
      verification
    });
    const artifactSummary = {
      ...createArtifactSummary(verification),
      summaryBasis: "unexpected_basis"
    } as unknown as AttemptVerificationArtifactSummary;

    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(
      'Attempt promotion candidate requires artifactSummary.summaryBasis to be "verification_execution".'
    );
  });

  it("should fail loudly when artifactSummary.summary does not match manifest.verification", () => {
    const verification = createVerification({
      state: "pending",
      checks: [
        {
          name: "lint",
          required: true,
          status: "pending"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_summary_mismatch",
      verification
    });
    const artifactSummary = {
      ...createArtifactSummary(verification),
      summary: {
        ...deriveAttemptVerificationSummary(verification),
        sourceState: "passed"
      }
    };

    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(
      "Attempt promotion candidate requires artifactSummary.summary to match the summary derived from manifest.verification."
    );
  });

  it("should fail loudly when artifactSummary.recommendedForPromotion does not match the summary derived from manifest.verification", () => {
    const artifactVerification = createVerification({
      state: "passed",
      checks: [
        {
          name: "lint",
          required: true,
          status: "passed"
        }
      ]
    });
    const manifestVerification = createVerification({
      state: "pending",
      checks: [
        {
          name: "lint",
          required: true,
          status: "pending"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_summary_mismatch",
      verification: manifestVerification
    });
    const artifactSummary = createArtifactSummary(artifactVerification);

    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(
      "Attempt promotion candidate requires artifactSummary.recommendedForPromotion to match the summary derived from manifest.verification."
    );
  });

  it("should fail loudly when artifactSummary.recommendedForPromotion does not match artifactSummary.summary.isSelectionReady", () => {
    const verification = createVerification({
      state: "passed",
      checks: [
        {
          name: "lint",
          required: true,
          status: "passed"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_artifact_mismatch",
      verification
    });
    const artifactSummary = {
      ...createArtifactSummary(verification),
      recommendedForPromotion: false
    };

    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(
      "Attempt promotion candidate requires artifactSummary.recommendedForPromotion to match artifactSummary.summary.isSelectionReady."
    );
  });

  it("should fail loudly when artifactSummary.blockingRequiredCheckNames drifts from artifactSummary.checks", () => {
    const verification = createVerification({
      state: "failed",
      checks: [
        {
          name: "lint",
          required: true,
          status: "failed"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_blocking_required_drift",
      verification
    });
    const artifactSummary = {
      ...createArtifactSummary(verification),
      blockingRequiredCheckNames: []
    };

    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(
      "Attempt promotion candidate requires artifactSummary.blockingRequiredCheckNames to match artifactSummary.checks."
    );
  });

  it("should fail loudly when artifactSummary.skippedCheckNames drifts from artifactSummary.checks", () => {
    const verification = createVerification({
      state: "failed",
      checks: [
        {
          name: "lint",
          required: true,
          status: "skipped"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_skipped_name_drift",
      verification
    });
    const artifactSummary = {
      ...createArtifactSummary(verification),
      skippedCheckNames: []
    };

    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(
      "Attempt promotion candidate requires artifactSummary.skippedCheckNames to match artifactSummary.checks."
    );
  });

  it("should fail loudly when artifactSummary.failedOrErrorCheckNames drifts from artifactSummary.checks", () => {
    const verification = createVerification({
      state: "failed",
      checks: [
        {
          name: "lint",
          required: true,
          status: "error"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_failed_or_error_name_drift",
      verification
    });
    const artifactSummary = {
      ...createArtifactSummary(verification),
      failedOrErrorCheckNames: []
    };

    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(
      "Attempt promotion candidate requires artifactSummary.failedOrErrorCheckNames to match artifactSummary.checks."
    );
  });

  it("should fail loudly when artifactSummary.checks drift from manifest.verification.checks even when artifactSummary.summary is rewritten to match the manifest", () => {
    const artifactVerification = createVerification({
      state: "passed",
      checks: [
        {
          name: "unit",
          required: true,
          status: "passed"
        }
      ]
    });
    const manifestVerification = createVerification({
      state: "passed",
      checks: [
        {
          name: "lint",
          required: true,
          status: "passed"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_checks_manifest_drift",
      verification: manifestVerification
    });
    const artifactSummary = {
      ...createArtifactSummary(artifactVerification),
      summary: deriveAttemptVerificationSummary(manifestVerification),
      recommendedForPromotion: true
    };

    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(
      "Attempt promotion candidate requires artifactSummary.checks to match manifest.verification.checks."
    );
  });

  it("should fail loudly when artifactSummary.passedCheckNames drifts from artifactSummary.checks", () => {
    const verification = createVerification({
      state: "passed",
      checks: [
        {
          name: "lint",
          required: true,
          status: "passed"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_passed_name_drift",
      verification
    });
    const artifactSummary = {
      ...createArtifactSummary(verification),
      passedCheckNames: []
    };

    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(
      "Attempt promotion candidate requires artifactSummary.passedCheckNames to match artifactSummary.checks."
    );
  });

  it("should fail loudly when artifactSummary.checks contain malformed check entries even if the summary remains self-consistent", () => {
    const verification = createVerification({
      state: "passed",
      checks: [
        {
          name: "lint",
          required: true,
          status: "passed"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_malformed_artifact_check",
      verification
    });
    const artifactSummary = {
      ...createArtifactSummary(verification),
      checks: [
        {
          name: "lint",
          required: true,
          status: "bogus"
        }
      ]
    } as unknown as AttemptVerificationArtifactSummary;

    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(
      "Attempt promotion candidate requires artifactSummary.checks to use the existing verification check vocabulary."
    );
  });

  it("should fail loudly when artifactSummary.checks contain names with surrounding whitespace", () => {
    const verification = createVerification({
      state: "passed",
      checks: [
        {
          name: "lint",
          required: true,
          status: "passed"
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_spaced_artifact_check",
      verification
    });
    const artifactSummary = {
      ...createArtifactSummary(verification),
      checks: [
        {
          name: " lint ",
          required: true,
          status: "passed"
        }
      ],
      passedCheckNames: ["lint"]
    } as unknown as AttemptVerificationArtifactSummary;

    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).toThrow(
      "Attempt promotion candidate requires artifactSummary.checks to use the existing verification check vocabulary."
    );
  });

  it("should fail loudly when manifest metadata is missing or invalid", () => {
    const verification = createVerification({
      state: "passed",
      checks: []
    });
    const artifactSummary = createArtifactSummary(verification);
    const blankAttemptIdManifest = createManifest({
      attemptId: "   ",
      verification
    });
    const invalidStatusManifest = {
      ...createManifest({
        attemptId: "att_invalid_status",
        verification
      }),
      status: "invalid"
    } as unknown as AttemptManifest;

    expect(() =>
      deriveAttemptPromotionCandidate(blankAttemptIdManifest, artifactSummary)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptPromotionCandidate(invalidStatusManifest, artifactSummary)
    ).toThrow(ValidationError);
  });

  it("should not mutate the supplied manifest or artifact summary", () => {
    const verification = {
      state: "failed",
      checks: [
        Object.freeze({
          name: "lint",
          required: true,
          status: "failed"
        }),
        Object.freeze({
          name: "docs",
          required: false,
          status: "skipped"
        })
      ]
    } satisfies AttemptVerification;
    const manifest = Object.freeze(
      createManifest({
        attemptId: "att_frozen",
        verification
      })
    );
    const artifactSummary = Object.freeze(createArtifactSummary(verification));
    const manifestSnapshot = structuredClone(manifest);
    const artifactSnapshot = structuredClone(artifactSummary);

    expect(() =>
      deriveAttemptPromotionCandidate(manifest, artifactSummary)
    ).not.toThrow();
    expect(manifest).toEqual(manifestSnapshot);
    expect(artifactSummary).toEqual(artifactSnapshot);
  });

  it("should not leak subprocess or runtime internals into the promotion candidate", () => {
    const verification = createVerification({
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
        }
      ]
    });
    const manifest = createManifest({
      attemptId: "att_non_leaky",
      verification
    });
    const artifactSummary = createArtifactSummary(verification);

    const candidate = deriveAttemptPromotionCandidate(manifest, artifactSummary);

    expect(candidate).not.toHaveProperty("session");
    expect(candidate).not.toHaveProperty("controlPlane");
    expect(candidate).not.toHaveProperty("runtimeState");
    expect(candidate.artifactSummary.checks[0]).not.toHaveProperty("exitCode");
    expect(candidate.artifactSummary.checks[0]).not.toHaveProperty("failureKind");
  });
});

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
