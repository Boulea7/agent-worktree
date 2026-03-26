import { describe, expect, it } from "vitest";

import {
  deriveExecutionSessionWaitConsumerReadiness,
  type ExecutionSessionWaitRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state wait-consumer-readiness helpers", () => {
  it("should allow a future wait consumer when session lifecycle support is available", () => {
    expect(
      deriveExecutionSessionWaitConsumerReadiness({
        request: createWaitRequest(),
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      blockingReasons: [],
      canConsumeWait: true,
      hasBlockingReasons: false,
      sessionLifecycleSupported: true
    });
  });

  it("should block future wait consumption for codex-cli by default", () => {
    expect(
      deriveExecutionSessionWaitConsumerReadiness({
        request: createWaitRequest()
      })
    ).toEqual({
      blockingReasons: ["session_lifecycle_unsupported"],
      canConsumeWait: false,
      hasBlockingReasons: true,
      sessionLifecycleSupported: false
    });
  });

  it("should block future wait consumption for unknown runtimes", () => {
    expect(
      deriveExecutionSessionWaitConsumerReadiness({
        request: createWaitRequest({
          runtime: "future-runtime"
        })
      })
    ).toEqual({
      blockingReasons: ["session_lifecycle_unsupported"],
      canConsumeWait: false,
      hasBlockingReasons: true,
      sessionLifecycleSupported: false
    });
  });

  it("should preserve the stable blocking-reason vocabulary", () => {
    expect(
      deriveExecutionSessionWaitConsumerReadiness({
        request: createWaitRequest()
      }).blockingReasons
    ).toEqual(["session_lifecycle_unsupported"]);
  });

  it("should not mutate the supplied wait request", () => {
    const request = createWaitRequest({
      timeoutMs: 5_000
    });
    const requestSnapshot = JSON.parse(JSON.stringify(request));

    expect(
      deriveExecutionSessionWaitConsumerReadiness({
        request,
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      blockingReasons: [],
      canConsumeWait: true,
      hasBlockingReasons: false,
      sessionLifecycleSupported: true
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
