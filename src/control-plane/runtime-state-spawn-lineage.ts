import { ValidationError } from "../core/errors.js";
import { normalizeSessionGuardrails } from "./derive.js";
import type {
  ExecutionSessionSpawnLineage,
  ExecutionSessionSpawnLineageInput,
  ExecutionSessionSpawnRequestSourceKind
} from "./types.js";

export function deriveExecutionSessionSpawnLineage(
  input: ExecutionSessionSpawnLineageInput
): ExecutionSessionSpawnLineage {
  const attemptId = normalizeRequiredIdentifier(
    input.childAttemptId,
    "Execution session spawn lineage childAttemptId must be a non-empty string."
  );
  const parentAttemptId = normalizeRequiredIdentifier(
    input.request.parentAttemptId,
    "Execution session spawn lineage parentAttemptId must be a non-empty string."
  );
  const sourceKind = normalizeSpawnLineageSourceKind(input.request.sourceKind);

  if (attemptId === parentAttemptId) {
    throw new ValidationError(
      "Execution session spawn lineage childAttemptId must not match parentAttemptId."
    );
  }

  const guardrails = normalizeSessionGuardrails(
    input.request.inheritedGuardrails
  );

  return {
    attemptId,
    parentAttemptId,
    sourceKind,
    ...(guardrails === undefined ? {} : { guardrails })
  };
}

function normalizeRequiredIdentifier(value: string, message: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}

function normalizeSpawnLineageSourceKind(
  sourceKind: string
): ExecutionSessionSpawnRequestSourceKind {
  const normalized = sourceKind.trim();

  if (normalized === "fork" || normalized === "delegated") {
    return normalized;
  }

  throw new ValidationError(
    'Execution session spawn lineage sourceKind must be "fork" or "delegated".'
  );
}
