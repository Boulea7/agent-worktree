import type {
  ExecutionSessionWaitTarget,
  ExecutionSessionWaitTargetInput
} from "./types.js";

export function deriveExecutionSessionWaitTarget(
  input: ExecutionSessionWaitTargetInput
): ExecutionSessionWaitTarget | undefined {
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
