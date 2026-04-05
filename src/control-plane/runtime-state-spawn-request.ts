import { ValidationError } from "../core/errors.js";
import { normalizeSessionGuardrails } from "./derive.js";
import type {
  ExecutionSessionSpawnRequest,
  ExecutionSessionSpawnRequestInput,
  ExecutionSessionSpawnRequestSourceKind
} from "./types.js";

export function deriveExecutionSessionSpawnRequest(
  input: ExecutionSessionSpawnRequestInput
): ExecutionSessionSpawnRequest | undefined {
  const sourceKind = normalizeSpawnRequestSourceKind(input.sourceKind);
  const {
    candidate: { context, readiness }
  } = input;

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
