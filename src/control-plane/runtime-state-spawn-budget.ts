import type {
  ExecutionSessionRecord,
  ExecutionSessionSpawnBudget,
  ExecutionSessionSpawnBudgetInput
} from "./types.js";

export function deriveExecutionSessionSpawnBudget(
  input: ExecutionSessionSpawnBudgetInput
): ExecutionSessionSpawnBudget {
  const { lineageDepth, lineageDepthKnown } = deriveLineageDepth(
    input.view.index.byAttemptId,
    input.context.record
  );
  const childCount = input.context.childRecords.length;
  const maxChildren = input.context.record.guardrails?.maxChildren;
  const maxDepth = input.context.record.guardrails?.maxDepth;
  const withinChildLimit =
    maxChildren === undefined ? true : childCount < maxChildren;
  const remainingChildSlots =
    maxChildren === undefined ? undefined : Math.max(maxChildren - childCount, 0);
  const withinDepthLimit =
    maxDepth === undefined
      ? true
      : lineageDepthKnown &&
        lineageDepth !== undefined &&
        lineageDepth + 1 <= maxDepth;
  const remainingDepthAllowance =
    maxDepth === undefined || !lineageDepthKnown || lineageDepth === undefined
      ? undefined
      // This is the projected depth headroom after consuming the next spawn.
      // When one more spawn is still allowed but would fully exhaust maxDepth,
      // the remaining allowance is intentionally 0.
      : Math.max(maxDepth - (lineageDepth + 1), 0);

  return {
    childCount,
    lineageDepth,
    lineageDepthKnown,
    ...(maxChildren === undefined ? {} : { maxChildren }),
    ...(maxDepth === undefined ? {} : { maxDepth }),
    ...(remainingChildSlots === undefined ? {} : { remainingChildSlots }),
    ...(remainingDepthAllowance === undefined
      ? {}
      : { remainingDepthAllowance }),
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
