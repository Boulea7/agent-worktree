import { describe, expect, it } from "vitest";

import {
  deriveExecutionSessionCloseConsumerReadiness,
  type ExecutionSessionCloseRequest
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state close-consumer-readiness helpers", () => {
  it("should allow a future close consumer when session lifecycle support is available", () => {
    expect(
      deriveExecutionSessionCloseConsumerReadiness({
        request: createCloseRequest(),
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      blockingReasons: [],
      canConsumeClose: true,
      hasBlockingReasons: false,
      sessionLifecycleSupported: true
    });
  });

  it("should block future close consumption for codex-cli by default", () => {
    expect(
      deriveExecutionSessionCloseConsumerReadiness({
        request: createCloseRequest()
      })
    ).toEqual({
      blockingReasons: ["session_lifecycle_unsupported"],
      canConsumeClose: false,
      hasBlockingReasons: true,
      sessionLifecycleSupported: false
    });
  });

  it("should block future close consumption for unknown runtimes", () => {
    expect(
      deriveExecutionSessionCloseConsumerReadiness({
        request: createCloseRequest({
          runtime: "future-runtime"
        })
      })
    ).toEqual({
      blockingReasons: ["session_lifecycle_unsupported"],
      canConsumeClose: false,
      hasBlockingReasons: true,
      sessionLifecycleSupported: false
    });
  });

  it("should preserve the stable blocking-reason vocabulary", () => {
    expect(
      deriveExecutionSessionCloseConsumerReadiness({
        request: createCloseRequest()
      }).blockingReasons
    ).toEqual(["session_lifecycle_unsupported"]);
  });

  it("should not mutate the supplied close request", () => {
    const request = createCloseRequest();
    const requestSnapshot = JSON.parse(JSON.stringify(request));

    expect(
      deriveExecutionSessionCloseConsumerReadiness({
        request,
        resolveSessionLifecycleCapability: () => true
      })
    ).toEqual({
      blockingReasons: [],
      canConsumeClose: true,
      hasBlockingReasons: false,
      sessionLifecycleSupported: true
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
