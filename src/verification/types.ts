import type {
  SubprocessFailureKind,
  SubprocessRunner
} from "../adapters/headless.js";
import type { AttemptVerification } from "../manifest/types.js";

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

export interface AttemptVerificationCheckInput {
  name: string;
  required?: boolean;
  status: AttemptVerificationCheckStatus;
}

export interface AttemptVerificationPayloadInput {
  checks?: readonly AttemptVerificationCheckInput[];
  state?: string;
}

export interface AttemptVerificationCommandCheck {
  args?: readonly string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  executable: string;
  name: string;
  required?: boolean;
  timeoutMs?: number;
}

export interface AttemptVerificationExecutedCheck {
  exitCode?: number;
  failureKind?: SubprocessFailureKind;
  name: string;
  required: boolean;
  status: AttemptVerificationCheckStatus;
}

export interface AttemptVerificationExecutionInput {
  checks: readonly AttemptVerificationCommandCheck[];
  runner?: SubprocessRunner;
}

export interface AttemptVerificationExecutionResult {
  checks: AttemptVerificationExecutedCheck[];
  summary: AttemptVerificationSummary;
  verification: AttemptVerification;
}
