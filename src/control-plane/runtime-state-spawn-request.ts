import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { normalizeSessionGuardrails } from "./derive.js";
import type {
  ExecutionSessionSpawnRequest,
  ExecutionSessionSpawnRequestInput,
  ExecutionSessionSpawnRequestSourceKind
} from "./types.js";

export function deriveExecutionSessionSpawnRequest(
  input: ExecutionSessionSpawnRequestInput
): ExecutionSessionSpawnRequest | undefined {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionSpawnRequestInput>(
    input,
    "Execution session spawn request input must be an object."
  );
  const candidate = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnRequestInput["candidate"]
  >(
    normalizedInput,
    "candidate",
    "Execution session spawn request requires candidate to be an object."
  );
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    Array.isArray(candidate)
  ) {
    throw new ValidationError(
      "Execution session spawn request requires candidate to be an object."
    );
  }
  const sourceKind = normalizeSpawnRequestSourceKind(
    readRequiredBatchWrapperProperty(
      normalizedInput,
      "sourceKind",
      'Execution session spawn request sourceKind must be "fork" or "delegated".'
    )
  );
  const {
    candidate: { context, readiness }
  } = {
    candidate
  } as ExecutionSessionSpawnRequestInput;

  if (!readiness.canSpawn || context.record.sessionId === undefined) {
    return undefined;
  }

  return normalizeExecutionSessionSpawnRequest({
    parentAttemptId: context.record.attemptId,
    parentRuntime: context.record.runtime,
    parentSessionId: context.record.sessionId,
    sourceKind,
    ...(context.record.guardrails === undefined
      ? {}
      : { inheritedGuardrails: context.record.guardrails })
  });
}

export function normalizeExecutionSessionSpawnRequest(
  value: ExecutionSessionSpawnRequest
): ExecutionSessionSpawnRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session spawn request must be an object."
    );
  }

  const parentAttemptId = normalizeRequiredIdentifier(
    value.parentAttemptId,
    "Execution session spawn request parentAttemptId must be a non-empty string."
  );
  const parentRuntime = normalizeRequiredIdentifier(
    value.parentRuntime,
    "Execution session spawn request parentRuntime must be a non-empty string."
  );
  const parentSessionId = normalizeRequiredIdentifier(
    value.parentSessionId,
    "Execution session spawn request parentSessionId must be a non-empty string."
  );
  const sourceKind = normalizeSpawnRequestSourceKind(value.sourceKind);
  const inheritedGuardrails = normalizeSessionGuardrails(
    value.inheritedGuardrails
  );

  return {
    parentAttemptId,
    parentRuntime,
    parentSessionId,
    sourceKind,
    ...(inheritedGuardrails === undefined ? {} : { inheritedGuardrails })
  };
}

function normalizeSpawnRequestSourceKind(
  sourceKind: unknown
): ExecutionSessionSpawnRequestSourceKind {
  if (typeof sourceKind !== "string") {
    throw new ValidationError(
      'Execution session spawn request sourceKind must be "fork" or "delegated".'
    );
  }

  const normalized = sourceKind.trim();

  if (normalized === "fork" || normalized === "delegated") {
    return normalized;
  }

  throw new ValidationError(
    'Execution session spawn request sourceKind must be "fork" or "delegated".'
  );
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
