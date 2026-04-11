import type { RuntimeKind, SupportTier } from "../core/capabilities.js";

export const DEFAULT_MANIFEST_SCHEMA_VERSION = "0.x";

export const attemptStatuses = [
  "created",
  "running",
  "paused",
  "failed",
  "verified",
  "merged",
  "cleaned"
] as const;

export type AttemptStatus = (typeof attemptStatuses)[number];

export const attemptSourceKinds = [
  "direct",
  "resume",
  "fork",
  "delegated"
] as const;

export type AttemptSourceKind = (typeof attemptSourceKinds)[number];

export const attemptVerificationStates = [
  "pending",
  "passed",
  "verified",
  "failed",
  "error"
] as const;

export type AttemptVerificationState = (typeof attemptVerificationStates)[number];

export interface AttemptVerification {
  checks: unknown[];
  state: string;
  [key: string]: unknown;
}

export interface AttemptSession {
  backend: string;
  sessionId: string;
  [key: string]: unknown;
}

export interface AttemptTimestamps {
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface AttemptManifest {
  adapter: string;
  attemptId: string;
  parentAttemptId?: string;
  repoRoot?: string;
  runtime: RuntimeKind;
  schemaVersion: string;
  sourceKind?: AttemptSourceKind;
  status: AttemptStatus;
  taskId: string;
  verification: AttemptVerification;
  artifacts?: unknown[];
  baseRef?: string;
  branch?: string;
  session?: AttemptSession;
  supportTier?: SupportTier;
  timestamps?: AttemptTimestamps;
  worktreePath?: string;
  [key: string]: unknown;
}
