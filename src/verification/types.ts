export const attemptVerificationCheckStatuses = [
  "passed",
  "failed",
  "pending",
  "skipped",
  "error"
] as const;

export const attemptVerificationOverallOutcomes = [
  "passed",
  "pending",
  "failed",
  "incomplete"
] as const;

export const attemptVerificationRequiredOutcomes = [
  "satisfied",
  "pending",
  "failed",
  "incomplete"
] as const;

export type AttemptVerificationCheckStatus =
  (typeof attemptVerificationCheckStatuses)[number];

export type AttemptVerificationOverallOutcome =
  (typeof attemptVerificationOverallOutcomes)[number];

export type AttemptVerificationRequiredOutcome =
  (typeof attemptVerificationRequiredOutcomes)[number];

export interface AttemptVerificationCounts {
  total: number;
  valid: number;
  invalid: number;
  required: number;
  optional: number;
  passed: number;
  failed: number;
  pending: number;
  skipped: number;
  error: number;
}

export interface AttemptVerificationSummary {
  counts: AttemptVerificationCounts;
  hasComparablePayload: boolean;
  hasInvalidChecks: boolean;
  isSelectionReady: boolean;
  overallOutcome: AttemptVerificationOverallOutcome;
  requiredOutcome: AttemptVerificationRequiredOutcome;
  sourceState: string;
}

export interface AttemptVerificationCandidate {
  attemptId: string;
  summary: AttemptVerificationSummary;
}
