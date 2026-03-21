import { ValidationError } from "../core/errors.js";
import {
  executionSessionRecordSources,
  type ExecutionSessionIndex,
  type ExecutionSessionRecord,
  type ExecutionSessionRecordInput,
  type SessionSnapshot
} from "./types.js";
import {
  classifySessionLifecycleState,
  deriveSessionNodeRef,
  normalizeSessionGuardrails
} from "./derive.js";

const executionSessionRecordSource = executionSessionRecordSources[0];

export function deriveExecutionSessionRecord(
  input: ExecutionSessionRecordInput
): ExecutionSessionRecord | undefined {
  if (input.attempt === undefined) {
    return undefined;
  }

  const node = deriveSessionNodeRef(input.attempt);
  const snapshot = input.result.controlPlane?.sessionSnapshot;

  if (snapshot !== undefined) {
    validateSnapshotCompatibility(
      snapshot,
      node.attemptId,
      node.sourceKind,
      node.parentAttemptId,
      input.result.command.runtime
    );
  }

  const observation = input.result.observation;
  const sessionId = normalizeOptionalSessionId(
    snapshot?.sessionRef?.sessionId ?? observation.threadId
  );
  const guardrails = normalizeSessionGuardrails(snapshot?.guardrails);

  return {
    attemptId: node.attemptId,
    runtime: input.result.command.runtime,
    sourceKind: node.sourceKind,
    lifecycleState:
      snapshot?.lifecycleState ??
      classifySessionLifecycleState({
        observation
      }),
    runCompleted: snapshot?.runCompleted ?? observation.runCompleted,
    errorEventCount:
      snapshot?.errorEventCount ?? observation.errorEventCount,
    origin: executionSessionRecordSource,
    ...(guardrails === undefined ? {} : { guardrails }),
    ...(node.parentAttemptId === undefined
      ? {}
      : { parentAttemptId: node.parentAttemptId }),
    ...(sessionId === undefined ? {} : { sessionId }),
    ...(snapshot?.turnStatus === undefined && observation.turnStatus === undefined
      ? {}
      : { turnStatus: snapshot?.turnStatus ?? observation.turnStatus }),
    ...(snapshot?.lastAgentMessage === undefined &&
    observation.lastAgentMessage === undefined
      ? {}
      : {
          lastAgentMessage:
            snapshot?.lastAgentMessage ?? observation.lastAgentMessage
        }),
    ...(snapshot?.lastErrorMessage === undefined &&
    observation.lastErrorMessage === undefined
      ? {}
      : {
          lastErrorMessage:
            snapshot?.lastErrorMessage ?? observation.lastErrorMessage
        }),
    ...(snapshot?.usage === undefined && observation.usage === undefined
      ? {}
      : { usage: snapshot?.usage ?? observation.usage })
  };
}

export function buildExecutionSessionIndex(
  records: readonly ExecutionSessionRecord[]
): ExecutionSessionIndex {
  const byAttemptId = new Map<string, ExecutionSessionRecord>();
  const bySessionId = new Map<string, ExecutionSessionRecord>();

  for (const record of records) {
    if (byAttemptId.has(record.attemptId)) {
      throw new ValidationError(
        `Duplicate execution session record for attempt ${record.attemptId}.`
      );
    }

    byAttemptId.set(record.attemptId, record);

    const sessionId = validateIndexedSessionId(record.sessionId);

    if (sessionId === undefined) {
      continue;
    }

    if (bySessionId.has(sessionId)) {
      throw new ValidationError(
        `Duplicate execution session record for session ${sessionId}.`
      );
    }

    bySessionId.set(sessionId, record);
  }

  return {
    byAttemptId,
    bySessionId
  };
}

function validateSnapshotCompatibility(
  snapshot: SessionSnapshot,
  attemptId: string,
  sourceKind: string,
  parentAttemptId: string | undefined,
  runtime: string
): void {
  if (snapshot.node.attemptId !== attemptId) {
    throw new ValidationError(
      "Execution session snapshot attemptId must match the supplied attempt lineage."
    );
  }

  if (snapshot.node.sourceKind !== sourceKind) {
    throw new ValidationError(
      "Execution session snapshot sourceKind must match the supplied attempt lineage."
    );
  }

  if (snapshot.node.parentAttemptId !== parentAttemptId) {
    throw new ValidationError(
      "Execution session snapshot parentAttemptId must match the supplied attempt lineage."
    );
  }

  if (
    snapshot.sessionRef !== undefined &&
    snapshot.sessionRef.runtime !== runtime
  ) {
    throw new ValidationError(
      "Execution session snapshot runtime must match the execution result runtime."
    );
  }
}

function normalizeOptionalSessionId(
  sessionId: string | undefined
): string | undefined {
  if (sessionId === undefined) {
    return undefined;
  }

  const normalized = sessionId.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      "Execution session record sessionId must be a non-empty string."
    );
  }

  return normalized;
}

function validateIndexedSessionId(
  sessionId: string | undefined
): string | undefined {
  if (sessionId === undefined) {
    return undefined;
  }

  if (sessionId.trim().length === 0) {
    throw new ValidationError(
      "Execution session index sessionId must be a non-empty string when present."
    );
  }

  return sessionId;
}
