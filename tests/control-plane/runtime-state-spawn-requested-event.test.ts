import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionSpawnRecordedEvent,
  deriveExecutionSessionSpawnRequestedEvent,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/internal.js";

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

  it("should canonicalize the request before projecting the event", () => {
    expect(
      deriveExecutionSessionSpawnRequestedEvent({
        request: createSpawnRequest({
          parentAttemptId: "  att_parent_trimmed  ",
          parentRuntime: "  codex-cli  ",
          parentSessionId: "  thr_parent_trimmed  "
        })
      })
    ).toEqual({
      attemptId: "att_parent_trimmed",
      runtime: "codex-cli",
      sessionId: "thr_parent_trimmed",
      lifecycleEventKind: "spawn_requested"
    });
  });

  it("should preserve canonicalized identifiers through the spawn request lifecycle chain", () => {
    const request = createSpawnRequest({
      parentAttemptId: "  att_chain_trimmed  ",
      parentRuntime: "  codex-cli  ",
      parentSessionId: "  thr_chain_trimmed  "
    });
    const requestSnapshot = JSON.parse(JSON.stringify(request));
    const requestedEvent = deriveExecutionSessionSpawnRequestedEvent({
      request
    });
    const recordedEvent = deriveExecutionSessionSpawnRecordedEvent({
      requestedEvent
    });

    expect(requestedEvent).toEqual({
      attemptId: "att_chain_trimmed",
      runtime: "codex-cli",
      sessionId: "thr_chain_trimmed",
      lifecycleEventKind: "spawn_requested"
    });
    expect(recordedEvent).toEqual({
      attemptId: "att_chain_trimmed",
      runtime: "codex-cli",
      sessionId: "thr_chain_trimmed",
      lifecycleEventKind: "spawn_recorded"
    });
    expect(request).toEqual(requestSnapshot);
  });

  it("should reject non-object spawn requested-event inputs before reading request", () => {
    expect(() =>
      deriveExecutionSessionSpawnRequestedEvent(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnRequestedEvent(undefined as never)
    ).toThrow(
      "Execution session spawn requested event input must be an object."
    );
  });

  it("should reject missing or non-object requests before canonicalization", () => {
    expect(() =>
      deriveExecutionSessionSpawnRequestedEvent({
        request: undefined as never
      })
    ).toThrow(
      "Execution session spawn requested event requires request to be an object."
    );
    expect(() =>
      deriveExecutionSessionSpawnRequestedEvent({
        request: [] as never
      })
    ).toThrow(
      "Execution session spawn requested event requires request to be an object."
    );
  });

  it("should fail loudly when the request is malformed", () => {
    expect(() =>
      deriveExecutionSessionSpawnRequestedEvent({
        request: {
          ...createSpawnRequest(),
          parentSessionId: "   "
        } as ExecutionSessionSpawnRequest
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnRequestedEvent({
        request: {
          ...createSpawnRequest(),
          parentSessionId: "   "
        } as ExecutionSessionSpawnRequest
      })
    ).toThrow(/parentSessionId/i);
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
