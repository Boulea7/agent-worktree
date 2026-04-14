import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionCloseConsumer,
  type ExecutionSessionCloseRequest
} from "../../src/control-plane/internal.js";

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

  it("should reject non-object close consumer inputs before reading request", () => {
    expect(() =>
      deriveExecutionSessionCloseConsumer(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseConsumer(undefined as never)
    ).toThrow("Execution session close consumer input must be an object.");
    expect(() =>
      deriveExecutionSessionCloseConsumer(null as never)
    ).toThrow("Execution session close consumer input must be an object.");
    expect(() =>
      deriveExecutionSessionCloseConsumer([] as never)
    ).toThrow("Execution session close consumer input must be an object.");
  });

  it("should reject missing or non-object close consumer requests before deriving readiness", () => {
    expect(() =>
      deriveExecutionSessionCloseConsumer({
        request: undefined as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseConsumer({
        request: undefined as never
      })
    ).toThrow(
      "Execution session close consumer requires request to be an object."
    );

    expect(() =>
      deriveExecutionSessionCloseConsumer({
        request: [] as never
      })
    ).toThrow(
      "Execution session close consumer requires request to be an object."
    );
  });

  it("should reject inherited request wrappers and read getter-backed requests once", () => {
    const inheritedInput = Object.create({
      request: createCloseRequest()
    });

    expect(() =>
      deriveExecutionSessionCloseConsumer(inheritedInput as never)
    ).toThrow(
      "Execution session close consumer requires request to be an object."
    );

    let requestReads = 0;

    expect(
      deriveExecutionSessionCloseConsumer({
        get request() {
          requestReads += 1;

          if (requestReads > 1) {
            throw new Error("request getter read twice");
          }

          return createCloseRequest();
        },
        resolveSessionLifecycleCapability: () => true
      } as never)
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
    expect(requestReads).toBe(1);
  });

  it("should continue surfacing downstream close request validation failures", () => {
    expect(() =>
      deriveExecutionSessionCloseConsumer({
        request: createCloseRequest({
          sessionId: "   "
        })
      })
    ).toThrow(
      "Execution session close request sessionId must be a non-empty string."
    );
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
