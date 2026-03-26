import type { AttemptVerification } from "../manifest/types.js";
import type {
  AttemptVerificationCheckStatus,
  AttemptVerificationCounts,
  AttemptVerificationOverallOutcome,
  AttemptVerificationRequiredOutcome,
  AttemptVerificationSummary
} from "./types.js";

interface NormalizedVerificationCheck {
  name: string;
  required: boolean;
  status: AttemptVerificationCheckStatus;
}

const validStatuses = new Set<AttemptVerificationCheckStatus>([
  "passed",
  "failed",
  "pending",
  "skipped",
  "error"
]);

export function deriveAttemptVerificationSummary(
  verification: AttemptVerification
): AttemptVerificationSummary {
  const counts = createEmptyCounts();
  let hasRequiredFailure = false;
  let hasRequiredPending = false;
  let hasAnyFailure = false;
  let hasAnyPending = false;

  for (const check of verification.checks) {
    counts.total += 1;

    const normalizedCheck = normalizeVerificationCheck(check);
    if (normalizedCheck === null) {
      counts.invalid += 1;
      continue;
    }

    counts.valid += 1;

    if (normalizedCheck.required) {
      counts.required += 1;
    } else {
      counts.optional += 1;
    }

    counts[normalizedCheck.status] += 1;

    if (normalizedCheck.status === "failed" || normalizedCheck.status === "error") {
      hasAnyFailure = true;
      if (normalizedCheck.required) {
        hasRequiredFailure = true;
      }
    }

    if (normalizedCheck.status === "pending") {
      hasAnyPending = true;
      if (normalizedCheck.required) {
        hasRequiredPending = true;
      }
    }

    if (normalizedCheck.status === "skipped" && normalizedCheck.required) {
      hasRequiredFailure = true;
    }
  }

  const hasInvalidChecks = counts.invalid > 0;
  let overallOutcome: AttemptVerificationOverallOutcome;
  let requiredOutcome: AttemptVerificationRequiredOutcome;
  let hasComparablePayload = false;

  if (hasInvalidChecks) {
    overallOutcome = "incomplete";
    requiredOutcome = "incomplete";
  } else if (counts.valid === 0) {
    const fallback = deriveFallbackOutcomes(verification.state);
    overallOutcome = fallback.overallOutcome;
    requiredOutcome = fallback.requiredOutcome;
    hasComparablePayload = fallback.hasComparablePayload;
  } else {
    requiredOutcome = hasRequiredFailure
      ? "failed"
      : hasRequiredPending
        ? "pending"
        : "satisfied";
    overallOutcome = hasAnyFailure
      ? "failed"
      : hasAnyPending
        ? "pending"
        : "passed";
    hasComparablePayload = true;
  }

  return {
    sourceState: verification.state,
    overallOutcome,
    requiredOutcome,
    counts,
    hasInvalidChecks,
    hasComparablePayload,
    isSelectionReady:
      hasComparablePayload &&
      overallOutcome === "passed" &&
      requiredOutcome === "satisfied"
  };
}

function createEmptyCounts(): AttemptVerificationCounts {
  return {
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
  };
}

function normalizeVerificationCheck(
  value: unknown
): NormalizedVerificationCheck | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const status = value.status;
  const required = value.required;

  if (name.length === 0) {
    return null;
  }

  if (typeof status !== "string" || !validStatuses.has(status as AttemptVerificationCheckStatus)) {
    return null;
  }

  if (required !== undefined && typeof required !== "boolean") {
    return null;
  }

  return {
    name,
    status: status as AttemptVerificationCheckStatus,
    required: required ?? false
  };
}

function deriveFallbackOutcomes(state: string): {
  hasComparablePayload: boolean;
  overallOutcome: AttemptVerificationOverallOutcome;
  requiredOutcome: AttemptVerificationRequiredOutcome;
} {
  switch (state) {
    case "passed":
    case "verified":
      return {
        overallOutcome: "passed",
        requiredOutcome: "satisfied",
        hasComparablePayload: true
      };
    case "pending":
      return {
        overallOutcome: "pending",
        requiredOutcome: "pending",
        hasComparablePayload: true
      };
    case "failed":
    case "error":
      return {
        overallOutcome: "failed",
        requiredOutcome: "failed",
        hasComparablePayload: true
      };
    default:
      return {
        overallOutcome: "incomplete",
        requiredOutcome: "incomplete",
        hasComparablePayload: false
      };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
