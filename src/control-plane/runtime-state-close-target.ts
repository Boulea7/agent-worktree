import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import type {
  ExecutionSessionCloseTarget,
  ExecutionSessionCloseTargetInput
} from "./types.js";

export function deriveExecutionSessionCloseTarget(
  input: ExecutionSessionCloseTargetInput
): ExecutionSessionCloseTarget | undefined {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionCloseTargetInput>(
    input,
    "Execution session close target input must be an object."
  );
  const candidate = readRequiredBatchWrapperProperty<
    ExecutionSessionCloseTargetInput["candidate"]
  >(
    normalizedInput,
    "candidate",
    "Execution session close target requires candidate to be an object."
  );
  if (!isRecord(candidate)) {
    throw new ValidationError(
      "Execution session close target requires candidate to be an object."
    );
  }
  const context = readRequiredBatchWrapperProperty(
    candidate,
    "context",
    "Execution session close target requires candidate.context to be an object."
  );
  if (!isRecord(context)) {
    throw new ValidationError(
      "Execution session close target requires candidate.context to be an object."
    );
  }
  const record = readRequiredBatchWrapperProperty(
    context,
    "record",
    "Execution session close target requires candidate.context.record to be an object."
  );
  if (!isRecord(record)) {
    throw new ValidationError(
      "Execution session close target requires candidate.context.record to be an object."
    );
  }
  const readiness = readRequiredBatchWrapperProperty(
    candidate,
    "readiness",
    "Execution session close target requires candidate.readiness to be an object."
  );
  if (!isRecord(readiness)) {
    throw new ValidationError(
      "Execution session close target requires candidate.readiness to be an object."
    );
  }
  const canClose = readRequiredBatchWrapperProperty(
    readiness,
    "canClose",
    "Execution session close target requires candidate.readiness.canClose to be a boolean."
  );
  if (typeof canClose !== "boolean") {
    throw new ValidationError(
      "Execution session close target requires candidate.readiness.canClose to be a boolean."
    );
  }

  const attemptId = normalizeRequiredString(
    readRequiredBatchWrapperProperty(
      record,
      "attemptId",
      "Execution session close target requires candidate.context.record.attemptId to be a non-empty string."
    ),
    "Execution session close target requires candidate.context.record.attemptId to be a non-empty string."
  );
  const runtime = normalizeRequiredString(
    readRequiredBatchWrapperProperty(
      record,
      "runtime",
      "Execution session close target requires candidate.context.record.runtime to be a non-empty string."
    ),
    "Execution session close target requires candidate.context.record.runtime to be a non-empty string."
  );
  const sessionId = normalizeOptionalString(
    readOptionalBatchWrapperProperty(
      record,
      "sessionId",
      "Execution session close target requires candidate.context.record.sessionId to be a non-empty string when present."
    ),
    "Execution session close target requires candidate.context.record.sessionId to be a non-empty string when present."
  );

  if (!canClose || sessionId === undefined) {
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
