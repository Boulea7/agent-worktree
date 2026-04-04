import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionCloseRequest,
  ExecutionSessionCloseRequestInput
} from "./types.js";

export function deriveExecutionSessionCloseRequest(
  input: ExecutionSessionCloseRequestInput
): ExecutionSessionCloseRequest {
  return normalizeExecutionSessionCloseRequest({
    attemptId: input.target.attemptId,
    runtime: input.target.runtime,
    sessionId: input.target.sessionId
  });
}

export function normalizeExecutionSessionCloseRequest(
  value: ExecutionSessionCloseRequest
): ExecutionSessionCloseRequest {
  const attemptId = normalizeRequiredIdentifier(
    value.attemptId,
    "Execution session close request attemptId must be a non-empty string."
  );
  const runtime = normalizeRequiredIdentifier(
    value.runtime,
    "Execution session close request runtime must be a non-empty string."
  );
  const sessionId = normalizeRequiredIdentifier(
    value.sessionId,
    "Execution session close request sessionId must be a non-empty string."
  );

  return {
    attemptId,
    runtime,
    sessionId
  };
}

function normalizeRequiredIdentifier(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(message);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}
