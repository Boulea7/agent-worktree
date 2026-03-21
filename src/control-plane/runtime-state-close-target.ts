import type {
  ExecutionSessionCloseTarget,
  ExecutionSessionCloseTargetInput
} from "./types.js";

export function deriveExecutionSessionCloseTarget(
  input: ExecutionSessionCloseTargetInput
): ExecutionSessionCloseTarget | undefined {
  const {
    candidate: { context, readiness }
  } = input;

  if (!readiness.canClose || context.record.sessionId === undefined) {
    return undefined;
  }

  return {
    attemptId: context.record.attemptId,
    runtime: context.record.runtime,
    sessionId: context.record.sessionId
  };
}
