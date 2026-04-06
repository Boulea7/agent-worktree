import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionSpawnRecordedEvent,
  type ExecutionSessionSpawnRequestedEvent
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-recorded-event helpers", () => {
  it("should derive a minimal spawn_recorded event from a valid spawn_requested event", () => {
    expect(
      deriveExecutionSessionSpawnRecordedEvent({
        requestedEvent: createSpawnRequestedEvent()
      })
    ).toEqual({
      attemptId: "att_parent",
      runtime: "codex-cli",
      sessionId: "thr_parent",
      lifecycleEventKind: "spawn_recorded"
    });
  });

  it("should derive the event without mutating the supplied spawn_requested event", () => {
    const requestedEvent = createSpawnRequestedEvent();
    const requestedEventSnapshot = JSON.parse(JSON.stringify(requestedEvent));

    expect(
      deriveExecutionSessionSpawnRecordedEvent({
        requestedEvent
      })
    ).toEqual({
      attemptId: "att_parent",
      runtime: "codex-cli",
      sessionId: "thr_parent",
      lifecycleEventKind: "spawn_recorded"
    });
    expect(requestedEvent).toEqual(requestedEventSnapshot);
  });

  it("should keep requested-event, lineage, guardrail, and child-planning data out of the derived spawn_recorded event", () => {
    const event = deriveExecutionSessionSpawnRecordedEvent({
      requestedEvent: createSpawnRequestedEvent()
    }) as unknown as Record<string, unknown>;

    expect(event).toEqual({
      attemptId: "att_parent",
      runtime: "codex-cli",
      sessionId: "thr_parent",
      lifecycleEventKind: "spawn_recorded"
    });
    expect(event).not.toHaveProperty("requestedEvent");
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
    expect(event).not.toHaveProperty("outcome");
    expect(event).not.toHaveProperty("error");
    expect(event).not.toHaveProperty("adapterResult");
  });

  it("should fail loudly when requestedEvent is not an object", () => {
    expect(() =>
      deriveExecutionSessionSpawnRecordedEvent({
        requestedEvent: null as unknown as ExecutionSessionSpawnRequestedEvent
      })
    ).toThrow(ValidationError);

    expect(() =>
      deriveExecutionSessionSpawnRecordedEvent({
        requestedEvent: null as unknown as ExecutionSessionSpawnRequestedEvent
      })
    ).toThrow(
      "Execution session spawn recorded event requires requestedEvent to be an object."
    );
  });

  it('should fail loudly when requestedEvent.lifecycleEventKind is not "spawn_requested"', () => {
    expect(() =>
      deriveExecutionSessionSpawnRecordedEvent({
        requestedEvent: createSpawnRequestedEvent({
          lifecycleEventKind:
            "close_requested" as unknown as ExecutionSessionSpawnRequestedEvent["lifecycleEventKind"]
        })
      })
    ).toThrow(ValidationError);

    expect(() =>
      deriveExecutionSessionSpawnRecordedEvent({
        requestedEvent: createSpawnRequestedEvent({
          lifecycleEventKind:
            "close_requested" as unknown as ExecutionSessionSpawnRequestedEvent["lifecycleEventKind"]
        })
      })
    ).toThrow(
      'Execution session spawn recorded event requires requestedEvent.lifecycleEventKind to be "spawn_requested".'
    );
  });
});

function createSpawnRequestedEvent(
  overrides: Partial<ExecutionSessionSpawnRequestedEvent> = {}
): ExecutionSessionSpawnRequestedEvent {
  return {
    attemptId: "att_parent",
    runtime: "codex-cli",
    sessionId: "thr_parent",
    lifecycleEventKind: "spawn_requested",
    ...overrides
  };
}
