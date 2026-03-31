import { ValidationError } from "../core/errors.js";
import type {
  SessionGuardrails,
  SessionLifecycleState,
  SessionLifecycleStateInput,
  SessionNodeRef,
  SessionNodeRefInput,
  SessionSnapshot,
  SessionSnapshotInput,
  SessionTreeIndex
} from "./types.js";

export function deriveSessionNodeRef(
  input: SessionNodeRefInput
): SessionNodeRef {
  const attemptId = normalizeRequiredAttemptId(
    input.attemptId,
    "attemptId must be a non-empty string."
  );
  const sourceKind = input.sourceKind ?? "direct";
  const parentAttemptId = normalizeParentAttemptId(input.parentAttemptId);

  if (sourceKind === "direct" && parentAttemptId !== undefined) {
    throw new ValidationError(
      "Direct session nodes must not record parentAttemptId."
    );
  }

  if (sourceKind !== "direct" && parentAttemptId === undefined) {
    throw new ValidationError(
      "Non-direct session nodes must record parentAttemptId."
    );
  }

  if (parentAttemptId === attemptId) {
    throw new ValidationError("parentAttemptId must not match attemptId.");
  }

  return {
    attemptId,
    nodeKind: parentAttemptId === undefined ? "root" : "child",
    sourceKind,
    ...(parentAttemptId === undefined ? {} : { parentAttemptId })
  };
}

export function normalizeSessionGuardrails(
  guardrails?: SessionGuardrails
): SessionGuardrails | undefined {
  if (guardrails === undefined) {
    return undefined;
  }

  const normalized: SessionGuardrails = {};

  if (guardrails.maxDepth !== undefined) {
    normalized.maxDepth = validatePositiveInteger(
      guardrails.maxDepth,
      "maxDepth"
    );
  }

  if (guardrails.maxChildren !== undefined) {
    normalized.maxChildren = validatePositiveInteger(
      guardrails.maxChildren,
      "maxChildren"
    );
  }

  return Object.keys(normalized).length === 0 ? undefined : normalized;
}

export function classifySessionLifecycleState(
  input: SessionLifecycleStateInput = {}
): SessionLifecycleState {
  if (input.lifecycleEventKind === "close_recorded") {
    return "closed";
  }

  if (input.lifecycleEventKind === "completion_observed") {
    return hasObservationFailure(input.observation) ? "failed" : "completed";
  }

  if (hasObservationFailure(input.observation)) {
    return "failed";
  }

  if (input.observation?.runCompleted === true) {
    return "completed";
  }

  if (hasObservationActivity(input.observation)) {
    return "active";
  }

  return "created";
}

export function deriveSessionSnapshot(
  input: SessionSnapshotInput
): SessionSnapshot {
  const observation = input.observation;
  const guardrails = normalizeSessionGuardrails(input.guardrails);

  return {
    node: deriveSessionNodeRef(input),
    lifecycleState: classifySessionLifecycleState({
      ...(input.lifecycleEventKind === undefined
        ? {}
        : { lifecycleEventKind: input.lifecycleEventKind }),
      ...(observation === undefined ? {} : { observation })
    }),
    runCompleted: observation?.runCompleted ?? false,
    errorEventCount: observation?.errorEventCount ?? 0,
    ...(observation?.threadId === undefined
      ? {}
      : {
          sessionRef: {
            runtime: input.runtime,
            sessionId: observation.threadId
          }
        }),
    ...(observation?.turnStatus === undefined
      ? {}
      : { turnStatus: observation.turnStatus }),
    ...(observation?.lastAgentMessage === undefined
      ? {}
      : { lastAgentMessage: observation.lastAgentMessage }),
    ...(observation?.lastErrorMessage === undefined
      ? {}
      : { lastErrorMessage: observation.lastErrorMessage }),
    ...(observation?.usage === undefined ? {} : { usage: observation.usage }),
    ...(guardrails === undefined ? {} : { guardrails }),
    ...(input.lifecycleEventKind === undefined
      ? {}
      : { lastLifecycleEventKind: input.lifecycleEventKind })
  };
}

export function buildSessionTreeIndex(
  snapshots: readonly SessionSnapshot[]
): SessionTreeIndex {
  const byAttemptId = new Map<string, SessionSnapshot>();
  const childAttemptIdsByParent = new Map<string, string[]>();

  for (const snapshot of snapshots) {
    const attemptId = normalizeRequiredAttemptId(
      snapshot.node.attemptId,
      "Session snapshot attemptId must be a non-empty string."
    );

    if (byAttemptId.has(attemptId)) {
      throw new ValidationError(
        `Duplicate session snapshot for attempt ${attemptId}.`
      );
    }

    byAttemptId.set(attemptId, snapshot);

    if (snapshot.node.parentAttemptId === undefined) {
      continue;
    }

    const existingChildren =
      childAttemptIdsByParent.get(snapshot.node.parentAttemptId) ?? [];
    existingChildren.push(attemptId);
    childAttemptIdsByParent.set(
      snapshot.node.parentAttemptId,
      existingChildren
    );
  }

  return {
    byAttemptId,
    childAttemptIdsByParent
  };
}

function hasObservationFailure(
  observation: SessionLifecycleStateInput["observation"]
): boolean {
  if (observation === undefined) {
    return false;
  }

  return (
    observation.errorEventCount > 0 || observation.lastErrorMessage !== undefined
  );
}

function hasObservationActivity(
  observation: SessionLifecycleStateInput["observation"]
): boolean {
  if (observation === undefined) {
    return false;
  }

  return (
    observation.threadId !== undefined ||
    observation.turnStatus !== undefined ||
    observation.lastAgentMessage !== undefined ||
    observation.usage !== undefined
  );
}

function validatePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new ValidationError(
      `Session guardrail ${field} must be a positive integer.`
    );
  }

  return value;
}

export function normalizeRequiredAttemptId(
  attemptId: string,
  message: string
): string {
  if (attemptId.trim().length === 0) {
    throw new ValidationError(message);
  }

  return attemptId;
}

function normalizeParentAttemptId(
  parentAttemptId: string | undefined
): string | undefined {
  if (parentAttemptId === undefined) {
    return undefined;
  }

  const normalized = parentAttemptId.trim();

  if (normalized.length === 0) {
    throw new ValidationError("parentAttemptId must be a non-empty string.");
  }

  return normalized;
}
