import { ValidationError } from "../core/errors.js";
import type { AttemptVerification } from "../manifest/types.js";
import { deriveAttemptVerificationSummary } from "../verification/derive.js";
import type {
  AttemptVerificationArtifactCheck,
  AttemptVerificationArtifactSummary,
  AttemptVerificationCounts,
  AttemptVerificationSummary,
  AttemptVerificationCheckStatus
} from "../verification/types.js";
import { attemptVerificationCheckStatuses } from "../verification/types.js";

const validCheckStatuses = new Set<AttemptVerificationCheckStatus>(
  attemptVerificationCheckStatuses
);

export function validatePromotionArtifactSummaryCheckNameLists(input: {
  artifactSummary: AttemptVerificationArtifactSummary;
  errorPrefix: string;
  summaryField: string;
  verification?: AttemptVerification;
}): void {
  const { artifactSummary, errorPrefix, summaryField, verification } = input;
  const checks = normalizeArtifactChecks({
    checks: artifactSummary.checks,
    errorPrefix,
    summaryField
  });

  assertCheckNamesEqual({
    actual: artifactSummary.blockingRequiredCheckNames,
    expected: collectCheckNames(
      checks,
      (check) =>
        check.required &&
        (check.status === "failed" ||
          check.status === "error" ||
          check.status === "pending" ||
          check.status === "skipped")
    ),
    fieldName: "blockingRequiredCheckNames",
    errorPrefix,
    summaryField
  });

  assertCheckNamesEqual({
    actual: artifactSummary.failedOrErrorCheckNames,
    expected: collectCheckNames(
      checks,
      (check) => check.status === "failed" || check.status === "error"
    ),
    fieldName: "failedOrErrorCheckNames",
    errorPrefix,
    summaryField
  });

  assertCheckNamesEqual({
    actual: artifactSummary.pendingCheckNames,
    expected: collectCheckNames(
      checks,
      (check) => check.status === "pending"
    ),
    fieldName: "pendingCheckNames",
    errorPrefix,
    summaryField
  });

  assertCheckNamesEqual({
    actual: artifactSummary.skippedCheckNames,
    expected: collectCheckNames(
      checks,
      (check) => check.status === "skipped"
    ),
    fieldName: "skippedCheckNames",
    errorPrefix,
    summaryField
  });

  assertCheckNamesEqual({
    actual: artifactSummary.passedCheckNames,
    expected: collectCheckNames(
      checks,
      (check) => check.status === "passed"
    ),
    fieldName: "passedCheckNames",
    errorPrefix,
    summaryField
  });

  const canonicalSummary = deriveAttemptVerificationSummary({
    state: artifactSummary.summary.sourceState,
    checks: checks.map((check) => ({
      name: check.name,
      required: check.required,
      status: check.status
    }))
  });

  if (!summariesEqual(artifactSummary.summary, canonicalSummary)) {
    throw new ValidationError(
      `${errorPrefix} ${summaryField}.summary to match the summary derived from ${summaryField}.checks.`
    );
  }

  if (verification !== undefined) {
    assertChecksMatchVerification({
      artifactChecks: checks,
      verification,
      errorPrefix,
      summaryField
    });
  }
}

function assertCheckNamesEqual(input: {
  actual: readonly string[];
  expected: readonly string[];
  fieldName: string;
  errorPrefix: string;
  summaryField: string;
}): void {
  const { actual, expected, fieldName, errorPrefix, summaryField } = input;

  if (!stringArraysEqual(actual, expected)) {
    throw new ValidationError(
      `${errorPrefix} ${summaryField}.${fieldName} to match ${summaryField}.checks.`
    );
  }
}

function collectCheckNames(
  checks: readonly AttemptVerificationArtifactCheck[],
  predicate: (check: AttemptVerificationArtifactCheck) => boolean
): string[] {
  return checks.filter(predicate).map((check) => check.name);
}

