import { ValidationError } from "../core/errors.js";
import { normalizeRequiredAttemptId } from "./derive.js";
import { buildExecutionSessionIndex } from "./runtime-state.js";
import type {
  ExecutionSessionRecord,
  ExecutionSessionSelector,
  ExecutionSessionView
} from "./types.js";

export function buildExecutionSessionView(
  records: readonly ExecutionSessionRecord[]
): ExecutionSessionView {
  const childAttemptIdsByParent = new Map<string, string[]>();

  for (const record of records) {
    const attemptId = normalizeRequiredAttemptId(
      record.attemptId,
      "Execution session view attemptId must be a non-empty string."
    );
    const parentAttemptId = normalizeOptionalIdentifier(
      record.parentAttemptId,
      "Execution session view parentAttemptId must be a non-empty string when present."
    );

    if (parentAttemptId === undefined) {
      continue;
    }

    const childAttemptIds = childAttemptIdsByParent.get(parentAttemptId) ?? [];
    childAttemptIds.push(attemptId);
    childAttemptIdsByParent.set(parentAttemptId, childAttemptIds);
  }

  return {
    index: buildExecutionSessionIndex(records),
    childAttemptIdsByParent
  };
}

export function resolveExecutionSessionRecord(
  view: ExecutionSessionView,
  selector: ExecutionSessionSelector
): ExecutionSessionRecord | undefined {
  const normalizedSelector = normalizeSelector(selector);

  if ("attemptId" in normalizedSelector) {
    return view.index.byAttemptId.get(normalizedSelector.attemptId);
  }

  return view.index.bySessionId.get(normalizedSelector.sessionId);
}

export function listChildExecutionSessions(
  view: ExecutionSessionView,
  attemptId: string
): ExecutionSessionRecord[] {
  const normalizedAttemptId = normalizeRequiredIdentifier(
    attemptId,
    "Execution session view parent attemptId must be a non-empty string."
  );
  const childAttemptIds =
    view.childAttemptIdsByParent.get(normalizedAttemptId) ?? [];

  return childAttemptIds.flatMap((childAttemptId) => {
    const record = view.index.byAttemptId.get(childAttemptId);
    return record === undefined ? [] : [record];
  });
}

function normalizeSelector(
  selector: ExecutionSessionSelector
): { attemptId: string } | { sessionId: string } {
  const attemptId = normalizeOptionalIdentifier(
    selector.attemptId,
    "Execution session selector attemptId must be a non-empty string when present."
  );
  const sessionId = normalizeOptionalIdentifier(
    selector.sessionId,
    "Execution session selector sessionId must be a non-empty string when present."
  );

  if (attemptId === undefined && sessionId === undefined) {
    throw new ValidationError(
      "Execution session selector requires either attemptId or sessionId."
    );
  }

  if (attemptId !== undefined && sessionId !== undefined) {
    throw new ValidationError(
      "Execution session selector must not include both attemptId and sessionId."
    );
  }

  return attemptId !== undefined ? { attemptId } : { sessionId: sessionId! };
}

function normalizeOptionalIdentifier(
  value: string | undefined,
  message: string
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}

function normalizeRequiredIdentifier(value: string, message: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}
