import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionWaitRequest,
  type ExecutionSessionWaitTarget
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state wait-request helpers", () => {
  it("should derive a minimal wait request from a valid wait target", () => {
    expect(
      deriveExecutionSessionWaitRequest({
        target: createWaitTarget()
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
  });

  it("should preserve an explicit timeoutMs on the derived request", () => {
    expect(
      deriveExecutionSessionWaitRequest({
        target: createWaitTarget(),
        timeoutMs: 5_000
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active",
      timeoutMs: 5_000
    });
  });

  it("should omit timeoutMs when it is not provided", () => {
    const request = deriveExecutionSessionWaitRequest({
      target: createWaitTarget()
    });

    expect(request).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
    expect(request).not.toHaveProperty("timeoutMs");
  });

  it("should reject timeoutMs values that are not positive finite integers", () => {
    for (const timeoutMs of [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY
    ]) {
      expect(() =>
        deriveExecutionSessionWaitRequest({
          target: createWaitTarget(),
          timeoutMs
        })
      ).toThrow(ValidationError);
      expect(() =>
        deriveExecutionSessionWaitRequest({
          target: createWaitTarget(),
          timeoutMs
        })
      ).toThrow(/timeoutMs/i);
    }
  });

  it("should reject blank identifiers on the provided wait target", () => {
    expect(() =>
      deriveExecutionSessionWaitRequest({
        target: createWaitTarget({
          attemptId: "   "
        })
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitRequest({
        target: createWaitTarget({
          runtime: "   "
        })
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitRequest({
        target: createWaitTarget({
          sessionId: "   "
        })
      })
    ).toThrow(ValidationError);
  });

  it("should reject non-string identifiers on the provided wait target with canonical validation errors", () => {
    expect(() =>
      deriveExecutionSessionWaitRequest({
        target: createWaitTarget({
          attemptId: 123 as never
        })
      })
    ).toThrow(
      "Execution session wait request attemptId must be a non-empty string."
    );
    expect(() =>
      deriveExecutionSessionWaitRequest({
        target: createWaitTarget({
          runtime: null as never
        })
      })
    ).toThrow(
      "Execution session wait request runtime must be a non-empty string."
    );
    expect(() =>
      deriveExecutionSessionWaitRequest({
        target: createWaitTarget({
          sessionId: {} as never
        })
      })
    ).toThrow(
      "Execution session wait request sessionId must be a non-empty string."
    );
  });

  it("should reject non-object wait targets before reading any fields", () => {
    expect(() =>
      deriveExecutionSessionWaitRequest({
        target: undefined as never
      })
    ).toThrow("Execution session wait request target must be an object.");
    expect(() =>
      deriveExecutionSessionWaitRequest({
        target: null as never
      })
    ).toThrow("Execution session wait request target must be an object.");
  });

  it("should reject wait targets that come only from the prototype chain", () => {
    const input = Object.create({
      target: createWaitTarget()
    });

    expect(() =>
      deriveExecutionSessionWaitRequest(input as never)
    ).toThrow("Execution session wait request target must be an object.");
  });

  it("should reject accessor-shaped wait targets whose getter throws", () => {
    const input = {};
    Object.defineProperty(input, "target", {
      enumerable: true,
      get() {
        throw new Error("boom");
      }
    });

    expect(() =>
      deriveExecutionSessionWaitRequest(input as never)
    ).toThrow("Execution session wait request target must be an object.");
  });

  it("should fail closed on prototype-backed or accessor-backed target identifiers", () => {
    const prototypeBackedTarget = Object.assign(
      Object.create({
        attemptId: "att_proto_wait_request"
      }),
      {
        runtime: "codex-cli",
        sessionId: "thr_proto_wait_request"
      }
    );

    expect(() =>
      deriveExecutionSessionWaitRequest({
        target: prototypeBackedTarget as never
      })
    ).toThrow(
      "Execution session wait request attemptId must be a non-empty string."
    );

    const accessorBackedTarget = {
      attemptId: "att_accessor_wait_request",
      runtime: "codex-cli"
    };
    Object.defineProperty(accessorBackedTarget, "sessionId", {
      enumerable: true,
      get() {
        throw new Error("sessionId getter boom");
      }
    });

    expect(() =>
      deriveExecutionSessionWaitRequest({
        target: accessorBackedTarget as never
      })
    ).toThrow(
      "Execution session wait request sessionId must be a non-empty string."
    );
  });

  it("should reject non-object wait request inputs before reading target", () => {
    expect(() =>
      deriveExecutionSessionWaitRequest(undefined as never)
    ).toThrow("Execution session wait request input must be an object.");
    expect(() =>
      deriveExecutionSessionWaitRequest(null as never)
    ).toThrow("Execution session wait request input must be an object.");
    expect(() =>
      deriveExecutionSessionWaitRequest([] as never)
    ).toThrow("Execution session wait request input must be an object.");
  });

  it("should derive the request without mutating the supplied wait target", () => {
    const target = createWaitTarget();
    const targetSnapshot = JSON.parse(JSON.stringify(target));

    expect(
      deriveExecutionSessionWaitRequest({
        target,
        timeoutMs: 250
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active",
      timeoutMs: 250
    });
    expect(target).toEqual(targetSnapshot);
  });

  it("should keep selector, readiness, lifecycle, and policy data out of the derived request", () => {
    const request = deriveExecutionSessionWaitRequest({
      target: createWaitTarget(),
      timeoutMs: 1_000
    }) as ExecutionSessionWaitTarget & Record<string, unknown>;

    expect(request).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active",
      timeoutMs: 1_000
    });
    expect(request).not.toHaveProperty("selector");
    expect(request).not.toHaveProperty("view");
    expect(request).not.toHaveProperty("readiness");
    expect(request).not.toHaveProperty("waitCandidate");
    expect(request).not.toHaveProperty("waitTarget");
    expect(request).not.toHaveProperty("guardrails");
    expect(request).not.toHaveProperty("closeTarget");
    expect(request).not.toHaveProperty("closePolicy");
    expect(request).not.toHaveProperty("childPolicy");
    expect(request).not.toHaveProperty("lifecycleState");
  });
});

function createWaitTarget(
  overrides: Partial<ExecutionSessionWaitTarget> = {}
): ExecutionSessionWaitTarget {
  return {
    attemptId: "att_active",
    runtime: "codex-cli",
    sessionId: "thr_active",
    ...overrides
  };
}
