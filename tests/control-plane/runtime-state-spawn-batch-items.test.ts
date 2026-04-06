import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnBatchItems,
  deriveExecutionSessionSpawnBatchPlan,
  deriveExecutionSessionSpawnCandidate
} from "../../src/control-plane/internal.js";
import type {
  ExecutionSessionRecord,
  ExecutionSessionSpawnRequestSourceKind
} from "../../src/control-plane/types.js";

describe("control-plane runtime-state spawn-batch-items helpers", () => {
  it("should derive ordered spawn batch items from a plannable fork plan", () => {
    const plan = createPlan({
      requestedCount: 2,
      records: [
        createRecord({
          attemptId: "att_parent",
          sessionId: "thr_parent",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]
    });

    expect(
      deriveExecutionSessionSpawnBatchItems({
        plan,
        childAttemptIds: ["att_child_1", "att_child_2"],
        sourceKind: "fork"
      })
    ).toEqual({
      plan,
      items: [
        {
          childAttemptId: "att_child_1",
          request: {
            parentAttemptId: "att_parent",
            parentRuntime: "codex-cli",
            parentSessionId: "thr_parent",
            sourceKind: "fork"
          }
        },
        {
          childAttemptId: "att_child_2",
          request: {
            parentAttemptId: "att_parent",
            parentRuntime: "codex-cli",
            parentSessionId: "thr_parent",
            sourceKind: "fork"
          }
        }
      ]
    });
  });

  it("should preserve canonical inherited guardrails on delegated batch items", () => {
    const plan = createPlan({
      requestedCount: 2,
      records: [
        createRecord({
          attemptId: "att_guarded_parent",
          sessionId: "thr_guarded_parent",
          sourceKind: "direct",
          lifecycleState: "active",
          guardrails: {
            maxChildren: 4,
            maxDepth: 3
          }
        })
      ]
    });

    expect(
      deriveExecutionSessionSpawnBatchItems({
        plan,
        childAttemptIds: ["att_child_a", "att_child_b"],
        sourceKind: "delegated"
      })
    ).toEqual({
      plan,
      items: [
        {
          childAttemptId: "att_child_a",
          request: {
            parentAttemptId: "att_guarded_parent",
            parentRuntime: "codex-cli",
            parentSessionId: "thr_guarded_parent",
            sourceKind: "delegated",
            inheritedGuardrails: {
              maxChildren: 4,
              maxDepth: 3
            }
          }
        },
        {
          childAttemptId: "att_child_b",
          request: {
            parentAttemptId: "att_guarded_parent",
            parentRuntime: "codex-cli",
            parentSessionId: "thr_guarded_parent",
            sourceKind: "delegated",
            inheritedGuardrails: {
              maxChildren: 4,
              maxDepth: 3
            }
          }
        }
      ]
    });
  });

  it("should preserve a blocked plan while omitting projected items", () => {
    const plan = createPlan({
      requestedCount: 1,
      records: [
        createRecord({
          attemptId: "att_blocked_parent",
          sessionId: "thr_blocked_parent",
          sourceKind: "direct",
          lifecycleState: "failed"
        })
      ]
    });
    const result = deriveExecutionSessionSpawnBatchItems({
      plan,
      childAttemptIds: ["att_child_blocked"],
      sourceKind: "fork"
    }) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      plan
    });
    expect(result).not.toHaveProperty("items");
    expect(result).not.toHaveProperty("request");
    expect(result).not.toHaveProperty("requests");
    expect(result).not.toHaveProperty("apply");
    expect(result).not.toHaveProperty("headlessInput");
    expect(result).not.toHaveProperty("queue");
    expect(result).not.toHaveProperty("scheduler");
    expect(result).not.toHaveProperty("manifest");
  });

  it("should reject invalid source kinds even when the plan is blocked", () => {
    const plan = createPlan({
      requestedCount: 1,
      records: [
        createRecord({
          attemptId: "att_blocked_parent",
          sessionId: "thr_blocked_parent",
          sourceKind: "direct",
          lifecycleState: "failed"
        })
      ]
    });

    expect(() =>
      deriveExecutionSessionSpawnBatchItems({
        plan,
        childAttemptIds: ["att_child_blocked"],
        sourceKind: "resume" as unknown as ExecutionSessionSpawnRequestSourceKind
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnBatchItems({
        plan,
        childAttemptIds: ["att_child_blocked"],
        sourceKind: "resume" as unknown as ExecutionSessionSpawnRequestSourceKind
      })
    ).toThrow(/sourceKind/i);
  });

  it("should reject childAttemptIds that do not match requestedCount", () => {
    const plan = createPlan({
      requestedCount: 2,
      records: [
        createRecord({
          attemptId: "att_parent_count",
          sessionId: "thr_parent_count",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]
    });

    expect(() =>
      deriveExecutionSessionSpawnBatchItems({
        plan,
        childAttemptIds: ["att_child_only"],
        sourceKind: "fork"
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnBatchItems({
        plan,
        childAttemptIds: ["att_child_only"],
        sourceKind: "fork"
      })
    ).toThrow(/childAttemptIds/i);
  });

  it("should reject childAttemptIds that normalize to duplicate identifiers", () => {
    const plan = createPlan({
      requestedCount: 2,
      records: [
        createRecord({
          attemptId: "att_parent_dupes",
          sessionId: "thr_parent_dupes",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]
    });

    expect(() =>
      deriveExecutionSessionSpawnBatchItems({
        plan,
        childAttemptIds: ["att_child_dup", "  att_child_dup  "],
        sourceKind: "fork"
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnBatchItems({
        plan,
        childAttemptIds: ["att_child_dup", "  att_child_dup  "],
        sourceKind: "fork"
      })
    ).toThrow(/childAttemptIds/i);
  });
});

function createPlan(input: {
  records: readonly ExecutionSessionRecord[];
  requestedCount: number;
}) {
  const candidate = deriveExecutionSessionSpawnCandidate({
    view: buildExecutionSessionView(input.records),
    selector: {
      attemptId: input.records[0]?.attemptId ?? "att_parent"
    }
  });

  if (!candidate) {
    throw new Error("expected spawn candidate");
  }

  return deriveExecutionSessionSpawnBatchPlan({
    candidate,
    requestedCount: input.requestedCount
  });
}

function createRecord(
  overrides: Partial<ExecutionSessionRecord> &
    Pick<ExecutionSessionRecord, "attemptId" | "sourceKind">
): ExecutionSessionRecord {
  const { attemptId, sourceKind, ...rest } = overrides;

  return {
    attemptId,
    runtime: "codex-cli",
    sourceKind,
    lifecycleState: "created",
    runCompleted: false,
    errorEventCount: 0,
    origin: "headless_result",
    ...rest
  };
}
