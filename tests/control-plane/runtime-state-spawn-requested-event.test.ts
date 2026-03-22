import { describe, expect, it } from "vitest";

import {
  deriveExecutionSessionSpawnRequestedEvent,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state spawn-requested-event helpers", () => {
  it("should derive a minimal spawn_requested event from a valid spawn request", () => {
    expect(
      deriveExecutionSessionSpawnRequestedEvent({
        request: createSpawnRequest()
      })
    ).toEqual({
      attemptId: "att_parent",
      runtime: "codex-cli",
      sessionId: "thr_parent",
      lifecycleEventKind: "spawn_requested"
    });
  });

  it("should derive the event without mutating the supplied spawn request", () => {
    const request = createSpawnRequest();
    const requestSnapshot = JSON.parse(JSON.stringify(request));

    expect(
      deriveExecutionSessionSpawnRequestedEvent({
        request
      })
    ).toEqual({
      attemptId: "att_parent",
      runtime: "codex-cli",
      sessionId: "thr_parent",
      lifecycleEventKind: "spawn_requested"
    });
    expect(request).toEqual(requestSnapshot);
  });

  it("should keep request, lineage, guardrail, and child-planning data out of the derived spawn_requested event", () => {
    const event = deriveExecutionSessionSpawnRequestedEvent({
      request: createSpawnRequest()
    }) as unknown as Record<string, unknown>;

    expect(event).toEqual({
      attemptId: "att_parent",
      runtime: "codex-cli",
      sessionId: "thr_parent",
      lifecycleEventKind: "spawn_requested"
    });
    expect(event).not.toHaveProperty("request");
    expect(event).not.toHaveProperty("selector");
    expect(event).not.toHaveProperty("view");
    expect(event).not.toHaveProperty("context");
    expect(event).not.toHaveProperty("readiness");
    expect(event).not.toHaveProperty("spawnCandidate");
    expect(event).not.toHaveProperty("spawnRequest");
    expect(event).not.toHaveProperty("spawnTarget");
    expect(event).not.toHaveProperty("spawnReadiness");
    expect(event).not.toHaveProperty("spawnLineage");
    expect(event).not.toHaveProperty("spawnRequestedEvent");
    expect(event).not.toHaveProperty("spawnRecordedEvent");
    expect(event).not.toHaveProperty("closeRequest");
    expect(event).not.toHaveProperty("waitRequest");
    expect(event).not.toHaveProperty("manifest");
    expect(event).not.toHaveProperty("sourceKind");
    expect(event).not.toHaveProperty("inheritedGuardrails");
    expect(event).not.toHaveProperty("parentAttemptId");
    expect(event).not.toHaveProperty("parentRuntime");
    expect(event).not.toHaveProperty("parentSessionId");
    expect(event).not.toHaveProperty("childAttemptId");
    expect(event).not.toHaveProperty("branch");
    expect(event).not.toHaveProperty("worktreePath");
    expect(event).not.toHaveProperty("runtimeMode");
    expect(event).not.toHaveProperty("prompt");
    expect(event).not.toHaveProperty("task");
    expect(event).not.toHaveProperty("taskId");
  });
});

function createSpawnRequest(
  overrides: Partial<ExecutionSessionSpawnRequest> = {}
): ExecutionSessionSpawnRequest {
  return {
    parentAttemptId: "att_parent",
    parentRuntime: "codex-cli",
    parentSessionId: "thr_parent",
    sourceKind: "delegated",
    ...overrides
  };
}
