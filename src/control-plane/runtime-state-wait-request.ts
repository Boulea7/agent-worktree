import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionWaitRequest,
  ExecutionSessionWaitRequestInput
} from "./types.js";

export function deriveExecutionSessionWaitRequest(
  input: ExecutionSessionWaitRequestInput
): ExecutionSessionWaitRequest {
  const attemptId = normalizeRequiredIdentifier(
    input.target.attemptId,
    "Execution session wait request attemptId must be a non-empty string."
  );
  const runtime = normalizeRequiredIdentifier(
    input.target.runtime,
    "Execution session wait request runtime must be a non-empty string."
  );
  const sessionId = normalizeRequiredIdentifier(
    input.target.sessionId,
    "Execution session wait request sessionId must be a non-empty string."
  );
  const timeoutMs = normalizeTimeoutMs(input.timeoutMs);

  return {
    attemptId,
    runtime,
    sessionId,
    ...(timeoutMs === undefined ? {} : { timeoutMs })
  };
}

function normalizeRequiredIdentifier(value: string, message: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}

function normalizeTimeoutMs(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(
      "Execution session wait request timeoutMs must be a finite integer greater than 0."
    );
  }

  return value;
}
