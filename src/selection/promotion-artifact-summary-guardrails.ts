import { ValidationError } from "../core/errors.js";
import type {
  AttemptVerificationArtifactCheck,
  AttemptVerificationArtifactSummary
} from "../verification/types.js";

export function validatePromotionArtifactSummaryCheckNameLists(input: {
  artifactSummary: AttemptVerificationArtifactSummary;
  errorPrefix: string;
  summaryField: string;
}): void {
  const { artifactSummary, errorPrefix, summaryField } = input;
  const checks = artifactSummary.checks;

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
