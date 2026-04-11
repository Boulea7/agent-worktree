import { ValidationError } from "../core/errors.js";
import { normalizeRequiredAttemptId } from "./derive.js";
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
  if (!isRecord(input)) {
    throw new ValidationError(
      "Execution session context input must be an object."
    );
  }

  if (!isRecord(input.view)) {
    throw new ValidationError(
      "Execution session context requires view to be an object."
    );
  }

  if (!isRecord(input.selector)) {
    throw new ValidationError(
      "Execution session context requires selector to be an object."
    );
  }

  const record = resolveExecutionSessionRecord(input.view, input.selector);

  if (record === undefined) {
    return undefined;
  }

  const normalizedRecord = normalizeContextRecord(
    record,
    "Execution session context record"
  );
  const parentRecord =
    normalizedRecord.parentAttemptId === undefined
      ? undefined
      : input.view.index.byAttemptId.get(normalizedRecord.parentAttemptId);
  const childRecords = listChildExecutionSessions(input.view, normalizedRecord.attemptId).map(
    (childRecord) =>
      normalizeContextRecord(
        childRecord,
        "Execution session context child record"
      )
  );
  const normalizedParentRecord =
    parentRecord === undefined
      ? undefined
      : normalizeContextRecord(
          parentRecord,
          "Execution session context parent record"
        );

  return {
    record: normalizedRecord,
    selectedBy: deriveSelectionKind(input),
    ...(normalizedParentRecord === undefined
      ? {}
      : { parentRecord: normalizedParentRecord }),
    childRecords,
    hasKnownSession: normalizedRecord.sessionId !== undefined,
    hasParent: normalizedRecord.parentAttemptId !== undefined,
    hasResolvedParent: normalizedParentRecord !== undefined,
    hasChildren: childRecords.length > 0
  };
}

function deriveSelectionKind(
  input: ExecutionSessionContextInput
): ExecutionSessionContextSelectionKind {
  return input.selector.attemptId !== undefined ? "attemptId" : "sessionId";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeContextRecord(
  record: ExecutionSessionContext["record"],
  context: string
): ExecutionSessionContext["record"] {
  return {
    ...record,
    attemptId: normalizeRequiredAttemptId(
      record.attemptId,
      `${context} attemptId must be a non-empty string.`
    ),
    ...(record.parentAttemptId === undefined
      ? {}
      : {
          parentAttemptId: normalizeRequiredAttemptId(
            record.parentAttemptId,
            `${context} parentAttemptId must be a non-empty string when present.`
          )
        }),
    ...(record.sessionId === undefined
      ? {}
      : {
          sessionId: normalizeRequiredAttemptId(
            record.sessionId,
            `${context} sessionId must be a non-empty string when present.`
          )
        })
  };
}
