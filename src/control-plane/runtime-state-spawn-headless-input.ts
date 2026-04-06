import { ValidationError } from "../core/errors.js";
import { normalizeSessionGuardrails } from "./derive.js";
import type {
  ExecutionSessionSpawnHeadlessInput,
  ExecutionSessionSpawnHeadlessInputInput,
  SessionGuardrails
} from "./types.js";
import {
  executionSessionSpawnRequestSourceKinds,
  type ExecutionSessionSpawnRequestSourceKind
} from "./types.js";

const validSpawnSourceKinds = new Set<ExecutionSessionSpawnRequestSourceKind>(
  executionSessionSpawnRequestSourceKinds
);

export function deriveExecutionSessionSpawnHeadlessInput(
  input: ExecutionSessionSpawnHeadlessInputInput
): ExecutionSessionSpawnHeadlessInput {
  const lineage = normalizeLineage(input.effects?.lineage);
  const { prompt, cwd, timeoutMs, abortSignal } = normalizeExecution(
    input.execution
  );

  return {
    prompt,
    ...(cwd === undefined ? {} : { cwd }),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    ...(abortSignal === undefined ? {} : { abortSignal }),
    attempt: lineage
  };
}

function normalizeExecution(
  value: ExecutionSessionSpawnHeadlessInputInput["execution"]
) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session spawn headless input requires execution to be an object."
    );
  }

  const prompt = validateRequiredString(
    value.prompt,
    "Execution session spawn headless input requires execution.prompt to be a non-empty string."
  );
  const cwd =
    value.cwd === undefined
      ? undefined
      : validateRequiredString(
          value.cwd,
          "Execution session spawn headless input requires execution.cwd to be a non-empty string when provided."
        );
  const timeoutMs = normalizeTimeoutMs(value.timeoutMs);
  const abortSignal =
    value.abortSignal === undefined
      ? undefined
      : normalizeAbortSignal(value.abortSignal);

  return {
    prompt,
    ...(cwd === undefined ? {} : { cwd }),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    ...(abortSignal === undefined ? {} : { abortSignal })
  };
}

function normalizeLineage(value: ExecutionSessionSpawnHeadlessInput["attempt"]) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session spawn headless input requires effects.lineage to be an object."
    );
  }

  const attemptId = validateRequiredString(
    value.attemptId,
    "Execution session spawn headless input requires effects.lineage.attemptId to be a non-empty string."
  );
  const parentAttemptId = validateRequiredString(
    value.parentAttemptId,
    "Execution session spawn headless input requires effects.lineage.parentAttemptId to be a non-empty string."
  );
  const sourceKind = normalizeSpawnSourceKind(
    value.sourceKind,
    "Execution session spawn headless input requires effects.lineage.sourceKind to use the existing spawn source-kind vocabulary when provided."
  );
  const guardrails = normalizeGuardrails(value.guardrails);

  return {
    attemptId,
    parentAttemptId,
    sourceKind,
    ...(guardrails === undefined ? {} : { guardrails })
  };
}

function normalizeTimeoutMs(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new ValidationError(
      "Execution session spawn headless input timeoutMs must be a finite integer greater than 0."
    );
  }

  return value;
}

function normalizeAbortSignal(value: unknown): AbortSignal {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    typeof (value as AbortSignal).aborted !== "boolean" ||
    typeof (value as AbortSignal).addEventListener !== "function" ||
    typeof (value as AbortSignal).removeEventListener !== "function"
  ) {
    throw new ValidationError(
      "Execution session spawn headless input requires execution.abortSignal to be an AbortSignal-like object when provided."
    );
  }

  return value as AbortSignal;
}

function normalizeGuardrails(value: unknown): SessionGuardrails | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "Execution session spawn headless input requires effects.lineage.guardrails to be an object when provided."
    );
  }

  const guardrails = value as {
    maxChildren?: unknown;
    maxDepth?: unknown;
  };
  const maxChildren =
    guardrails.maxChildren === undefined
      ? undefined
      : normalizePositiveInteger(
          guardrails.maxChildren,
          "Execution session spawn headless input requires effects.lineage.guardrails.maxChildren to be a finite integer greater than 0 when provided."
        );
  const maxDepth =
    guardrails.maxDepth === undefined
      ? undefined
      : normalizePositiveInteger(
          guardrails.maxDepth,
          "Execution session spawn headless input requires effects.lineage.guardrails.maxDepth to be a finite integer greater than 0 when provided."
        );

  return normalizeSessionGuardrails({
    ...(maxChildren === undefined ? {} : { maxChildren }),
    ...(maxDepth === undefined ? {} : { maxDepth })
  });
}

function normalizePositiveInteger(value: unknown, message: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new ValidationError(message);
  }

  return value;
}

function normalizeSpawnSourceKind(
  value: unknown,
  message: string
) : ExecutionSessionSpawnRequestSourceKind {
  if (
    typeof value !== "string" ||
    !validSpawnSourceKinds.has(value as ExecutionSessionSpawnRequestSourceKind)
  ) {
    throw new ValidationError(message);
  }

  return value as ExecutionSessionSpawnRequestSourceKind;
}

function validateRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(message);
  }

  if (value.trim().length === 0) {
    throw new ValidationError(message);
  }

  return value;
}
