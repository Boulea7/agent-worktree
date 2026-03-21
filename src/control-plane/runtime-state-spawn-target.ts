import type {
  ExecutionSessionSpawnTarget,
  ExecutionSessionSpawnTargetInput
} from "./types.js";

export function deriveExecutionSessionSpawnTarget(
  input: ExecutionSessionSpawnTargetInput
): ExecutionSessionSpawnTarget | undefined {
  const {
    candidate: { context, readiness }
  } = input;

  if (!readiness.canSpawn || context.record.sessionId === undefined) {
    return undefined;
  }

  return {
    attemptId: context.record.attemptId,
    runtime: context.record.runtime,
    sessionId: context.record.sessionId
  };
}
