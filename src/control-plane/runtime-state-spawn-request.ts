import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionSpawnRequest,
  ExecutionSessionSpawnRequestInput,
  ExecutionSessionSpawnRequestSourceKind
} from "./types.js";

export function deriveExecutionSessionSpawnRequest(
  input: ExecutionSessionSpawnRequestInput
): ExecutionSessionSpawnRequest | undefined {
  const {
    candidate: { context, readiness }
  } = input;

  if (!readiness.canSpawn || context.record.sessionId === undefined) {
    return undefined;
  }

  const sourceKind = normalizeSpawnRequestSourceKind(input.sourceKind);

  return {
    parentAttemptId: context.record.attemptId,
    parentRuntime: context.record.runtime,
    parentSessionId: context.record.sessionId,
    sourceKind,
    ...(context.record.guardrails === undefined
      ? {}
      : { inheritedGuardrails: context.record.guardrails })
  };
}

function normalizeSpawnRequestSourceKind(
  sourceKind: string
): ExecutionSessionSpawnRequestSourceKind {
  const normalized = sourceKind.trim();

  if (normalized === "fork" || normalized === "delegated") {
    return normalized;
  }

  throw new ValidationError(
    'Execution session spawn request sourceKind must be "fork" or "delegated".'
  );
}
