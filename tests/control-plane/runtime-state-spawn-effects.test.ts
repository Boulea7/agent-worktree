import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionSpawnEffects,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state spawn-effects helpers", () => {
  it("should derive minimal spawn effects from a valid fork request", () => {
    expect(
      deriveExecutionSessionSpawnEffects({
        childAttemptId: "att_child_fork",
        request: createSpawnRequest({
          sourceKind: "fork"
        })
      })
    ).toEqual({
      lineage: {
        attemptId: "att_child_fork",
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
    });
  });

  it("should carry delegated guardrails only through lineage", () => {
    expect(
      deriveExecutionSessionSpawnEffects({
        childAttemptId: "att_child_delegated",
        request: createSpawnRequest({
          sourceKind: "delegated",
          inheritedGuardrails: {
            maxChildren: 2,
            maxDepth: 3
          }
        })
      })
    ).toEqual({
      lineage: {
        attemptId: "att_child_delegated",
        parentAttemptId: "att_parent",
        sourceKind: "delegated",
        guardrails: {
          maxChildren: 2,
          maxDepth: 3
        }
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
    });
  });

  it("should let childAttemptId affect only lineage", () => {
    const request = createSpawnRequest({
      sourceKind: "fork"
    });
    const first = deriveExecutionSessionSpawnEffects({
      childAttemptId: "att_child_1",
      request
    });
    const second = deriveExecutionSessionSpawnEffects({
      childAttemptId: "att_child_2",
      request
    });

    expect(first.lineage).toEqual({
      attemptId: "att_child_1",
      parentAttemptId: "att_parent",
      sourceKind: "fork"
    });
    expect(second.lineage).toEqual({
      attemptId: "att_child_2",
      parentAttemptId: "att_parent",
      sourceKind: "fork"
    });
    expect(first.requestedEvent).toEqual(second.requestedEvent);
    expect(first.recordedEvent).toEqual(second.recordedEvent);
  });

  it("should keep the result shape minimal and leave the request untouched", () => {
    const request = createSpawnRequest({
      sourceKind: "delegated",
      inheritedGuardrails: {
        maxChildren: 4,
        maxDepth: 5
      }
    });
    const requestSnapshot = JSON.parse(JSON.stringify(request));
    const effects = deriveExecutionSessionSpawnEffects({
      childAttemptId: "att_child_minimal",
      request
    }) as unknown as Record<string, unknown>;

    expect(effects).toEqual({
      lineage: {
        attemptId: "att_child_minimal",
        parentAttemptId: "att_parent",
        sourceKind: "delegated",
        guardrails: {
          maxChildren: 4,
          maxDepth: 5
        }
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
    });
    expect(effects).not.toHaveProperty("request");
    expect(effects).not.toHaveProperty("selector");
    expect(effects).not.toHaveProperty("view");
    expect(effects).not.toHaveProperty("context");
    expect(effects).not.toHaveProperty("candidate");
    expect(effects).not.toHaveProperty("target");
    expect(effects).not.toHaveProperty("readiness");
    expect(effects).not.toHaveProperty("consume");
    expect(effects).not.toHaveProperty("apply");
    expect(effects).not.toHaveProperty("manifest");
    expect(effects).not.toHaveProperty("parentAttemptId");
    expect(effects).not.toHaveProperty("parentRuntime");
    expect(effects).not.toHaveProperty("parentSessionId");
    expect(effects).not.toHaveProperty("childAttemptId");
    expect(effects).not.toHaveProperty("branch");
    expect(effects).not.toHaveProperty("childBranch");
    expect(effects).not.toHaveProperty("worktreePath");
    expect(effects).not.toHaveProperty("childWorktreePath");
    expect(effects).not.toHaveProperty("childRuntime");
    expect(effects).not.toHaveProperty("runtimeMode");
    expect(effects).not.toHaveProperty("prompt");
    expect(effects).not.toHaveProperty("task");
    expect(effects).not.toHaveProperty("taskId");
    expect(
      (effects as { requestedEvent: Record<string, unknown> }).requestedEvent
    ).not.toHaveProperty("guardrails");
    expect(
      (effects as { requestedEvent: Record<string, unknown> }).requestedEvent
    ).not.toHaveProperty("childAttemptId");
    expect(
      (effects as { recordedEvent: Record<string, unknown> }).recordedEvent
    ).not.toHaveProperty("guardrails");
    expect(
      (effects as { recordedEvent: Record<string, unknown> }).recordedEvent
    ).not.toHaveProperty("childAttemptId");
    expect(request).toEqual(requestSnapshot);
  });

  it("should surface invalid childAttemptId and sourceKind failures without wrapping", () => {
    expect(() =>
      deriveExecutionSessionSpawnEffects({
        childAttemptId: "  ",
        request: createSpawnRequest({
          sourceKind: "fork"
        })
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnEffects({
        childAttemptId: "att_parent",
        request: createSpawnRequest({
          sourceKind: "fork"
        })
      })
    ).toThrow(/childAttemptId/i);
    expect(() =>
      deriveExecutionSessionSpawnEffects({
        childAttemptId: "att_child_invalid_source",
        request: createSpawnRequest({
          sourceKind: "resume"
        }) as never
      })
    ).toThrow(/sourceKind/i);
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
