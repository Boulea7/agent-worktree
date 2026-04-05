import { ValidationError } from "../core/errors.js";
import { normalizeExecutionSessionSpawnRequest } from "./runtime-state-spawn-request.js";
import type {
  ExecutionSessionSpawnLineage,
  ExecutionSessionSpawnLineageInput,
  ExecutionSessionSpawnRequestSourceKind
} from "./types.js";

export function deriveExecutionSessionSpawnLineage(
  input: ExecutionSessionSpawnLineageInput
): ExecutionSessionSpawnLineage {
  const request = normalizeExecutionSessionSpawnRequest(input.request);
  const attemptId = normalizeRequiredIdentifier(
    input.childAttemptId,
    "Execution session spawn lineage childAttemptId must be a non-empty string."
  );
  const parentAttemptId = normalizeRequiredIdentifier(
    request.parentAttemptId,
    "Execution session spawn lineage parentAttemptId must be a non-empty string."
  );
  const sourceKind = normalizeSpawnLineageSourceKind(request.sourceKind);

  if (attemptId === parentAttemptId) {
    throw new ValidationError(
      "Execution session spawn lineage childAttemptId must not match parentAttemptId."
    );
  }

  const guardrails = request.inheritedGuardrails;

  return {
    attemptId,
    parentAttemptId,
    sourceKind,
    ...(guardrails === undefined ? {} : { guardrails })
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

function normalizeSpawnLineageSourceKind(
  sourceKind: unknown
): ExecutionSessionSpawnRequestSourceKind {
  if (typeof sourceKind !== "string") {
    throw new ValidationError(
      'Execution session spawn lineage sourceKind must be "fork" or "delegated".'
    );
  }

  const normalized = sourceKind.trim();

  if (normalized === "fork" || normalized === "delegated") {
    return normalized;
  }

  throw new ValidationError(
    'Execution session spawn lineage sourceKind must be "fork" or "delegated".'
  );
}
