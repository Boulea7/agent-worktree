import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionCloseConsumerReadiness,
  type ExecutionSessionCloseRequest
} from "../../src/control-plane/internal.js";

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

  it("should fail loudly when the capability resolver does not return a boolean", () => {
    expect(() =>
      deriveExecutionSessionCloseConsumerReadiness({
        request: createCloseRequest(),
        resolveSessionLifecycleCapability: () => 1 as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseConsumerReadiness({
        request: createCloseRequest(),
        resolveSessionLifecycleCapability: () => 1 as never
      })
    ).toThrow(
      "Execution session close consumer readiness requires resolveSessionLifecycleCapability to return a boolean."
    );
  });

  it("should fail loudly when the capability resolver is not a function", () => {
    expect(() =>
      deriveExecutionSessionCloseConsumerReadiness({
        request: createCloseRequest(),
        resolveSessionLifecycleCapability: 1 as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseConsumerReadiness({
        request: createCloseRequest(),
        resolveSessionLifecycleCapability: 1 as never
      })
    ).toThrow(
      "Execution session close consumer readiness requires resolveSessionLifecycleCapability to be a function when provided."
    );
  });

  it("should fail loudly when the top-level close-consumer-readiness input or request is malformed", () => {
    expect(() =>
      deriveExecutionSessionCloseConsumerReadiness(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseConsumerReadiness(undefined as never)
    ).toThrow(
      "Execution session close consumer readiness input must be an object."
    );

    expect(() =>
      deriveExecutionSessionCloseConsumerReadiness({
        request: null as never
      })
    ).toThrow(
      "Execution session close consumer readiness requires request to be an object."
    );
  });

  it("should fail loudly when request identifiers are invalid at the readiness seam", () => {
    expect(() =>
      deriveExecutionSessionCloseConsumerReadiness({
        request: {
          ...createCloseRequest(),
          attemptId: "   "
        } as never
      })
    ).toThrow(
      "Execution session close request attemptId must be a non-empty string."
    );

    expect(() =>
      deriveExecutionSessionCloseConsumerReadiness({
        request: {
          ...createCloseRequest(),
          runtime: "   "
        } as never
      })
    ).toThrow(
      "Execution session close request runtime must be a non-empty string."
    );

    expect(() =>
      deriveExecutionSessionCloseConsumerReadiness({
        request: {
          ...createCloseRequest(),
          sessionId: "   "
        } as never
      })
    ).toThrow(
      "Execution session close request sessionId must be a non-empty string."
    );
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
