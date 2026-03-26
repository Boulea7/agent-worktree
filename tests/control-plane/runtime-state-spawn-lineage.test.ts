import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import { deriveExecutionSessionSpawnLineage } from "../../src/control-plane/internal.js";
import type { ExecutionSessionSpawnRequest } from "../../src/control-plane/types.js";

describe("control-plane runtime-state spawn-lineage helpers", () => {
  it("should derive fork spawn lineage from a valid spawn request", () => {
    expect(
      deriveExecutionSessionSpawnLineage({
        request: createSpawnRequest({
          sourceKind: "fork"
        }),
        childAttemptId: "att_child_fork"
      })
    ).toEqual({
      attemptId: "att_child_fork",
      parentAttemptId: "att_parent",
      sourceKind: "fork"
    });
  });

  it("should derive delegated spawn lineage and carry inherited guardrails through", () => {
    expect(
      deriveExecutionSessionSpawnLineage({
        request: createSpawnRequest({
          sourceKind: "delegated",
          inheritedGuardrails: {
            maxChildren: 2,
            maxDepth: 3
          }
        }),
        childAttemptId: "att_child_delegated"
      })
    ).toEqual({
      attemptId: "att_child_delegated",
      parentAttemptId: "att_parent",
      sourceKind: "delegated",
      guardrails: {
        maxChildren: 2,
        maxDepth: 3
      }
    });
  });

  it("should omit guardrails when the spawn request has no inherited guardrails", () => {
    const lineage = deriveExecutionSessionSpawnLineage({
      request: createSpawnRequest({
        sourceKind: "fork"
      }),
      childAttemptId: "att_child_plain"
    });

    expect(lineage).toEqual({
      attemptId: "att_child_plain",
      parentAttemptId: "att_parent",
      sourceKind: "fork"
    });
    expect(lineage).not.toHaveProperty("guardrails");
  });

  it("should derive spawn lineage without mutating the source request", () => {
    const request = createSpawnRequest({
      sourceKind: "delegated",
      inheritedGuardrails: {
        maxChildren: 4,
        maxDepth: 5
      }
    });
    const requestSnapshot = JSON.parse(JSON.stringify(request));

    expect(
      deriveExecutionSessionSpawnLineage({
        request,
        childAttemptId: "att_child_immutable"
      })
    ).toEqual({
      attemptId: "att_child_immutable",
      parentAttemptId: "att_parent",
      sourceKind: "delegated",
      guardrails: {
        maxChildren: 4,
        maxDepth: 5
      }
    });
    expect(request).toEqual(requestSnapshot);
  });

  it("should reject blank child attempt identifiers", () => {
    for (const childAttemptId of ["", "   "]) {
      expect(() =>
        deriveExecutionSessionSpawnLineage({
          request: createSpawnRequest({
            sourceKind: "fork"
          }),
          childAttemptId
        })
      ).toThrow(ValidationError);
      expect(() =>
        deriveExecutionSessionSpawnLineage({
          request: createSpawnRequest({
            sourceKind: "fork"
          }),
          childAttemptId
        })
      ).toThrow(/childAttemptId/i);
    }
  });

  it("should reject child attempt identifiers that match the parent attempt", () => {
    expect(() =>
      deriveExecutionSessionSpawnLineage({
        request: createSpawnRequest({
          sourceKind: "delegated"
        }),
        childAttemptId: "att_parent"
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnLineage({
        request: createSpawnRequest({
          sourceKind: "delegated"
        }),
        childAttemptId: "att_parent"
      })
    ).toThrow(/childAttemptId/i);
  });

  it("should reject invalid spawn lineage source kinds", () => {
    for (const sourceKind of ["direct", "resume", "   "]) {
      expect(() =>
        deriveExecutionSessionSpawnLineage({
          request: createSpawnRequest({
            sourceKind
          }) as never,
          childAttemptId: "att_child_invalid_source"
        })
      ).toThrow(ValidationError);
      expect(() =>
        deriveExecutionSessionSpawnLineage({
          request: createSpawnRequest({
            sourceKind
          }) as never,
          childAttemptId: "att_child_invalid_source"
        })
      ).toThrow(/sourceKind/i);
    }
  });

  it("should keep parent runtime, parent session, and planning fields out of the derived lineage", () => {
    const lineage = deriveExecutionSessionSpawnLineage({
      request: createSpawnRequest({
        sourceKind: "fork",
        inheritedGuardrails: {
          maxChildren: 1,
          maxDepth: 2
        },
        branch: "feature/parent",
        childBranch: "feature/child",
        worktreePath: "/tmp/parent",
        childWorktreePath: "/tmp/child",
        childRuntime: "codex-cli",
        runtimeMode: "headless",
        prompt: "Spawn a child attempt",
        task: "spawn task",
        taskId: "task_spawn",
        parentAttemptLineage: {
          attemptId: "att_parent"
        }
      }) as never,
      childAttemptId: "att_child_minimal"
    });

    expect(lineage).toEqual({
      attemptId: "att_child_minimal",
      parentAttemptId: "att_parent",
      sourceKind: "fork",
      guardrails: {
        maxChildren: 1,
        maxDepth: 2
      }
    });
    expect(lineage).not.toHaveProperty("parentRuntime");
    expect(lineage).not.toHaveProperty("parentSessionId");
    expect(lineage).not.toHaveProperty("inheritedGuardrails");
    expect(lineage).not.toHaveProperty("branch");
    expect(lineage).not.toHaveProperty("childBranch");
    expect(lineage).not.toHaveProperty("worktreePath");
    expect(lineage).not.toHaveProperty("childWorktreePath");
    expect(lineage).not.toHaveProperty("childRuntime");
    expect(lineage).not.toHaveProperty("runtimeMode");
    expect(lineage).not.toHaveProperty("prompt");
    expect(lineage).not.toHaveProperty("task");
    expect(lineage).not.toHaveProperty("taskId");
    expect(lineage).not.toHaveProperty("parentAttemptLineage");
  });
});

function createSpawnRequest(
  overrides: Record<string, unknown>
): ExecutionSessionSpawnRequest & Record<string, unknown> {
  return {
    parentAttemptId: "att_parent",
    parentRuntime: "codex-cli",
    parentSessionId: "thr_parent",
    sourceKind: "fork",
    ...overrides
  } as ExecutionSessionSpawnRequest & Record<string, unknown>;
}
