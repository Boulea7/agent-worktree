import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionLifecycleDisposition,
  ExecutionSessionLifecycleDispositionInput,
  SessionLifecycleState
} from "./types.js";
import { sessionLifecycleStates } from "./types.js";

const terminalLifecycleStates = new Set<SessionLifecycleState>([
  "completed",
  "failed",
  "closed"
]);
const validLifecycleStates = new Set<SessionLifecycleState>(sessionLifecycleStates);

export function deriveExecutionSessionLifecycleDisposition(
  input: ExecutionSessionLifecycleDispositionInput
): ExecutionSessionLifecycleDisposition {
  if (!isRecord(input)) {
    throw new ValidationError(
      "Execution session lifecycle disposition input must be an object."
    );
  }

  if (!isRecord(input.context)) {
    throw new ValidationError(
      "Execution session lifecycle disposition requires context to be an object."
    );
  }

  if (!isRecord(input.context.record)) {
    throw new ValidationError(
      "Execution session lifecycle disposition requires context.record to be an object."
    );
  }

  const lifecycleState = normalizeLifecycleState(
    input.context.record.lifecycleState
  );
  const hasKnownSession = normalizeBoolean(
    input.context.hasKnownSession,
    "Execution session lifecycle disposition requires context.hasKnownSession to be a boolean."
  );
  const hasChildren = normalizeBoolean(
    input.context.hasChildren,
    "Execution session lifecycle disposition requires context.hasChildren to be a boolean."
  );

  return {
    alreadyFinal: terminalLifecycleStates.has(lifecycleState),
    hasKnownSession,
    wouldAffectDescendants: hasChildren
  };
}

function normalizeLifecycleState(value: unknown): SessionLifecycleState {
  if (
    typeof value !== "string" ||
    !validLifecycleStates.has(value as SessionLifecycleState)
  ) {
    throw new ValidationError(
      "Execution session lifecycle disposition requires context.record.lifecycleState to use the existing session lifecycle vocabulary."
    );
  }

  return value as SessionLifecycleState;
}

function normalizeBoolean(value: unknown, message: string): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(message);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
