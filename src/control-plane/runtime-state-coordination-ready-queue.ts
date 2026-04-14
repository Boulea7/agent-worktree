import type {
  ExecutionCoordinationReadyQueue,
  ExecutionCoordinationReadyQueueInput,
  ExecutionCoordinationTask,
  ExecutionCoordinationTaskKind
} from "./types.js";

const taskKindPriority: Record<ExecutionCoordinationTaskKind, number> = {
  delegated_work: 0,
  blocked_child: 1,
  verifier_handoff: 2,
  review_handoff: 3,
  closeout_readiness: 4
};

export function deriveExecutionCoordinationReadyQueue(
  input: ExecutionCoordinationReadyQueueInput
): ExecutionCoordinationReadyQueue {
  const readyNowTaskIds = sortTasks(
    input.board.tasks.filter((task) => input.board.summary.readyTaskIds.includes(task.id))
  ).map((task) => task.id);
  const followUpReadyTaskIds = sortTasks(
    input.board.tasks.filter((task) => task.status === "in_progress")
  ).map((task) => task.id);
  const waitingOnDependenciesTaskIds = sortTasks(
    input.board.tasks.filter((task) =>
      input.board.summary.dependencyBlockedTaskIds.includes(task.id)
    )
  ).map((task) => task.id);
  const waitingOnCoverageTaskIds = sortTasks(
    input.board.tasks.filter(
      (task) =>
        task.status === "blocked" &&
        task.blockingReasons.includes("descendant_coverage_incomplete")
    )
  ).map((task) => task.id);

  return {
    readyNowTaskIds,
    followUpReadyTaskIds,
    waitingOnDependenciesTaskIds,
    waitingOnCoverageTaskIds
  };
}

function sortTasks(tasks: readonly ExecutionCoordinationTask[]): ExecutionCoordinationTask[] {
  return [...tasks].sort((left, right) => {
    const kindPriority =
      taskKindPriority[left.kind] - taskKindPriority[right.kind];

    if (kindPriority !== 0) {
      return kindPriority;
    }

    const updatedAtOrder = left.updatedAt.localeCompare(right.updatedAt);

    if (updatedAtOrder !== 0) {
      return updatedAtOrder;
    }

    return left.id.localeCompare(right.id);
  });
}
