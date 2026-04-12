import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionSpawnHeadlessInputBatch,
  type ExecutionSessionSpawnEffects,
  type ExecutionSessionSpawnHeadlessInputInput
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-headless-input-batch helpers", () => {
  it("should fail loudly when the top-level headless-input batch input is malformed", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessInputBatch(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessInputBatch(undefined as never)
    ).toThrow(
      "Execution session spawn headless input batch input must be an object."
    );
  });

  it("should return an empty batch result for an empty bridge list", () => {
    expect(
      deriveExecutionSessionSpawnHeadlessInputBatch({
        items: []
      })
    ).toEqual({
      results: []
    });
  });

  it("should preserve input order while composing headless execution inputs", () => {
    const abortController = new AbortController();

    expect(
      deriveExecutionSessionSpawnHeadlessInputBatch({
        items: [
          {
            effects: createSpawnEffects({
              childAttemptId: "att_child_1",
              parentAttemptId: "att_parent_1",
              parentSessionId: "thr_parent_1",
              sourceKind: "fork"
            }),
            execution: {
              prompt: "child one",
              cwd: "/tmp/child-one",
              timeoutMs: 1_000
            }
          },
          {
            effects: createSpawnEffects({
              childAttemptId: "att_child_2",
              parentAttemptId: "att_parent_2",
              parentSessionId: "thr_parent_2",
              sourceKind: "delegated",
              guardrails: {
                maxChildren: 2,
                maxDepth: 3
              }
            }),
            execution: {
              prompt: "child two",
              abortSignal: abortController.signal
            }
          }
        ]
      })
    ).toEqual({
      results: [
        {
          prompt: "child one",
          cwd: "/tmp/child-one",
          timeoutMs: 1_000,
          attempt: {
            attemptId: "att_child_1",
            parentAttemptId: "att_parent_1",
            sourceKind: "fork"
          }
        },
        {
          prompt: "child two",
          abortSignal: abortController.signal,
          attempt: {
            attemptId: "att_child_2",
            parentAttemptId: "att_parent_2",
            sourceKind: "delegated",
            guardrails: {
              maxChildren: 2,
              maxDepth: 3
            }
          }
        }
      ]
    });
  });

  it("should fail loudly when a batch entry is not an object", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessInputBatch({
        items: [null] as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessInputBatch({
        items: [null] as never
      })
    ).toThrow(
      "Execution session spawn headless input batch requires items entries to be objects."
    );
  });

  it("should keep the batch result minimal and leave inputs untouched", () => {
    const items = [
      {
        effects: createSpawnEffects({
          childAttemptId: "att_child_1",
          parentAttemptId: "att_parent_1",
          parentSessionId: "thr_parent_1"
        }),
        execution: {
          prompt: "child one",
          cwd: "/tmp/child-one"
        }
      },
      {
        effects: createSpawnEffects({
          childAttemptId: "att_child_2",
          parentAttemptId: "att_parent_2",
          parentSessionId: "thr_parent_2",
          sourceKind: "delegated",
          guardrails: {
            maxChildren: 4,
            maxDepth: 5
          }
        }),
        execution: {
          prompt: "child two",
          timeoutMs: 9_000
        }
      }
    ] satisfies ExecutionSessionSpawnHeadlessInputInput[];
    const itemsSnapshot = JSON.parse(JSON.stringify(items));
    const result = deriveExecutionSessionSpawnHeadlessInputBatch({
      items
    }) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      results: [
        {
          prompt: "child one",
          cwd: "/tmp/child-one",
          attempt: {
            attemptId: "att_child_1",
            parentAttemptId: "att_parent_1",
            sourceKind: "fork"
          }
        },
        {
          prompt: "child two",
          timeoutMs: 9_000,
          attempt: {
            attemptId: "att_child_2",
            parentAttemptId: "att_parent_2",
            sourceKind: "delegated",
            guardrails: {
              maxChildren: 4,
              maxDepth: 5
            }
          }
        }
      ]
    });
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("effects");
    expect(result).not.toHaveProperty("controlPlane");
    expect(items).toEqual(itemsSnapshot);
  });

  it("should fail fast on the first bridge error", () => {
    const expectedError = new Error("bridge failed");
    let thirdExecutionAccessed = false;

    expect(() =>
      deriveExecutionSessionSpawnHeadlessInputBatch({
        items: [
          {
            effects: createSpawnEffects({
              childAttemptId: "att_child_1"
            }),
            execution: {
              prompt: "child one"
            }
          },
          {
            effects: createSpawnEffects({
              childAttemptId: "att_child_2"
            }),
            get execution() {
              throw expectedError;
            }
          },
          {
            effects: createSpawnEffects({
              childAttemptId: "att_child_3"
            }),
            get execution() {
              thirdExecutionAccessed = true;
              return {
                prompt: "child three"
              };
            }
          }
        ] as readonly ExecutionSessionSpawnHeadlessInputInput[]
      })
    ).toThrow(expectedError);
    expect(thirdExecutionAccessed).toBe(false);
  });
});

function createSpawnEffects(
  overrides: {
    childAttemptId?: string;
    guardrails?: ExecutionSessionSpawnEffects["lineage"]["guardrails"];
    parentAttemptId?: string;
    parentSessionId?: string;
    sourceKind?: ExecutionSessionSpawnEffects["lineage"]["sourceKind"];
  } = {}
): ExecutionSessionSpawnEffects {
  const childAttemptId = overrides.childAttemptId ?? "att_child";
  const parentAttemptId = overrides.parentAttemptId ?? "att_parent";
  const parentSessionId = overrides.parentSessionId ?? "thr_parent";
  const sourceKind = overrides.sourceKind ?? "fork";

  return {
    lineage: {
      attemptId: childAttemptId,
      parentAttemptId,
      sourceKind,
      ...(overrides.guardrails === undefined
        ? {}
        : {
            guardrails: overrides.guardrails
          })
    },
    requestedEvent: {
      attemptId: parentAttemptId,
      runtime: "codex-cli",
      sessionId: parentSessionId,
      lifecycleEventKind: "spawn_requested"
    },
    recordedEvent: {
      attemptId: parentAttemptId,
      runtime: "codex-cli",
      sessionId: parentSessionId,
      lifecycleEventKind: "spawn_recorded"
    }
  };
}
