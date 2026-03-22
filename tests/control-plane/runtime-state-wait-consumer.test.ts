import { describe, expect, it } from "vitest";

import {
  deriveExecutionSessionWaitConsumer,
  type ExecutionSessionWaitRequest
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state wait-consumer helpers", () => {
  it("should compose a wait consumer from a supported wait request", () => {
    expect(
      deriveExecutionSessionWaitConsumer({
        request: createWaitRequest({
          timeoutMs: 5_000
        }),
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active",
        timeoutMs: 5_000
      },
      readiness: {
        blockingReasons: [],
        canConsumeWait: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
  });

  it("should keep a blocked wait request visible to future internal consumers", () => {
    expect(
      deriveExecutionSessionWaitConsumer({
        request: createWaitRequest()
      })
    ).toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active"
      },
      readiness: {
        blockingReasons: ["session_lifecycle_unsupported"],
        canConsumeWait: false,
        hasBlockingReasons: true,
        sessionLifecycleSupported: false
      }
    });
  });

  it("should preserve timeoutMs without adding scheduling metadata", () => {
    const consumer = deriveExecutionSessionWaitConsumer({
      request: createWaitRequest({
        timeoutMs: 250
      })
    }) as Record<string, unknown>;

    expect(consumer).toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active",
        timeoutMs: 250
      },
      readiness: {
        blockingReasons: ["session_lifecycle_unsupported"],
        canConsumeWait: false,
        hasBlockingReasons: true,
        sessionLifecycleSupported: false
      }
    });
    expect(consumer).not.toHaveProperty("selector");
    expect(consumer).not.toHaveProperty("view");
    expect(consumer).not.toHaveProperty("context");
    expect(consumer).not.toHaveProperty("candidate");
    expect(consumer).not.toHaveProperty("target");
    expect(consumer).not.toHaveProperty("pollIntervalMs");
    expect(consumer).not.toHaveProperty("deadlineMs");
    expect(consumer).not.toHaveProperty("lifecycleState");
    expect(consumer).not.toHaveProperty("manifest");
  });

  it("should not mutate the supplied wait request", () => {
    const request = createWaitRequest({
      timeoutMs: 100
    });
    const requestSnapshot = JSON.parse(JSON.stringify(request));

    expect(
      deriveExecutionSessionWaitConsumer({
        request,
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      request: {
        attemptId: "att_active",
        runtime: "codex-cli",
        sessionId: "thr_active",
        timeoutMs: 100
      },
      readiness: {
        blockingReasons: [],
        canConsumeWait: true,
        hasBlockingReasons: false,
        sessionLifecycleSupported: true
      }
    });
    expect(request).toEqual(requestSnapshot);
  });
});

function createWaitRequest(
  overrides: Partial<ExecutionSessionWaitRequest> = {}
): ExecutionSessionWaitRequest {
  return {
    attemptId: "att_active",
    runtime: "codex-cli",
    sessionId: "thr_active",
    ...overrides
  };
}
