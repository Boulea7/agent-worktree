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
  if (!Array.isArray(records)) {
    throw new ValidationError("Execution session view records must be an array.");
  }

  const childAttemptIdsByParent = new Map<string, string[]>();

  for (let index = 0; index < records.length; index += 1) {
    if (!hasOwnIndex(records, index) || !isRecord(records[index])) {
      throw new ValidationError(
        "Execution session view records must contain only objects."
      );
    }

    const record = records[index] as ExecutionSessionRecord;
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
  validateView(view);
  validateSelectorContainer(selector);
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
  validateView(view);
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
  value: unknown,
  message: string
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError(message);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}

function normalizeRequiredIdentifier(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(message);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}

function validateView(view: unknown): asserts view is ExecutionSessionView {
  if (
    !isRecord(view) ||
    !isRecord(view.index) ||
    !hasMapGetter(view.index.byAttemptId) ||
    !hasMapGetter(view.index.bySessionId) ||
    !hasMapGetter(view.childAttemptIdsByParent)
  ) {
    throw new ValidationError(
      "Execution session view requires view to be an object."
    );
  }
}

function validateSelectorContainer(
  selector: unknown
): asserts selector is ExecutionSessionSelector {
  if (!isRecord(selector)) {
    throw new ValidationError(
      "Execution session view requires selector to be an object."
    );
  }
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function hasMapGetter(value: unknown): value is { get: (key: string) => unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { get?: unknown }).get === "function"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
