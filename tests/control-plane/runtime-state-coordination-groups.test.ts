import { describe, expect, it } from "vitest";

import {
  deriveExecutionCoordinationBoard,
  deriveExecutionCoordinationGroups,
  type ExecutionCoordinationTask
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state coordination group helpers", () => {
  it("should group tasks by kind and owner while preserving board-level readiness slices", () => {
    const board = deriveExecutionCoordinationBoard({
      tasks: [
        createTask({
          id: "spawn-a",
          kind: "delegated_work",
          owner: {
            attemptId: "att_parent",
            runtime: "codex-cli"
          }
        }),
        createTask({
          id: "spawn-b",
          kind: "delegated_work",
          status: "blocked",
          owner: {
            attemptId: "att_parent",
            runtime: "codex-cli"
          },
          blockingReasons: ["child_limit_reached"]
        }),
        createTask({
          id: "review",
          kind: "review_handoff",
          status: "pending",
          dependsOnTaskIds: ["spawn-a"]
        })
      ]
    });

    expect(deriveExecutionCoordinationGroups({ board })).toEqual({
      groups: [
        {
          groupKey: "delegated_work:att_parent:codex-cli",
          kind: "delegated_work",
          ownerAttemptId: "att_parent",
          ownerRuntime: "codex-cli",
          taskIds: ["spawn-a", "spawn-b"],
          readyTaskIds: ["spawn-a"],
          inProgressTaskIds: [],
          blockedTaskIds: ["spawn-b"],
          dependencyBlockedTaskIds: []
        },
        {
          groupKey: "review_handoff:unowned",
          kind: "review_handoff",
          taskIds: ["review"],
          readyTaskIds: [],
          inProgressTaskIds: [],
          blockedTaskIds: [],
          dependencyBlockedTaskIds: ["review"]
        }
      ]
    });
  });

  it("should keep groups separate when the same owner attempt appears under different runtimes", () => {
    const board = deriveExecutionCoordinationBoard({
      tasks: [
        createTask({
          id: "spawn-codex",
          kind: "delegated_work",
          owner: {
            attemptId: "att_parent",
            runtime: "codex-cli"
          }
        }),
        createTask({
          id: "spawn-gemini",
          kind: "delegated_work",
          owner: {
            attemptId: "att_parent",
            runtime: "gemini-cli"
          }
        })
      ]
    });

    expect(deriveExecutionCoordinationGroups({ board })).toEqual({
      groups: [
        {
          groupKey: "delegated_work:att_parent:codex-cli",
          kind: "delegated_work",
          ownerAttemptId: "att_parent",
          ownerRuntime: "codex-cli",
          taskIds: ["spawn-codex"],
          readyTaskIds: ["spawn-codex"],
          inProgressTaskIds: [],
          blockedTaskIds: [],
          dependencyBlockedTaskIds: []
        },
        {
          groupKey: "delegated_work:att_parent:gemini-cli",
          kind: "delegated_work",
          ownerAttemptId: "att_parent",
          ownerRuntime: "gemini-cli",
          taskIds: ["spawn-gemini"],
          readyTaskIds: ["spawn-gemini"],
          inProgressTaskIds: [],
          blockedTaskIds: [],
          dependencyBlockedTaskIds: []
        }
      ]
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
