import { ValidationError } from "../core/errors.js";
import type {
  AttemptHandoffDecisionSummary,
  AttemptHandoffFinalizationCloseoutDecisionSummary,
  AttemptPromotionDecisionSummary
} from "../selection/types.js";
import type {
  ExecutionCoordinationBoard,
  ExecutionCoordinationBoardInput,
  ExecutionCoordinationTask,
  ExecutionCoordinationTaskFromCloseoutDecisionInput,
  ExecutionCoordinationTaskFromHandoffDecisionInput,
  ExecutionCoordinationTaskFromPromotionDecisionInput,
  ExecutionCoordinationTaskFromSpawnCandidateInput,
  ExecutionCoordinationTaskFromSpawnHeadlessWaitCandidateInput,
  ExecutionCoordinationTaskInput,
  ExecutionCoordinationTaskKind,
  ExecutionCoordinationTaskOwner,
  ExecutionCoordinationTaskStatus
} from "./types.js";

const coordinationTaskKinds = new Set<ExecutionCoordinationTaskKind>([
  "delegated_work",
  "blocked_child",
  "verifier_handoff",
  "review_handoff",
  "closeout_readiness"
]);

const coordinationTaskStatuses = new Set<ExecutionCoordinationTaskStatus>([
  "pending",
  "in_progress",
  "blocked",
  "completed",
  "dropped"
]);

export function deriveExecutionCoordinationTaskFromSpawnCandidate(
  input: ExecutionCoordinationTaskFromSpawnCandidateInput
): ExecutionCoordinationTask {
  const requestedCount = normalizePositiveInteger(
    input.requestedCount,
    "Execution coordination delegated-work task requestedCount must be a finite integer greater than 0."
  );
  const record = input.candidate.context.record;

  return normalizeExecutionCoordinationTask({
    id: input.id,
    kind: "delegated_work",
    title: `Delegate ${requestedCount} child attempt(s) from ${record.attemptId}`,
    status: input.candidate.readiness.canSpawn ? "pending" : "blocked",
    owner: {
      attemptId: record.attemptId,
      runtime: record.runtime
    },
    ...(input.dependsOnTaskIds === undefined
      ? {}
      : { dependsOnTaskIds: input.dependsOnTaskIds }),
    blockingReasons: input.candidate.readiness.blockingReasons,
    updatedAt: input.updatedAt
  });
}

export function deriveExecutionCoordinationTaskFromSpawnHeadlessWaitCandidate(
  input: ExecutionCoordinationTaskFromSpawnHeadlessWaitCandidateInput
): ExecutionCoordinationTask {
  const record = input.headlessWaitCandidate.candidate.context.record;
  const readiness = input.headlessWaitCandidate.candidate.readiness;

  return normalizeExecutionCoordinationTask({
    id: input.id,
    kind: "blocked_child",
    title: `Track child attempt ${record.attemptId} readiness`,
    status: readiness.canWait ? "in_progress" : "blocked",
    owner: {
      attemptId: record.attemptId,
      runtime: record.runtime
    },
    ...(input.dependsOnTaskIds === undefined
      ? {}
      : { dependsOnTaskIds: input.dependsOnTaskIds }),
    blockingReasons: readiness.blockingReasons,
    updatedAt: input.updatedAt
  });
}

export function deriveExecutionCoordinationTaskFromPromotionDecision(
  input: ExecutionCoordinationTaskFromPromotionDecisionInput
): ExecutionCoordinationTask {
  const summary = input.summary;
  const owner = deriveSelectedOwner(summary.selectedIdentity);

  return normalizeExecutionCoordinationTask({
    id: input.id,
    kind: "verifier_handoff",
    title: `Verify promotion readiness for task ${normalizeOptionalIdentifier(summary.taskId) ?? "unknown"}`,
    status: derivePromotionTaskStatus(summary),
    ...(owner === undefined ? {} : { owner }),
    ...(input.dependsOnTaskIds === undefined
      ? {}
      : { dependsOnTaskIds: input.dependsOnTaskIds }),
    blockingReasons: summary.blockingReasons,
    updatedAt: input.updatedAt
  });
}

