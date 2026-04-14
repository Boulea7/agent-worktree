import { describe, expect, it } from "vitest";

import {
  deriveExecutionCoordinationBoard,
  deriveExecutionCoordinationReadyQueue,
  type ExecutionCoordinationTask
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state coordination ready-queue helpers", () => {
  it("should derive stable advisory lanes for ready, follow-up, dependency-blocked, and coverage-blocked work", () => {
    const board = deriveExecutionCoordinationBoard({
      tasks: [
        createTask({
          id: "spawn",
          kind: "delegated_work",
          updatedAt: "2026-04-14T00:00:01.000Z"
        }),
        createTask({
          id: "verify",
          kind: "verifier_handoff",
          status: "in_progress",
          blockingReasons: ["required_checks_pending"],
          updatedAt: "2026-04-14T00:00:03.000Z"
        }),
        createTask({
          id: "closeout",
          kind: "closeout_readiness",
          dependsOnTaskIds: ["spawn"],
          updatedAt: "2026-04-14T00:00:04.000Z"
        }),
        createTask({
          id: "child",
          kind: "blocked_child",
          status: "blocked",
          blockingReasons: ["descendant_coverage_incomplete"],
          updatedAt: "2026-04-14T00:00:02.000Z"
        })
      ]
    });

    expect(deriveExecutionCoordinationReadyQueue({ board })).toEqual({
      readyNowTaskIds: ["spawn"],
      followUpReadyTaskIds: ["verify"],
      waitingOnDependenciesTaskIds: ["closeout"],
      waitingOnCoverageTaskIds: ["child"]
    });
  });
});

function createTask(
  overrides: Partial<ExecutionCoordinationTask> & Pick<ExecutionCoordinationTask, "id">
): ExecutionCoordinationTask {
  return {
    kind: "review_handoff",
    title: `${overrides.id} title`,
    status: "pending",
    dependsOnTaskIds: [],
    blockingReasons: [],
    updatedAt: "2026-04-14T00:00:00.000Z",
    ...overrides
  };
}
