import { describe, expect, it } from "vitest";

import {
  deriveExecutionSessionSpawnBatchHeadlessApplyItems,
  type ExecutionSessionSpawnBatchItems,
  type ExecutionSessionSpawnEffectsInput,
  type ExecutionSessionSpawnHeadlessInputSeed
} from "../../src/control-plane/internal.js";

describe(
  "control-plane runtime-state spawn-batch-headless-apply-items helpers",
  () => {
    it("should preserve a blocked batch without projecting headless apply items", () => {
      let executionAccessed = false;
      const batchItems = {
        plan: createPlan({
          requestedCount: 1,
          canPlan: false
        })
      } satisfies ExecutionSessionSpawnBatchItems;

      const result = deriveExecutionSessionSpawnBatchHeadlessApplyItems({
        batchItems,
        get executions() {
          executionAccessed = true;
          return [
            {
              prompt: "child one"
            }
          ];
        }
      }) as unknown as Record<string, unknown>;

      expect(result).toEqual({
        batchItems
      });
      expect(executionAccessed).toBe(false);
      expect(result).not.toHaveProperty("items");
      expect(result).not.toHaveProperty("apply");
      expect(result).not.toHaveProperty("execute");
      expect(result).not.toHaveProperty("record");
      expect(result).not.toHaveProperty("view");
      expect(result).not.toHaveProperty("context");
    });

    it("should preserve projected item order while pairing executions with batch items", () => {
      const abortController = new AbortController();
      const batchItems = {
        plan: createPlan({
          requestedCount: 2,
          canPlan: true
        }),
        items: [
          createBatchItem({
            childAttemptId: "att_child_headless_1",
            parentAttemptId: "att_parent_headless",
            parentSessionId: "thr_parent_headless",
            sourceKind: "fork"
          }),
          createBatchItem({
            childAttemptId: "att_child_headless_2",
            parentAttemptId: "att_parent_headless",
            parentSessionId: "thr_parent_headless",
            sourceKind: "delegated",
            inheritedGuardrails: {
              maxChildren: 3,
              maxDepth: 4
            }
          })
        ]
      } satisfies ExecutionSessionSpawnBatchItems;
      const executions = [
        {
          prompt: "child one",
          cwd: "/tmp/headless-one"
        },
        {
          prompt: "child two",
          abortSignal: abortController.signal,
          timeoutMs: 2_000
        }
      ] satisfies readonly ExecutionSessionSpawnHeadlessInputSeed[];
      const result = deriveExecutionSessionSpawnBatchHeadlessApplyItems({
        batchItems,
        executions
      }) as unknown as Record<string, unknown>;

      expect(result).toEqual({
        batchItems,
        items: [
          {
            childAttemptId: "att_child_headless_1",
            request: {
              parentAttemptId: "att_parent_headless",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_parent_headless",
              sourceKind: "fork"
            },
            execution: {
              prompt: "child one",
              cwd: "/tmp/headless-one"
            }
          },
          {
            childAttemptId: "att_child_headless_2",
            request: {
              parentAttemptId: "att_parent_headless",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_parent_headless",
              sourceKind: "delegated",
              inheritedGuardrails: {
                maxChildren: 3,
                maxDepth: 4
              }
            },
            execution: {
              prompt: "child two",
              abortSignal: abortController.signal,
              timeoutMs: 2_000
            }
          }
        ]
      });
      expect((result.items as Array<{ request: ExecutionSessionSpawnEffectsInput["request"] }>)[0]?.request).not.toBe(
        batchItems.items?.[0]?.request
      );
      expect((result.items as Array<{ execution: ExecutionSessionSpawnHeadlessInputSeed }>)[0]?.execution).not.toBe(
        executions[0]
      );
      expect(batchItems.items?.[1]?.request.inheritedGuardrails).toEqual({
        maxChildren: 3,
        maxDepth: 4
      });
      expect(executions[1]).toEqual({
        prompt: "child two",
        abortSignal: abortController.signal,
        timeoutMs: 2_000
      });
    });

    it("should project only the canonical execution seed fields", () => {
      const abortController = new AbortController();
      const batchItems = {
        plan: createPlan({
          requestedCount: 1,
          canPlan: true
        }),
        items: [
          createBatchItem({
            childAttemptId: "att_child_whitelist"
          })
        ]
      } satisfies ExecutionSessionSpawnBatchItems;
      const execution = {
        prompt: "child one",
        cwd: "/tmp/headless-one",
        timeoutMs: 3_000,
        abortSignal: abortController.signal,
        profile: "shadow-profile",
        metadata: {
          leak: true
        }
      } as ExecutionSessionSpawnHeadlessInputSeed & {
        metadata: {
          leak: boolean;
        };
        profile: string;
      };

      const result = deriveExecutionSessionSpawnBatchHeadlessApplyItems({
        batchItems,
        executions: [execution]
      }) as unknown as {
        items: Array<{
          execution: Record<string, unknown>;
        }>;
      };

      expect(result.items).toEqual([
        {
          childAttemptId: "att_child_whitelist",
          request: {
            parentAttemptId: "att_parent",
            parentRuntime: "codex-cli",
            parentSessionId: "thr_parent",
            sourceKind: "fork"
          },
          execution: {
            prompt: "child one",
            cwd: "/tmp/headless-one",
            timeoutMs: 3_000,
            abortSignal: abortController.signal
          }
        }
      ]);
      expect(result.items[0]?.execution).not.toBe(execution);
      expect(result.items[0]?.execution).not.toHaveProperty("profile");
      expect(result.items[0]?.execution).not.toHaveProperty("metadata");
    });

    it("should keep projected execution and guardrail copies isolated from later source mutation", () => {
      const abortController = new AbortController();
      const inheritedGuardrails = {
        maxChildren: 3,
        maxDepth: 4
      };
      const batchItems = {
        plan: createPlan({
          requestedCount: 1,
          canPlan: true
        }),
        items: [
          createBatchItem({
            childAttemptId: "att_child_mutation",
            inheritedGuardrails
          })
        ]
      } satisfies ExecutionSessionSpawnBatchItems;
      const execution = {
        prompt: "child one",
        cwd: "/tmp/original",
        timeoutMs: 2_000,
        abortSignal: abortController.signal
      } satisfies ExecutionSessionSpawnHeadlessInputSeed;
      const result = deriveExecutionSessionSpawnBatchHeadlessApplyItems({
        batchItems,
        executions: [execution]
      }) as unknown as {
        items: Array<{
          execution: ExecutionSessionSpawnHeadlessInputSeed;
          request: ExecutionSessionSpawnEffectsInput["request"];
        }>;
      };

      execution.cwd = "/tmp/changed";
      execution.timeoutMs = 9_000;
      inheritedGuardrails.maxDepth = 99;

      expect(result.items[0]?.execution).toEqual({
        prompt: "child one",
        cwd: "/tmp/original",
        timeoutMs: 2_000,
        abortSignal: abortController.signal
      });
      expect(result.items[0]?.execution.abortSignal).toBe(abortController.signal);
      expect(result.items[0]?.request.inheritedGuardrails).toEqual({
        maxChildren: 3,
        maxDepth: 4
      });
    });

    it("should ignore inherited or non-enumerable canonical execution fields during projection", () => {
      const batchItems = {
        plan: createPlan({
          requestedCount: 1,
          canPlan: true
        }),
        items: [
          createBatchItem({
            childAttemptId: "att_child_enumerable"
          })
        ]
      } satisfies ExecutionSessionSpawnBatchItems;
      const execution = Object.create({
        prompt: "from-prototype"
      }) as ExecutionSessionSpawnHeadlessInputSeed & {
        metadata?: {
          leak: boolean;
        };
      };

      Object.defineProperty(execution, "cwd", {
        value: "/tmp/non-enumerable",
        enumerable: false
      });
      execution.timeoutMs = 2_000;
      execution.metadata = {
        leak: true
      };

      const result = deriveExecutionSessionSpawnBatchHeadlessApplyItems({
        batchItems,
        executions: [execution]
      }) as unknown as {
        items: Array<{
          execution: Record<string, unknown>;
        }>;
      };

      expect(result.items[0]?.execution).toEqual({
        timeoutMs: 2_000
      });
      expect(result.items[0]?.execution).not.toHaveProperty("prompt");
      expect(result.items[0]?.execution).not.toHaveProperty("cwd");
      expect(result.items[0]?.execution).not.toHaveProperty("metadata");
    });

    it("should reject execution counts that do not match the projected batch items", () => {
      expect(() =>
        deriveExecutionSessionSpawnBatchHeadlessApplyItems({
          batchItems: {
            plan: createPlan({
              requestedCount: 2,
              canPlan: true
            }),
            items: [
              createBatchItem({
                childAttemptId: "att_child_mismatch_1"
              }),
              createBatchItem({
                childAttemptId: "att_child_mismatch_2"
              })
            ]
          },
          executions: [
            {
              prompt: "child one"
            }
          ]
        })
      ).toThrow(
        "Execution session spawn batch headless apply items executions length must match batchItems.items length."
      );
    });

    it("should reject malformed execution entries before projecting headless apply items", () => {
      expect(() =>
        deriveExecutionSessionSpawnBatchHeadlessApplyItems({
          batchItems: {
            plan: createPlan({
              requestedCount: 1,
              canPlan: true
            }),
            items: [
              createBatchItem({
                childAttemptId: "att_child_invalid_execution"
              })
            ]
          },
          executions: ["bad-seed"] as unknown as readonly ExecutionSessionSpawnHeadlessInputSeed[]
        })
      ).toThrow(
        "Execution session spawn batch headless apply items executions entries must be objects."
      );
    });

    it("should fail fast on the first execution projection error", () => {
      let thirdExecutionAccessed = false;

      expect(() =>
        deriveExecutionSessionSpawnBatchHeadlessApplyItems({
          batchItems: {
            plan: createPlan({
              requestedCount: 3,
              canPlan: true
            }),
            items: [
              createBatchItem({
                childAttemptId: "att_child_fail_fast_1"
              }),
              createBatchItem({
                childAttemptId: "att_child_fail_fast_2"
              }),
              createBatchItem({
                childAttemptId: "att_child_fail_fast_3"
              })
            ]
          },
          executions: [
            {
              prompt: "child one"
            },
            {
              get prompt() {
                throw new Error("projection failed");
              }
            },
            {
              get prompt() {
                thirdExecutionAccessed = true;
                return "child three";
              }
            }
          ] as readonly ExecutionSessionSpawnHeadlessInputSeed[]
        })
      ).toThrow("projection failed");
      expect(thirdExecutionAccessed).toBe(false);
    });
  }
);

