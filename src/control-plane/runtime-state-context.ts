import {
  listChildExecutionSessions,
  resolveExecutionSessionRecord
} from "./runtime-state-view.js";
import type {
  ExecutionSessionContext,
  ExecutionSessionContextInput,
  ExecutionSessionContextSelectionKind
} from "./types.js";

export function deriveExecutionSessionContext(
  input: ExecutionSessionContextInput
): ExecutionSessionContext | undefined {
  const record = resolveExecutionSessionRecord(input.view, input.selector);

  if (record === undefined) {
    return undefined;
  }

  const parentRecord =
    record.parentAttemptId === undefined
      ? undefined
      : input.view.index.byAttemptId.get(record.parentAttemptId);
  const childRecords = listChildExecutionSessions(input.view, record.attemptId);

  return {
    record,
    selectedBy: deriveSelectionKind(input),
    ...(parentRecord === undefined ? {} : { parentRecord }),
    childRecords,
    hasKnownSession: record.sessionId !== undefined,
    hasParent: record.parentAttemptId !== undefined,
    hasResolvedParent: parentRecord !== undefined,
    hasChildren: childRecords.length > 0
  };
}

function deriveSelectionKind(
  input: ExecutionSessionContextInput
): ExecutionSessionContextSelectionKind {
  return input.selector.attemptId !== undefined ? "attemptId" : "sessionId";
}
