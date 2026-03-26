import { describe, expect, it } from "vitest";

import {
  deriveExecutionSessionCloseRequestedEvent,
  type ExecutionSessionCloseRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state close-requested-event helpers", () => {
  it("should derive a minimal close_requested event from a valid close request", () => {
    expect(
      deriveExecutionSessionCloseRequestedEvent({
        request: createCloseRequest()
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active",
      lifecycleEventKind: "close_requested"
    });
  });

  it("should derive the event without mutating the supplied close request", () => {
    const request = createCloseRequest();
    const requestSnapshot = JSON.parse(JSON.stringify(request));

    expect(
      deriveExecutionSessionCloseRequestedEvent({
        request
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active",
      lifecycleEventKind: "close_requested"
    });
    expect(request).toEqual(requestSnapshot);
  });

  it("should keep request, selector, state, and policy data out of the derived event", () => {
    const event = deriveExecutionSessionCloseRequestedEvent({
      request: createCloseRequest()
    }) as unknown as Record<string, unknown>;

    expect(event).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active",
      lifecycleEventKind: "close_requested"
    });
    expect(event).not.toHaveProperty("request");
    expect(event).not.toHaveProperty("selector");
    expect(event).not.toHaveProperty("view");
    expect(event).not.toHaveProperty("context");
    expect(event).not.toHaveProperty("readiness");
    expect(event).not.toHaveProperty("closeRequest");
    expect(event).not.toHaveProperty("closeTarget");
    expect(event).not.toHaveProperty("closeReadiness");
    expect(event).not.toHaveProperty("waitConsumer");
    expect(event).not.toHaveProperty("spawnRequest");
    expect(event).not.toHaveProperty("manifest");
    expect(event).not.toHaveProperty("force");
    expect(event).not.toHaveProperty("cascade");
    expect(event).not.toHaveProperty("childPolicy");
    expect(event).not.toHaveProperty("closedAt");
    expect(event).not.toHaveProperty("outcome");
  });
});

function createCloseRequest(
  overrides: Partial<ExecutionSessionCloseRequest> = {}
): ExecutionSessionCloseRequest {
  return {
    attemptId: "att_active",
    runtime: "codex-cli",
    sessionId: "thr_active",
    ...overrides
  };
}