function createBatchItem(
  overrides: {
    childAttemptId?: string;
    inheritedGuardrails?: ExecutionSessionSpawnEffectsInput["request"]["inheritedGuardrails"];
    parentAttemptId?: string;
    parentSessionId?: string;
    sourceKind?: ExecutionSessionSpawnEffectsInput["request"]["sourceKind"];
  } = {}
): ExecutionSessionSpawnEffectsInput {
  return {
    childAttemptId: overrides.childAttemptId ?? "att_child",
    request: {
      parentAttemptId: overrides.parentAttemptId ?? "att_parent",
      parentRuntime: "codex-cli",
      parentSessionId: overrides.parentSessionId ?? "thr_parent",
      sourceKind: overrides.sourceKind ?? "fork",
      ...(overrides.inheritedGuardrails === undefined
        ? {}
        : {
            inheritedGuardrails: overrides.inheritedGuardrails
          })
    }
  };
}

function createPlan(
  overrides: {
    canPlan: boolean;
    requestedCount: number;
  }
): ExecutionSessionSpawnBatchItems["plan"] {
  return {
    candidate: {
      budget: {
        childCount: 0,
        lineageDepth: 0,
        lineageDepthKnown: true,
        maxChildren: 4,
        remainingChildSlots: 4,
        maxDepth: 5,
        remainingDepthAllowance: 4,
        withinChildLimit: true,
        withinDepthLimit: true
      },
      context: {
        record: {
          attemptId: "att_parent",
          runtime: "codex-cli",
          sourceKind: "direct",
          lifecycleState: "active",
          runCompleted: false,
          errorEventCount: 0,
          origin: "headless_result",
          sessionId: "thr_parent"
        },
        selectedBy: "attemptId",
        childRecords: [],
        hasKnownSession: true,
        hasParent: false,
        hasResolvedParent: false,
        hasChildren: false
      },
      readiness: {
        canSpawn: overrides.canPlan,
        blockingReasons: overrides.canPlan ? [] : ["session_unknown"],
        hasBlockingReasons: !overrides.canPlan,
        lineageDepth: 0,
        lineageDepthKnown: true,
        withinChildLimit: true,
        withinDepthLimit: true
      }
    },
    requestedCount: overrides.requestedCount,
    fitsRemainingChildSlots: overrides.canPlan,
    canPlan: overrides.canPlan
  };
}
