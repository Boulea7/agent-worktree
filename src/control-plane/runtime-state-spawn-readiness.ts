import { deriveExecutionSessionLifecycleDisposition } from "./runtime-state-lifecycle-disposition.js";
import type {
  ExecutionSessionRecord,
  ExecutionSessionSpawnBlockingReason,
  ExecutionSessionSpawnReadiness,
  ExecutionSessionSpawnReadinessInput
} from "./types.js";

export function deriveExecutionSessionSpawnReadiness(
  input: ExecutionSessionSpawnReadinessInput
): ExecutionSessionSpawnReadiness {
  const disposition = deriveExecutionSessionLifecycleDisposition({
    context: input.context
  });
  const { lineageDepth, lineageDepthKnown } = deriveLineageDepth(
    input.view.index.byAttemptId,
    input.context.record
  );
  const maxChildren = input.context.record.guardrails?.maxChildren;
  const maxDepth = input.context.record.guardrails?.maxDepth;
  const withinChildLimit =
    maxChildren === undefined
      ? true
      : input.context.childRecords.length < maxChildren;
  const withinDepthLimit =
    maxDepth === undefined
      ? true
      : lineageDepthKnown &&
        lineageDepth !== undefined &&
        lineageDepth + 1 <= maxDepth;
  const blockingReasons: ExecutionSessionSpawnBlockingReason[] = [];

  if (disposition.alreadyFinal) {
    blockingReasons.push("lifecycle_terminal");
  }

  if (!disposition.hasKnownSession) {
    blockingReasons.push("session_unknown");
  }

  if (maxDepth !== undefined && !lineageDepthKnown) {
    blockingReasons.push("lineage_depth_unknown");
  }

  if (maxDepth !== undefined && lineageDepthKnown && !withinDepthLimit) {
    blockingReasons.push("depth_limit_reached");
  }

  if (!withinChildLimit) {
    blockingReasons.push("child_limit_reached");
  }

  return {
    blockingReasons,
    canSpawn: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0,
    lineageDepth,
    lineageDepthKnown,
    withinChildLimit,
    withinDepthLimit
  };
}

function deriveLineageDepth(
  recordsByAttemptId: Map<string, ExecutionSessionRecord>,
  record: ExecutionSessionRecord
): {
  lineageDepth: number | undefined;
  lineageDepthKnown: boolean;
} {
  let depth = 0;
  let currentRecord: ExecutionSessionRecord = record;
  const visited = new Set<string>([record.attemptId]);

  while (currentRecord.parentAttemptId !== undefined) {
    const parentRecord = recordsByAttemptId.get(currentRecord.parentAttemptId);

    if (parentRecord === undefined || visited.has(currentRecord.parentAttemptId)) {
      return {
        lineageDepth: undefined,
        lineageDepthKnown: false
      };
    }

    visited.add(parentRecord.attemptId);
    currentRecord = parentRecord;
    depth += 1;
  }

  return {
    lineageDepth: depth,
    lineageDepthKnown: true
  };
}
