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

  const {
    candidate: { context, readiness }
  } = input;

  if (!readiness.canWait || context.record.sessionId === undefined) {
    return undefined;
  }

  return {
    attemptId: context.record.attemptId,
    runtime: context.record.runtime,
    sessionId: context.record.sessionId
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
