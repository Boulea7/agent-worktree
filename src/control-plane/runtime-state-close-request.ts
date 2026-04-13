import { ValidationError } from "../core/errors.js";
import { readRequiredBatchWrapperProperty } from "./runtime-state-batch-wrapper-guards.js";
import type {
  ExecutionSessionCloseRequest,
  ExecutionSessionCloseRequestInput
} from "./types.js";

export function deriveExecutionSessionCloseRequest(
  input: ExecutionSessionCloseRequestInput
): ExecutionSessionCloseRequest {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session close request input must be an object."
    );
  }

  const target = readRequiredBatchWrapperProperty<Record<string, unknown>>(
    input,
    "target",
    "Execution session close request target must be an object."
  );

  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    throw new ValidationError(
      "Execution session close request target must be an object."
    );
  }

  return normalizeExecutionSessionCloseRequest({
    attemptId: readRequiredBatchWrapperProperty(
      target,
      "attemptId",
      "Execution session close request attemptId must be a non-empty string."
    ),
    runtime: readRequiredBatchWrapperProperty(
      target,
      "runtime",
      "Execution session close request runtime must be a non-empty string."
    ),
    sessionId: readRequiredBatchWrapperProperty(
      target,
      "sessionId",
      "Execution session close request sessionId must be a non-empty string."
    )
  } as ExecutionSessionCloseRequest);
}

export function normalizeExecutionSessionCloseRequest(
  value: ExecutionSessionCloseRequest
): ExecutionSessionCloseRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session close request must be an object."
    );
  }

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
