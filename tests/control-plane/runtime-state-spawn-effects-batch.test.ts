import { describe, expect, it } from "vitest";

import {
  deriveExecutionSessionSpawnEffectsBatch,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state spawn-effects-batch helpers", () => {
  it("should return an empty batch result for an empty effects list", () => {
    expect(
      deriveExecutionSessionSpawnEffectsBatch({
        items: []
      })
    ).toEqual({
      results: []
    });
  });

  it("should preserve input order while composing effects", () => {
    expect(
      deriveExecutionSessionSpawnEffectsBatch({
        items: [
          {
            childAttemptId: "att_child_1",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_1",
              parentSessionId: "thr_parent_1",
              sourceKind: "fork"
            })
          },
          {
            childAttemptId: "att_child_2",
            request: createSpawnRequest({
              parentAttemptId: "att_parent_2",
              parentSessionId: "thr_parent_2",
              sourceKind: "delegated",
              inheritedGuardrails: {
                maxChildren: 2,
                maxDepth: 3
              }
            })
          }
        ]
      })
    ).toEqual({
      results: [
        {
          lineage: {
            attemptId: "att_child_1",
            parentAttemptId: "att_parent_1",
            sourceKind: "fork"
          },
          requestedEvent: {
            attemptId: "att_parent_1",
            runtime: "codex-cli",
            sessionId: "thr_parent_1",
            lifecycleEventKind: "spawn_requested"
          },
          recordedEvent: {
            attemptId: "att_parent_1",
            runtime: "codex-cli",
            sessionId: "thr_parent_1",
            lifecycleEventKind: "spawn_recorded"
          }
        },
        {
          lineage: {
            attemptId: "att_child_2",
            parentAttemptId: "att_parent_2",
            sourceKind: "delegated",
            guardrails: {
              maxChildren: 2,
              maxDepth: 3
            }
          },
          requestedEvent: {
            attemptId: "att_parent_2",
            runtime: "codex-cli",
            sessionId: "thr_parent_2",
            lifecycleEventKind: "spawn_requested"
          },
          recordedEvent: {
            attemptId: "att_parent_2",
            runtime: "codex-cli",
            sessionId: "thr_parent_2",
            lifecycleEventKind: "spawn_recorded"
          }
        }
      ]
    });
  });

  it("should keep the batch result minimal and leave inputs untouched", () => {
    const items = [
      {
        childAttemptId: "att_child_1",
        request: createSpawnRequest({
          sourceKind: "fork"
        })
      },
      {
        childAttemptId: "att_child_2",
        request: createSpawnRequest({
          parentAttemptId: "att_parent_guarded",
          parentSessionId: "thr_parent_guarded",
          sourceKind: "delegated",
          inheritedGuardrails: {
            maxChildren: 4,
            maxDepth: 5
          }
        })
      }
    ];
    const itemsSnapshot = JSON.parse(JSON.stringify(items));
    const result = deriveExecutionSessionSpawnEffectsBatch({
      items
    }) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      results: [
        {
          lineage: {
            attemptId: "att_child_1",
            parentAttemptId: "att_parent",
            sourceKind: "fork"
          },
          requestedEvent: {
            attemptId: "att_parent",
            runtime: "codex-cli",
            sessionId: "thr_parent",
            lifecycleEventKind: "spawn_requested"
          },
          recordedEvent: {
            attemptId: "att_parent",
            runtime: "codex-cli",
            sessionId: "thr_parent",
            lifecycleEventKind: "spawn_recorded"
          }
        },
        {
          lineage: {
            attemptId: "att_child_2",
            parentAttemptId: "att_parent_guarded",
            sourceKind: "delegated",
            guardrails: {
              maxChildren: 4,
              maxDepth: 5
            }
          },
          requestedEvent: {
            attemptId: "att_parent_guarded",
            runtime: "codex-cli",
            sessionId: "thr_parent_guarded",
            lifecycleEventKind: "spawn_requested"
          },
          recordedEvent: {
            attemptId: "att_parent_guarded",
            runtime: "codex-cli",
            sessionId: "thr_parent_guarded",
            lifecycleEventKind: "spawn_recorded"
          }
        }
      ]
    });
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("apply");
    expect(result).not.toHaveProperty("consume");
    expect(items).toEqual(itemsSnapshot);
  });

  it("should fail fast on the first invalid effects item", () => {
    expect(() =>
      deriveExecutionSessionSpawnEffectsBatch({
        items: [
          {
            childAttemptId: "att_child_1",
            request: createSpawnRequest({
              sourceKind: "fork"
            })
          },
          {
            childAttemptId: "att_parent",
            request: createSpawnRequest({
              sourceKind: "fork"
            })
          },
          {
            childAttemptId: "att_child_3",
            request: createSpawnRequest({
              sourceKind: "resume"
            }) as never
          }
        ]
      })
    ).toThrow(/childAttemptId/i);
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
