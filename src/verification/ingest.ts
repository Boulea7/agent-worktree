import { ValidationError } from "../core/errors.js";
import type { AttemptVerification } from "../manifest/types.js";
import {
  attemptVerificationCheckStatuses,
  type AttemptVerificationCheckInput,
  type AttemptVerificationCheckStatus,
  type AttemptVerificationPayloadInput
} from "./types.js";

const validStatuses = new Set<AttemptVerificationCheckStatus>(
  attemptVerificationCheckStatuses
);

export function deriveAttemptVerificationPayload(
  input: AttemptVerificationPayloadInput
): AttemptVerification {
  const state = normalizeState(input.state);
  const checks = normalizeChecks(input.checks);

  return {
    state,
    checks
  };
}

function normalizeChecks(
  checks: AttemptVerificationPayloadInput["checks"]
): AttemptVerification["checks"] {
  if (checks === undefined) {
    return [];
  }

  if (!Array.isArray(checks)) {
    throw new ValidationError(
      "Verification payload checks must be an array when provided."
    );
  }

  return checks.map((check) => normalizeCheck(check));
}

function normalizeCheck(value: unknown): AttemptVerificationCheckInput {
  if (!isRecord(value)) {
    throw new ValidationError("Verification check input must be an object.");
  }

  const name = normalizeNonEmptyString(value.name, "Verification check name");
  const status = normalizeStatus(value.status);
  const required =
    value.required === undefined
      ? false
      : normalizeBoolean(value.required, "Verification check required");

  return {
    name,
    status,
    required
  };
}

function normalizeStatus(value: unknown): AttemptVerificationCheckStatus {
  if (typeof value !== "string" || !validStatuses.has(value as AttemptVerificationCheckStatus)) {
    throw new ValidationError(
      "Verification check status must use the existing verification status vocabulary."
    );
  }

  return value as AttemptVerificationCheckStatus;
}

function normalizeState(value: unknown): string {
  if (value === undefined) {
    return "pending";
  }

  return normalizeNonEmptyString(value, "Verification payload state");
}

function normalizeBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${label} must be a boolean when provided.`);
  }

  return value;
}

function normalizeNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${label} must be a non-empty string.`);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(`${label} must be a non-empty string.`);
  }

  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