export function deriveExecutionCoordinationTaskFromHandoffDecision(
  input: ExecutionCoordinationTaskFromHandoffDecisionInput
): ExecutionCoordinationTask {
  const summary = input.summary;

  return normalizeExecutionCoordinationTask({
    id: input.id,
    kind: "review_handoff",
    title: "Finalize review handoff readiness",
    status: summary.canFinalizeHandoff
      ? "completed"
      : summary.blockingReasons.includes("no_results")
        ? "pending"
        : "blocked",
    ...(input.dependsOnTaskIds === undefined
      ? {}
      : { dependsOnTaskIds: input.dependsOnTaskIds }),
    blockingReasons: summary.blockingReasons,
    updatedAt: input.updatedAt
  });
}

export function deriveExecutionCoordinationTaskFromCloseoutDecision(
  input: ExecutionCoordinationTaskFromCloseoutDecisionInput
): ExecutionCoordinationTask {
  const summary = input.summary;

  return normalizeExecutionCoordinationTask({
    id: input.id,
    kind: "closeout_readiness",
    title: "Advance closeout readiness",
    status: summary.canAdvanceFromCloseout
      ? "completed"
      : summary.blockingReasons.includes("no_results")
        ? "pending"
        : "blocked",
    ...(input.dependsOnTaskIds === undefined
      ? {}
      : { dependsOnTaskIds: input.dependsOnTaskIds }),
    blockingReasons: summary.blockingReasons,
    updatedAt: input.updatedAt
  });
}

export function deriveExecutionCoordinationBoard(
  input: ExecutionCoordinationBoardInput
): ExecutionCoordinationBoard {
  validateBoardInput(input);
  const tasks = input.tasks.map((task) => normalizeExecutionCoordinationTask(task));
  const taskIds = new Set(tasks.map((task) => task.id));

  for (const task of tasks) {
    validateDependencies(task, taskIds);
  }

  const completedTaskIds = tasks
    .filter((task) => task.status === "completed")
    .map((task) => task.id);
  const blockedTaskIds = tasks
    .filter((task) => task.status === "blocked")
    .map((task) => task.id);
  const readyTaskIds = tasks
    .filter(
      (task) =>
        task.status === "pending" &&
        task.dependsOnTaskIds.every((dependencyId) =>
          completedTaskIds.includes(dependencyId)
        )
    )
    .map((task) => task.id);
  const dependencyBlockedTaskIds = tasks
    .filter(
      (task) =>
        task.status === "pending" &&
        task.dependsOnTaskIds.some(
          (dependencyId) => !completedTaskIds.includes(dependencyId)
        )
    )
    .map((task) => task.id);

  return {
    tasks,
    summary: {
      totalTaskCount: tasks.length,
      pendingTaskCount: tasks.filter((task) => task.status === "pending").length,
      inProgressTaskCount: tasks.filter((task) => task.status === "in_progress")
        .length,
      blockedTaskCount: blockedTaskIds.length,
      completedTaskCount: completedTaskIds.length,
      droppedTaskCount: tasks.filter((task) => task.status === "dropped").length,
      readyTaskCount: readyTaskIds.length,
      dependencyBlockedTaskCount: dependencyBlockedTaskIds.length,
      readyTaskIds,
      dependencyBlockedTaskIds,
      blockedTaskIds,
      completedTaskIds
    }
  };
}

export function normalizeExecutionCoordinationTask(
  input: ExecutionCoordinationTaskInput
): ExecutionCoordinationTask {
  if (!isRecord(input)) {
    throw new ValidationError(
      "Execution coordination task input must be an object."
    );
  }

  const id = normalizeRequiredIdentifier(
    input.id,
    "Execution coordination task requires id to be a non-empty string."
  );
  const title = normalizeRequiredIdentifier(
    input.title,
    "Execution coordination task requires title to be a non-empty string."
  );
  const updatedAt = normalizeRequiredIdentifier(
    input.updatedAt,
    "Execution coordination task requires updatedAt to be a non-empty string."
  );
  const kind = normalizeTaskKind(input.kind);
  const status = normalizeTaskStatus(input.status);
  const dependsOnTaskIds = normalizeStringArray(
    input.dependsOnTaskIds,
    "Execution coordination task dependsOnTaskIds must be an array of non-empty unique strings."
  );
  const blockingReasons = normalizeStringArray(
    input.blockingReasons,
    "Execution coordination task blockingReasons must be an array of non-empty unique strings."
  );
  const owner = normalizeTaskOwner(input.owner);

  if (status === "blocked" && blockingReasons.length === 0) {
    throw new ValidationError(
      "Execution coordination task requires blocked tasks to keep at least one blocking reason."
    );
  }

  if (status === "completed" && blockingReasons.length > 0) {
    throw new ValidationError(
      "Execution coordination task requires completed tasks to keep blockingReasons empty."
    );
  }

  return {
    id,
    kind,
    title,
    status,
    ...(owner === undefined ? {} : { owner }),
    dependsOnTaskIds,
    blockingReasons,
    updatedAt
  };
}