function stringArraysEqual(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function summariesEqual(
  left: AttemptVerificationSummary,
  right: AttemptVerificationSummary
): boolean {
  return (
    left.sourceState === right.sourceState &&
    left.overallOutcome === right.overallOutcome &&
    left.requiredOutcome === right.requiredOutcome &&
    left.hasInvalidChecks === right.hasInvalidChecks &&
    left.hasComparablePayload === right.hasComparablePayload &&
    left.isSelectionReady === right.isSelectionReady &&
    countsEqual(left.counts, right.counts)
  );
}

function countsEqual(
  left: AttemptVerificationCounts,
  right: AttemptVerificationCounts
): boolean {
  return (
    left.total === right.total &&
    left.valid === right.valid &&
    left.invalid === right.invalid &&
    left.required === right.required &&
    left.optional === right.optional &&
    left.passed === right.passed &&
    left.failed === right.failed &&
    left.pending === right.pending &&
    left.skipped === right.skipped &&
    left.error === right.error
  );
}

function assertChecksMatchVerification(input: {
  artifactChecks: readonly AttemptVerificationArtifactCheck[];
  verification: AttemptVerification;
  errorPrefix: string;
  summaryField: string;
}): void {
  const { artifactChecks, verification, errorPrefix, summaryField } = input;

  if (!Array.isArray(verification.checks) || verification.checks.length !== artifactChecks.length) {
    throw new ValidationError(
      `${errorPrefix} ${summaryField}.checks to match manifest.verification.checks.`
    );
  }

  for (let index = 0; index < artifactChecks.length; index += 1) {
    const artifactCheck = artifactChecks[index];
    const verificationCheck = verification.checks[index];

    if (artifactCheck === undefined) {
      throw new ValidationError(
        `${errorPrefix} ${summaryField}.checks to match manifest.verification.checks.`
      );
    }

    if (
      typeof verificationCheck !== "object" ||
      verificationCheck === null ||
      Array.isArray(verificationCheck)
    ) {
      throw new ValidationError(
        `${errorPrefix} ${summaryField}.checks to match manifest.verification.checks.`
      );
    }

    const record = verificationCheck as {
      name?: unknown;
      required?: unknown;
      status?: unknown;
    };
    const verificationName =
      typeof record.name === "string" ? record.name.trim() : "";
    const verificationRequired = record.required ?? false;
    const verificationStatus = record.status;

    if (
      verificationName !== artifactCheck.name ||
      verificationRequired !== artifactCheck.required ||
      verificationStatus !== artifactCheck.status
    ) {
      throw new ValidationError(
        `${errorPrefix} ${summaryField}.checks to match manifest.verification.checks.`
      );
    }
  }
}

function normalizeArtifactChecks(input: {
  checks: unknown;
  errorPrefix: string;
  summaryField: string;
}): AttemptVerificationArtifactCheck[] {
  const { checks, errorPrefix, summaryField } = input;

  if (!Array.isArray(checks)) {
    throw new ValidationError(
      `${errorPrefix} ${summaryField}.checks to be an array.`
    );
  }

  return checks.map((check) =>
    normalizeArtifactCheck({
      check,
      errorPrefix,
      summaryField
    })
  );
}

function normalizeArtifactCheck(input: {
  check: unknown;
  errorPrefix: string;
  summaryField: string;
}): AttemptVerificationArtifactCheck {
  const { check, errorPrefix, summaryField } = input;

  if (typeof check !== "object" || check === null || Array.isArray(check)) {
    throw new ValidationError(
      `${errorPrefix} ${summaryField}.checks to use the existing verification check vocabulary.`
    );
  }

  const record = check as {
    name?: unknown;
    required?: unknown;
    status?: unknown;
  };
  const rawName = record.name;
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (
    name.length === 0 ||
    rawName !== name ||
    typeof record.required !== "boolean" ||
    typeof record.status !== "string" ||
    !validCheckStatuses.has(record.status as AttemptVerificationCheckStatus)
  ) {
    throw new ValidationError(
      `${errorPrefix} ${summaryField}.checks to use the existing verification check vocabulary.`
    );
  }

  return {
    name,
    required: record.required,
    status: record.status as AttemptVerificationCheckStatus
  };
}
