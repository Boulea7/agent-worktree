import type {
  ExecutionCoordinationGroup,
  ExecutionCoordinationGrouping,
  ExecutionCoordinationGroupingInput,
  ExecutionCoordinationTask
} from "./types.js";

export function deriveExecutionCoordinationGroups(
  input: ExecutionCoordinationGroupingInput
): ExecutionCoordinationGrouping {
  const groups: ExecutionCoordinationGroup[] = [];
  const groupsByKey = new Map<string, ExecutionCoordinationGroup>();
  const readyTaskIds = new Set(input.board.summary.readyTaskIds);
  const dependencyBlockedTaskIds = new Set(
    input.board.summary.dependencyBlockedTaskIds
  );

  for (const task of input.board.tasks) {
    const groupKey = `${task.kind}:${task.owner?.attemptId ?? "unowned"}`;
    const group =
      groupsByKey.get(groupKey) ??
      createGroup(groupKey, task.kind, task.owner?.attemptId);

    group.taskIds.push(task.id);

    if (readyTaskIds.has(task.id)) {
      group.readyTaskIds.push(task.id);
    }

    if (task.status === "in_progress") {
      group.inProgressTaskIds.push(task.id);
    }

    if (task.status === "blocked") {
      group.blockedTaskIds.push(task.id);
    }

    if (dependencyBlockedTaskIds.has(task.id)) {
      group.dependencyBlockedTaskIds.push(task.id);
    }

    if (!groupsByKey.has(groupKey)) {
      groupsByKey.set(groupKey, group);
      groups.push(group);
    }
  }

  return { groups };
}

function createGroup(
  groupKey: string,
  kind: ExecutionCoordinationTask["kind"],
  ownerAttemptId: string | undefined
): ExecutionCoordinationGroup {
  return {
    groupKey,
    kind,
    ...(ownerAttemptId === undefined ? {} : { ownerAttemptId }),
    taskIds: [],
    readyTaskIds: [],
    inProgressTaskIds: [],
    blockedTaskIds: [],
    dependencyBlockedTaskIds: []
  };
}
