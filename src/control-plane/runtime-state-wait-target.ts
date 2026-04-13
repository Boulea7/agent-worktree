import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import type {
  ExecutionSessionWaitTarget,
  ExecutionSessionWaitTargetInput
} from "./types.js";

export function deriveExecutionSessionWaitTarget(
  input: ExecutionSessionWaitTargetInput
): ExecutionSessionWaitTarget | undefined {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionWaitTargetInput>(
    input,
    "Execution session wait target input must be an object."
  );
  const candidate = readRequiredBatchWrapperProperty<
    ExecutionSessionWaitTargetInput["candidate"]
  >(
    normalizedInput,
    "candidate",
    "Execution session wait target requires candidate to be an object."
  );
  if (!isRecord(candidate)) {
    throw new ValidationError(
      "Execution session wait target requires candidate to be an object."
    );
  }
  const context = readRequiredBatchWrapperProperty(
    candidate,
    "context",
    "Execution session wait target requires candidate.context to be an object."
  );
  if (!isRecord(context)) {
    throw new ValidationError(
      "Execution session wait target requires candidate.context to be an object."
    );
  }
  const record = readRequiredBatchWrapperProperty(
    context,
    "record",
    "Execution session wait target requires candidate.context.record to be an object."
  );
  if (!isRecord(record)) {
    throw new ValidationError(
      "Execution session wait target requires candidate.context.record to be an object."
    );
  }
  const readiness = readRequiredBatchWrapperProperty(
    candidate,
    "readiness",
    "Execution session wait target requires candidate.readiness to be an object."
  );
  if (!isRecord(readiness)) {
    throw new ValidationError(
      "Execution session wait target requires candidate.readiness to be an object."
    );
  }
  const canWait = readRequiredBatchWrapperProperty(
    readiness,
    "canWait",
    "Execution session wait target requires candidate.readiness.canWait to be a boolean."
  );
  if (typeof canWait !== "boolean") {
    throw new ValidationError(
      "Execution session wait target requires candidate.readiness.canWait to be a boolean."
    );
  }

  const attemptId = normalizeRequiredString(
    record.attemptId,
    "Execution session wait target requires candidate.context.record.attemptId to be a non-empty string."
  );
  const runtime = normalizeRequiredString(
    record.runtime,
    "Execution session wait target requires candidate.context.record.runtime to be a non-empty string."
  );
  const sessionId = normalizeOptionalString(
    record.sessionId,
    "Execution session wait target requires candidate.context.record.sessionId to be a non-empty string when present."
  );

  if (!canWait || sessionId === undefined) {
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
