import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionDescendantCoverage,
  ExecutionSessionDescendantCoverageSummary,
  ExecutionSessionDescendantCoverageSummaryInput,
  ExecutionSessionRecord,
  ExecutionSessionView
} from "./types.js";

export function deriveExecutionSessionDescendantCoverageSummary(
  input: ExecutionSessionDescendantCoverageSummaryInput
): ExecutionSessionDescendantCoverageSummary {
  if (!isRecord(input)) {
    throw new ValidationError(
      "Execution session descendant coverage summary input must be an object."
    );
  }

  if (!isRecord(input.record)) {
    throw new ValidationError(
      "Execution session descendant coverage summary requires record to be an object."
    );
  }

  validateView(input.view);
  const coverage = normalizeDescendantCoverage(input.descendantCoverage);
  const descendantAttemptIds = collectDescendantAttemptIds(
    input.view,
    normalizeAttemptId(input.record.attemptId)
  );

  return {
    coverage,
    isDefaulted: input.descendantCoverage === undefined,
    descendantCount: descendantAttemptIds.length,
    descendantAttemptIds,
    ...(coverage === "incomplete"
      ? { blockingReason: "descendant_coverage_incomplete" as const }
      : {})
  };
}

function collectDescendantAttemptIds(
  view: ExecutionSessionView,
  attemptId: string
): string[] {
  const descendantAttemptIds: string[] = [];
  const queue = [...(view.childAttemptIdsByParent.get(attemptId) ?? [])];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nextAttemptId = queue.shift();

    if (nextAttemptId === undefined || visited.has(nextAttemptId)) {
      continue;
    }

    visited.add(nextAttemptId);
    descendantAttemptIds.push(nextAttemptId);

    for (const childAttemptId of view.childAttemptIdsByParent.get(nextAttemptId) ?? []) {
      queue.push(childAttemptId);
    }
  }

  return descendantAttemptIds;
}

function normalizeAttemptId(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      "Execution session descendant coverage summary requires record.attemptId to be a non-empty string."
    );
  }

  return value.trim();
}

function normalizeDescendantCoverage(
  value: ExecutionSessionDescendantCoverageSummaryInput["descendantCoverage"]
): ExecutionSessionDescendantCoverage {
  if (value === undefined) {
    return "incomplete";
  }

  if (value === "complete" || value === "incomplete") {
    return value;
  }

  throw new ValidationError(
    'Execution session descendant coverage summary requires descendantCoverage to be "complete" or "incomplete" when provided.'
  );
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
      "Execution session descendant coverage summary requires view to be an object."
    );
  }
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
