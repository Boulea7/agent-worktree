import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import type {
  ExecutionSessionSpawnTarget,
  ExecutionSessionSpawnTargetInput
} from "./types.js";

export function deriveExecutionSessionSpawnTarget(
  input: ExecutionSessionSpawnTargetInput
): ExecutionSessionSpawnTarget | undefined {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionSpawnTargetInput>(
    input,
    "Execution session spawn target input must be an object."
  );
  const candidate = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnTargetInput["candidate"]
  >(
    normalizedInput,
    "candidate",
    "Execution session spawn target requires candidate to be an object."
  );
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    Array.isArray(candidate)
  ) {
    throw new ValidationError(
      "Execution session spawn target requires candidate to be an object."
    );
  }
  const {
    candidate: { context, readiness }
  } = {
    candidate
  } as ExecutionSessionSpawnTargetInput;

  if (!readiness.canSpawn || context.record.sessionId === undefined) {
    return undefined;
  }

  return {
    attemptId: context.record.attemptId,
    runtime: context.record.runtime,
    sessionId: context.record.sessionId
  };
}