function validateBoardInput(input: ExecutionCoordinationBoardInput): void {
  if (!isRecord(input)) {
    throw new ValidationError(
      "Execution coordination board input must be an object."
    );
  }

  if (!Array.isArray(input.tasks)) {
    throw new ValidationError(
      "Execution coordination board requires tasks to be an array."
    );
  }

  const ids = new Set<string>();

  for (let index = 0; index < input.tasks.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(input.tasks, index)) {
      throw new ValidationError(
        "Execution coordination board requires tasks entries to be objects."
      );
    }

    const task = input.tasks[index];

    if (!isRecord(task)) {
      throw new ValidationError(
        "Execution coordination board requires tasks entries to be objects."
      );
    }

    const id = normalizeRequiredIdentifier(
      task.id,
      "Execution coordination task requires id to be a non-empty string."
    );

    if (ids.has(id)) {
      throw new ValidationError(
        "Execution coordination board requires tasks to use unique ids."
      );
    }

    ids.add(id);
  }
}

function validateDependencies(
  task: ExecutionCoordinationTask,
  taskIds: Set<string>
): void {
  for (const dependencyId of task.dependsOnTaskIds) {
    if (dependencyId === task.id) {
      throw new ValidationError(
        "Execution coordination task must not depend on itself."
      );
    }

    if (!taskIds.has(dependencyId)) {
      throw new ValidationError(
        "Execution coordination board requires dependencies to reference existing task ids."
      );
    }
  }
}

function derivePromotionTaskStatus(
  summary: AttemptPromotionDecisionSummary
): ExecutionCoordinationTaskStatus {
  if (summary.canPromote) {
    return "completed";
  }

  if (
    summary.blockingReasons.includes("required_checks_pending") ||
    summary.blockingReasons.includes("verification_incomplete")
  ) {
    return "in_progress";
  }

  return "blocked";
}

function deriveSelectedOwner(
  selectedIdentity:
    | AttemptPromotionDecisionSummary["selectedIdentity"]
    | undefined
): ExecutionCoordinationTaskOwner | undefined {
  if (selectedIdentity === undefined) {
    return undefined;
  }

  return {
    attemptId: selectedIdentity.attemptId,
    runtime: selectedIdentity.runtime
  };
}

function normalizeTaskKind(value: unknown): ExecutionCoordinationTaskKind {
  if (typeof value !== "string" || !coordinationTaskKinds.has(value as never)) {
    throw new ValidationError(
      "Execution coordination task requires kind to use the existing coordination task vocabulary."
    );
  }

  return value as ExecutionCoordinationTaskKind;
}

function normalizeTaskStatus(value: unknown): ExecutionCoordinationTaskStatus {
  if (
    typeof value !== "string" ||
    !coordinationTaskStatuses.has(value as never)
  ) {
    throw new ValidationError(
      "Execution coordination task requires status to use the existing coordination status vocabulary."
    );
  }

  return value as ExecutionCoordinationTaskStatus;
}

function normalizeTaskOwner(
  value: unknown
): ExecutionCoordinationTaskOwner | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new ValidationError(
      "Execution coordination task requires owner to be an object when provided."
    );
  }

  return {
    attemptId: normalizeRequiredIdentifier(
      value.attemptId,
      "Execution coordination task requires owner.attemptId to be a non-empty string."
    ),
    runtime: normalizeRequiredIdentifier(
      value.runtime,
      "Execution coordination task requires owner.runtime to be a non-empty string."
    )
  };
}

function normalizeStringArray(
  value: readonly string[] | undefined,
  message: string
): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(message);
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      throw new ValidationError(message);
    }

    const entry = value[index];
    const normalizedEntry = normalizeRequiredIdentifier(entry, message);

    if (seen.has(normalizedEntry)) {
      throw new ValidationError(message);
    }

    seen.add(normalizedEntry);
    normalized.push(normalizedEntry);
  }

  return normalized;
}

function normalizeRequiredIdentifier(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(message);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}

function normalizeOptionalIdentifier(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
}

function normalizePositiveInteger(value: unknown, message: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new ValidationError(message);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
