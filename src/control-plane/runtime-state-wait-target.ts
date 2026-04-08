import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionWaitTarget,
  ExecutionSessionWaitTargetInput
} from "./types.js";

export function deriveExecutionSessionWaitTarget(
  input: ExecutionSessionWaitTargetInput
): ExecutionSessionWaitTarget | undefined {
  if (!isRecord(input)) {
    throw new ValidationError(
      "Execution session wait target input must be an object."
    );
  }

  if (!isRecord(input.candidate)) {
    throw new ValidationError(
      "Execution session wait target requires candidate to be an object."
    );
  }

  if (!isRecord(input.candidate.context)) {
    throw new ValidationError(
      "Execution session wait target requires candidate.context to be an object."
    );
  }

  if (!isRecord(input.candidate.context.record)) {
    throw new ValidationError(
      "Execution session wait target requires candidate.context.record to be an object."
    );
  }

  if (!isRecord(input.candidate.readiness)) {
    throw new ValidationError(
      "Execution session wait target requires candidate.readiness to be an object."
    );
  }

  if (typeof input.candidate.readiness.canWait !== "boolean") {
    throw new ValidationError(
      "Execution session wait target requires candidate.readiness.canWait to be a boolean."
    );
  }

  const {
    candidate: { context, readiness }
  } = input;

  const attemptId = normalizeRequiredString(
    context.record.attemptId,
    "Execution session wait target requires candidate.context.record.attemptId to be a non-empty string."
  );
  const runtime = normalizeRequiredString(
    context.record.runtime,
    "Execution session wait target requires candidate.context.record.runtime to be a non-empty string."
  );
  const sessionId = normalizeOptionalString(
    context.record.sessionId,
    "Execution session wait target requires candidate.context.record.sessionId to be a non-empty string when present."
  );

  if (!readiness.canWait || sessionId === undefined) {
    return undefined;
  }

  return {
    attemptId,
    runtime,
    sessionId
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(message);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}

function normalizeOptionalString(value: unknown, message: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return normalizeRequiredString(value, message);
}
