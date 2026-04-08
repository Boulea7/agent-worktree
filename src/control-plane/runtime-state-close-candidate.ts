import { ValidationError } from "../core/errors.js";
import { deriveExecutionSessionContext } from "./runtime-state-context.js";
import { deriveExecutionSessionCloseReadiness } from "./runtime-state-close-readiness.js";
import type {
  ExecutionSessionCloseCandidate,
  ExecutionSessionCloseCandidateInput
} from "./types.js";

export function deriveExecutionSessionCloseCandidate(
  input: ExecutionSessionCloseCandidateInput
): ExecutionSessionCloseCandidate | undefined {
  if (!isRecord(input)) {
    throw new ValidationError(
      "Execution session close candidate input must be an object."
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
      "Execution session close candidate requires view to be an object."
    );
  }

  if (!isRecord(input.selector)) {
    throw new ValidationError(
      "Execution session close candidate requires selector to be an object."
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
    readiness: deriveExecutionSessionCloseReadiness({
      context,
      ...(input.resolveSessionLifecycleCapability === undefined
        ? {}
        : {
            resolveSessionLifecycleCapability:
              input.resolveSessionLifecycleCapability
          })
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
