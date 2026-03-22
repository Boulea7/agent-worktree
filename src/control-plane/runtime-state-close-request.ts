import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionCloseRequest,
  ExecutionSessionCloseRequestInput
} from "./types.js";

export function deriveExecutionSessionCloseRequest(
  input: ExecutionSessionCloseRequestInput
): ExecutionSessionCloseRequest {
  const attemptId = normalizeRequiredIdentifier(
    input.target.attemptId,
    "Execution session close request attemptId must be a non-empty string."
  );
  const runtime = normalizeRequiredIdentifier(
    input.target.runtime,
    "Execution session close request runtime must be a non-empty string."
  );
  const sessionId = normalizeRequiredIdentifier(
    input.target.sessionId,
    "Execution session close request sessionId must be a non-empty string."
  );

  return {
    attemptId,
    runtime,
    sessionId
  };
}

function normalizeRequiredIdentifier(value: string, message: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}
