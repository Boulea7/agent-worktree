import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { deriveExecutionSessionContext } from "./runtime-state-context.js";
import type {
  ExecutionSessionContext,
  ExecutionSessionSelector,
  ExecutionSessionView
} from "./types.js";

export interface ExecutionSessionCandidateContextMessages {
  input: string;
  selector: string;
  view: string;
}

export function deriveExecutionSessionCandidateContext(
  input: unknown,
  messages: ExecutionSessionCandidateContextMessages
): ExecutionSessionContext | undefined {
  const normalizedInput = normalizeBatchWrapper<Record<string, unknown>>(
    input as Record<string, unknown>,
    messages.input
  );
  const selector = readRequiredBatchWrapperProperty<ExecutionSessionSelector>(
    normalizedInput,
    "selector",
    messages.selector
  );

  if (!isRecord(selector)) {
    throw new ValidationError(messages.selector);
  }

  const view = readRequiredBatchWrapperProperty<ExecutionSessionView>(
    normalizedInput,
    "view",
    messages.view
  );

  validateView(view, messages.view);

  return deriveExecutionSessionContext({
    selector,
    view
  });
}

function validateView(
  view: unknown,
  message: string
): asserts view is ExecutionSessionView {
  if (
    !isRecord(view) ||
    !isRecord(view.index) ||
    !hasMapGetter(view.index.byAttemptId) ||
    !hasMapGetter(view.index.bySessionId) ||
    !hasMapGetter(view.childAttemptIdsByParent)
  ) {
    throw new ValidationError(message);
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
