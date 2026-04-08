import { ValidationError } from "../core/errors.js";
import { deriveExecutionSessionContext } from "./runtime-state-context.js";
import { deriveExecutionSessionWaitReadiness } from "./runtime-state-readiness.js";
import type {
  ExecutionSessionWaitCandidate,
  ExecutionSessionWaitCandidateInput
} from "./types.js";

export function deriveExecutionSessionWaitCandidate(
  input: ExecutionSessionWaitCandidateInput
): ExecutionSessionWaitCandidate | undefined {
  if (!isRecord(input)) {
    throw new ValidationError(
      "Execution session wait candidate input must be an object."
    );
  }

  if (
    !isRecord(input.view) ||
    !isRecord(input.view.index) ||
    !hasMapGetter(input.view.index.byAttemptId) ||
    !hasMapGetter(input.view.index.bySessionId) ||
    !hasMapGetter(input.view.childAttemptIdsByParent)
  ) {
    throw new ValidationError(
      "Execution session wait candidate requires view to be an object."
    );
  }

  if (!isRecord(input.selector)) {
    throw new ValidationError(
      "Execution session wait candidate requires selector to be an object."
    );
  }

  const context = deriveExecutionSessionContext({
    view: input.view,
    selector: input.selector
  });

  if (context === undefined) {
    return undefined;
  }

  return {
    context,
    readiness: deriveExecutionSessionWaitReadiness({
      context
    })
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasMapGetter(value: unknown): value is { get: (key: string) => unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { get?: unknown }).get === "function"
  );
}
