import { describe, expect, it } from "vitest";

import {
  deriveExecutionSessionCloseRecordedEvent,
  type ExecutionSessionCloseRequestedEvent
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state close-recorded-event helpers", () => {
  it("should derive a minimal close_recorded event from a valid close_requested event", () => {
    expect(
      deriveExecutionSessionCloseRecordedEvent({
        requestedEvent: createCloseRequestedEvent()
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active",
      lifecycleEventKind: "close_recorded"
    });
  });

  it("should derive the event without mutating the supplied close_requested event", () => {
    const requestedEvent = createCloseRequestedEvent();
    const requestedEventSnapshot = JSON.parse(JSON.stringify(requestedEvent));

    expect(
      deriveExecutionSessionCloseRecordedEvent({
        requestedEvent
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active",
      lifecycleEventKind: "close_recorded"
    });
    expect(requestedEvent).toEqual(requestedEventSnapshot);
  });

  it("should keep requested-event, selector, readiness, policy, manifest, and outcome data out of the derived close_recorded event", () => {
    const event = deriveExecutionSessionCloseRecordedEvent({
      requestedEvent: createCloseRequestedEvent()
    }) as unknown as Record<string, unknown>;

    expect(event).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active",
      lifecycleEventKind: "close_recorded"
    });
    expect(event).not.toHaveProperty("requestedEvent");
    expect(event).not.toHaveProperty("request");
    expect(event).not.toHaveProperty("selector");
    expect(event).not.toHaveProperty("view");
    expect(event).not.toHaveProperty("context");
    expect(event).not.toHaveProperty("readiness");
    expect(event).not.toHaveProperty("closeRequest");
    expect(event).not.toHaveProperty("closeRequestedEvent");
    expect(event).not.toHaveProperty("closeRecordedEvent");
    expect(event).not.toHaveProperty("closeTarget");
    expect(event).not.toHaveProperty("closeReadiness");
    expect(event).not.toHaveProperty("waitRequest");
    expect(event).not.toHaveProperty("waitConsumer");
    expect(event).not.toHaveProperty("spawnRequest");
    expect(event).not.toHaveProperty("manifest");
    expect(event).not.toHaveProperty("force");
    expect(event).not.toHaveProperty("cascade");
    expect(event).not.toHaveProperty("settlePolicy");
    expect(event).not.toHaveProperty("childPolicy");
    expect(event).not.toHaveProperty("closedAt");
    expect(event).not.toHaveProperty("outcome");
    expect(event).not.toHaveProperty("error");
    expect(event).not.toHaveProperty("adapterResult");
  });
});

function createCloseRequestedEvent(
  overrides: Partial<ExecutionSessionCloseRequestedEvent> = {}
): ExecutionSessionCloseRequestedEvent {
  return {
    attemptId: "att_active",
    runtime: "codex-cli",
    sessionId: "thr_active",
    lifecycleEventKind: "close_requested",
    ...overrides
  };
}
