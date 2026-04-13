import { ValidationError } from "../core/errors.js";
import {
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import type {
  ExecutionSessionWaitRequest,
  ExecutionSessionWaitRequestInput
} from "./types.js";

export function deriveExecutionSessionWaitRequest(
  input: ExecutionSessionWaitRequestInput
): ExecutionSessionWaitRequest {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(
      "Execution session wait request input must be an object."
    );
  }

  const target = readRequiredBatchWrapperProperty<Record<string, unknown>>(
    input,
    "target",
    "Execution session wait request target must be an object."
  );

  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    throw new ValidationError(
      "Execution session wait request target must be an object."
    );
  }

  const timeoutMs = readOptionalBatchWrapperProperty<number>(
    input,
    "timeoutMs",
    "Execution session wait request timeoutMs must be a finite integer greater than 0."
  );

  return normalizeExecutionSessionWaitRequest({
    attemptId: readRequiredBatchWrapperProperty(
      target,
      "attemptId",
      "Execution session wait request attemptId must be a non-empty string."
    ),
    runtime: readRequiredBatchWrapperProperty(
      target,
      "runtime",
      "Execution session wait request runtime must be a non-empty string."
    ),
    sessionId: readRequiredBatchWrapperProperty(
      target,
      "sessionId",
      "Execution session wait request sessionId must be a non-empty string."
    ),
    ...(timeoutMs === undefined ? {} : { timeoutMs })
  } as ExecutionSessionWaitRequest);
}

export function normalizeExecutionSessionWaitRequest(
  value: ExecutionSessionWaitRequest
): ExecutionSessionWaitRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session wait request must be an object."
    );
  }

  const attemptId = normalizeRequiredIdentifier(
    value.attemptId,
    "Execution session wait request attemptId must be a non-empty string."
  );
  const runtime = normalizeRequiredIdentifier(
    value.runtime,
    "Execution session wait request runtime must be a non-empty string."
  );
  const sessionId = normalizeRequiredIdentifier(
    value.sessionId,
    "Execution session wait request sessionId must be a non-empty string."
  );
  const timeoutMs = normalizeTimeoutMs(value.timeoutMs);

  return {
    attemptId,
    runtime,
    sessionId,
    ...(timeoutMs === undefined ? {} : { timeoutMs })
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
