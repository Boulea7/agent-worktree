import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionWaitConsumer,
  type ExecutionSessionWaitRequest
} from "../../src/control-plane/internal.js";

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
    }) as unknown as Record<string, unknown>;

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
    expect(consumer).not.toHaveProperty("invoked");
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

  it("should reject non-object wait consumer inputs before reading request", () => {
    expect(() =>
      deriveExecutionSessionWaitConsumer(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitConsumer(undefined as never)
    ).toThrow("Execution session wait consumer input must be an object.");
    expect(() =>
      deriveExecutionSessionWaitConsumer(null as never)
    ).toThrow("Execution session wait consumer input must be an object.");
    expect(() =>
      deriveExecutionSessionWaitConsumer([] as never)
    ).toThrow("Execution session wait consumer input must be an object.");
  });

  it("should reject missing or non-object wait consumer requests before deriving readiness", () => {
    expect(() =>
      deriveExecutionSessionWaitConsumer({
        request: undefined as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitConsumer({
        request: undefined as never
      })
    ).toThrow(
      "Execution session wait consumer requires request to be an object."
    );

    expect(() =>
      deriveExecutionSessionWaitConsumer({
        request: [] as never
      })
    ).toThrow(
      "Execution session wait consumer requires request to be an object."
    );
  });

  it("should continue surfacing downstream request validation failures", () => {
    expect(() =>
      deriveExecutionSessionWaitConsumer({
        request: createWaitRequest({
          sessionId: "   "
        })
      })
    ).toThrow(
      "Execution session wait request sessionId must be a non-empty string."
    );
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
