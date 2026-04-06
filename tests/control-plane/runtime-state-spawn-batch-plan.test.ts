import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnBatchPlan,
  deriveExecutionSessionSpawnCandidate
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state spawn-batch-plan helpers", () => {
  it("should allow a positive requestedCount when child slots are unbounded", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_unbounded",
          sessionId: "thr_unbounded",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_unbounded"
      }
    });

    expect(
      deriveExecutionSessionSpawnBatchPlan({
        candidate: candidate!,
        requestedCount: 3
      })
    ).toEqual({
      candidate,
      requestedCount: 3,
      fitsRemainingChildSlots: true,
      canPlan: true
    });
  });

  it("should allow a batch that fits within remaining child slots", () => {
    const parentRecord = createRecord({
      attemptId: "att_budgeted",
      sessionId: "thr_budgeted",
      sourceKind: "direct",
      lifecycleState: "active",
      guardrails: {
        maxChildren: 3
      }
    });
    const childRecord = createRecord({
      attemptId: "att_budgeted_child",
      sourceKind: "fork",
      parentAttemptId: "att_budgeted",
      lifecycleState: "active"
    });
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([parentRecord, childRecord]),
      selector: {
        attemptId: "att_budgeted"
      }
    });

    expect(
      deriveExecutionSessionSpawnBatchPlan({
        candidate: candidate!,
        requestedCount: 2
      })
    ).toEqual({
      candidate,
      requestedCount: 2,
      fitsRemainingChildSlots: true,
      canPlan: true
    });
  });

  it("should block a batch that would exceed remaining child slots", () => {
    const parentRecord = createRecord({
      attemptId: "att_exhausting",
      sessionId: "thr_exhausting",
      sourceKind: "direct",
      lifecycleState: "active",
      guardrails: {
        maxChildren: 3
      }
    });
    const childRecord = createRecord({
      attemptId: "att_existing_child",
      sourceKind: "fork",
      parentAttemptId: "att_exhausting",
      lifecycleState: "active"
    });
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([parentRecord, childRecord]),
      selector: {
        attemptId: "att_exhausting"
      }
    });

    expect(
      deriveExecutionSessionSpawnBatchPlan({
        candidate: candidate!,
        requestedCount: 3
      })
    ).toEqual({
      candidate,
      requestedCount: 3,
      fitsRemainingChildSlots: false,
      canPlan: false
    });
  });

  it("should preserve a blocked candidate without inventing planner blockers", () => {
    const blockedCandidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_blocked",
          sessionId: "thr_blocked",
          sourceKind: "direct",
          lifecycleState: "failed"
        })
      ]),
      selector: {
        attemptId: "att_blocked"
      }
    });
    const result = deriveExecutionSessionSpawnBatchPlan({
      candidate: blockedCandidate!,
      requestedCount: 1
    }) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      candidate: blockedCandidate,
      requestedCount: 1,
      fitsRemainingChildSlots: true,
      canPlan: false
    });
    expect(result).not.toHaveProperty("blockingReasons");
    expect(result).not.toHaveProperty("allowedCount");
    expect(result).not.toHaveProperty("request");
    expect(result).not.toHaveProperty("requests");
    expect(result).not.toHaveProperty("target");
    expect(result).not.toHaveProperty("targets");
    expect(result).not.toHaveProperty("scheduler");
    expect(result).not.toHaveProperty("queue");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("branch");
    expect(result).not.toHaveProperty("worktreePath");
  });

  it("should reject requestedCount values that are not positive integers", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_validation",
          sessionId: "thr_validation",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_validation"
      }
    });

    for (const requestedCount of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        deriveExecutionSessionSpawnBatchPlan({
          candidate: candidate!,
          requestedCount
        })
      ).toThrow(ValidationError);
      expect(() =>
        deriveExecutionSessionSpawnBatchPlan({
          candidate: candidate!,
          requestedCount
        })
      ).toThrow(/requestedCount/i);
    }
  });
});

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
