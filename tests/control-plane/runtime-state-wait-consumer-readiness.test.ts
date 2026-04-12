import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
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

  it("should fail loudly when the capability resolver does not return a boolean", () => {
    expect(() =>
      deriveExecutionSessionWaitConsumerReadiness({
        request: createWaitRequest(),
        resolveSessionLifecycleCapability: () => "true" as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitConsumerReadiness({
        request: createWaitRequest(),
        resolveSessionLifecycleCapability: () => "true" as never
      })
    ).toThrow(
      "Execution session wait consumer readiness requires resolveSessionLifecycleCapability to return a boolean."
    );
  });

  it("should fail loudly when the capability resolver is not a function", () => {
    expect(() =>
      deriveExecutionSessionWaitConsumerReadiness({
        request: createWaitRequest(),
        resolveSessionLifecycleCapability: "yes" as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitConsumerReadiness({
        request: createWaitRequest(),
        resolveSessionLifecycleCapability: "yes" as never
      })
    ).toThrow(
      "Execution session wait consumer readiness requires resolveSessionLifecycleCapability to be a function when provided."
    );
  });

  it("should fail loudly when the top-level wait-consumer-readiness input or request is malformed", () => {
    expect(() =>
      deriveExecutionSessionWaitConsumerReadiness(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitConsumerReadiness(undefined as never)
    ).toThrow(
      "Execution session wait consumer readiness input must be an object."
    );

    expect(() =>
      deriveExecutionSessionWaitConsumerReadiness({
        request: null as never
      })
    ).toThrow(
      "Execution session wait consumer readiness requires request to be an object."
    );
  });

  it("should fail loudly when request identifiers or timeout are invalid at the readiness seam", () => {
    expect(() =>
      deriveExecutionSessionWaitConsumerReadiness({
        request: {
          ...createWaitRequest(),
          attemptId: "   "
        } as never
      })
    ).toThrow(
      "Execution session wait request attemptId must be a non-empty string."
    );

    expect(() =>
      deriveExecutionSessionWaitConsumerReadiness({
        request: {
          ...createWaitRequest(),
          runtime: "   "
        } as never
      })
    ).toThrow(
      "Execution session wait request runtime must be a non-empty string."
    );

    expect(() =>
      deriveExecutionSessionWaitConsumerReadiness({
        request: {
          ...createWaitRequest(),
          sessionId: "   "
        } as never
      })
    ).toThrow(
      "Execution session wait request sessionId must be a non-empty string."
    );

    expect(() =>
      deriveExecutionSessionWaitConsumerReadiness({
        request: {
          ...createWaitRequest(),
          timeoutMs: 0
        } as never
      })
    ).toThrow(
      "Execution session wait request timeoutMs must be a finite integer greater than 0."
    );
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
