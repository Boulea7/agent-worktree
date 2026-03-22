import { describe, expect, it } from "vitest";

import {
  deriveExecutionSessionCloseConsumer,
  type ExecutionSessionCloseRequest
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state close-consumer helpers", () => {
  it("should compose a close consumer from a supported close request", () => {
    expect(
      deriveExecutionSessionCloseConsumer({
        request: createCloseRequest(),
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      readiness: {
        blockingReasons: [],
        canConsumeClose: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
  });

  it("should keep a blocked close request visible to future internal consumers", () => {
    expect(
      deriveExecutionSessionCloseConsumer({
        request: createCloseRequest()
      })
    ).toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      readiness: {
        blockingReasons: ["session_lifecycle_unsupported"],
        canConsumeClose: false,
        hasBlockingReasons: true,
        sessionLifecycleSupported: false
      }
    });
  });

  it("should preserve the minimal request shape without adding close lifecycle side effects", () => {
    const consumer = deriveExecutionSessionCloseConsumer({
      request: createCloseRequest()
    }) as unknown as Record<string, unknown>;

    expect(consumer).toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      readiness: {
        blockingReasons: ["session_lifecycle_unsupported"],
        canConsumeClose: false,
        hasBlockingReasons: true,
        sessionLifecycleSupported: false
      }
    });
    expect(consumer).not.toHaveProperty("selector");
    expect(consumer).not.toHaveProperty("view");
    expect(consumer).not.toHaveProperty("context");
    expect(consumer).not.toHaveProperty("candidate");
    expect(consumer).not.toHaveProperty("target");
    expect(consumer).not.toHaveProperty("invoked");
    expect(consumer).not.toHaveProperty("closeRequestedEvent");
    expect(consumer).not.toHaveProperty("closeRecordedEvent");
    expect(consumer).not.toHaveProperty("force");
    expect(consumer).not.toHaveProperty("cascade");
    expect(consumer).not.toHaveProperty("settlePolicy");
    expect(consumer).not.toHaveProperty("childPolicy");
    expect(consumer).not.toHaveProperty("closedAt");
    expect(consumer).not.toHaveProperty("outcome");
    expect(consumer).not.toHaveProperty("error");
    expect(consumer).not.toHaveProperty("adapterResult");
    expect(consumer).not.toHaveProperty("invoked");
    expect(consumer).not.toHaveProperty("manifest");
  });

  it("should not mutate the supplied close request", () => {
    const request = createCloseRequest();
    const requestSnapshot = JSON.parse(JSON.stringify(request));

    expect(
      deriveExecutionSessionCloseConsumer({
        request,
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      readiness: {
        blockingReasons: [],
        canConsumeClose: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
    expect(request).toEqual(requestSnapshot);
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
