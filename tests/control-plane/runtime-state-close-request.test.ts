import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionCloseRequest,
  type ExecutionSessionCloseTarget
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state close-request helpers", () => {
  it("should derive a minimal close request from a valid close target", () => {
    expect(
      deriveExecutionSessionCloseRequest({
        target: createCloseTarget()
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
  });

  it("should reject blank identifiers on the provided close target", () => {
    expect(() =>
      deriveExecutionSessionCloseRequest({
        target: createCloseTarget({
          attemptId: "   "
        })
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseRequest({
        target: createCloseTarget({
          runtime: "   "
        })
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseRequest({
        target: createCloseTarget({
          sessionId: "   "
        })
      })
    ).toThrow(ValidationError);
  });

  it("should reject non-string identifiers on the provided close target with canonical validation errors", () => {
    expect(() =>
      deriveExecutionSessionCloseRequest({
        target: createCloseTarget({
          attemptId: 123 as never
        })
      })
    ).toThrow(
      "Execution session close request attemptId must be a non-empty string."
    );
    expect(() =>
      deriveExecutionSessionCloseRequest({
        target: createCloseTarget({
          runtime: null as never
        })
      })
    ).toThrow(
      "Execution session close request runtime must be a non-empty string."
    );
    expect(() =>
      deriveExecutionSessionCloseRequest({
        target: createCloseTarget({
          sessionId: {} as never
        })
      })
    ).toThrow(
      "Execution session close request sessionId must be a non-empty string."
    );
  });

  it("should reject non-object close targets before reading any fields", () => {
    expect(() =>
      deriveExecutionSessionCloseRequest({
        target: undefined as never
      })
    ).toThrow("Execution session close request target must be an object.");
    expect(() =>
      deriveExecutionSessionCloseRequest({
        target: null as never
      })
    ).toThrow("Execution session close request target must be an object.");
  });

  it("should reject close targets that come only from the prototype chain", () => {
    const input = Object.create({
      target: createCloseTarget()
    });

    expect(() =>
      deriveExecutionSessionCloseRequest(input as never)
    ).toThrow("Execution session close request target must be an object.");
  });

  it("should reject accessor-shaped close targets whose getter throws", () => {
    const input = {};
    Object.defineProperty(input, "target", {
      enumerable: true,
      get() {
        throw new Error("boom");
      }
    });

    expect(() =>
      deriveExecutionSessionCloseRequest(input as never)
    ).toThrow("Execution session close request target must be an object.");
  });

  it("should reject non-object close request inputs before reading target", () => {
    expect(() =>
      deriveExecutionSessionCloseRequest(undefined as never)
    ).toThrow("Execution session close request input must be an object.");
    expect(() =>
      deriveExecutionSessionCloseRequest(null as never)
    ).toThrow("Execution session close request input must be an object.");
    expect(() =>
      deriveExecutionSessionCloseRequest([] as never)
    ).toThrow("Execution session close request input must be an object.");
  });

  it("should derive the request without mutating the supplied close target", () => {
    const target = createCloseTarget();
    const targetSnapshot = JSON.parse(JSON.stringify(target));

    expect(
      deriveExecutionSessionCloseRequest({
        target
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
    expect(target).toEqual(targetSnapshot);
  });

  it("should keep selector, readiness, lifecycle, and policy data out of the derived request", () => {
    const request = deriveExecutionSessionCloseRequest({
      target: createCloseTarget()
    }) as ExecutionSessionCloseTarget & Record<string, unknown>;

    expect(request).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
    expect(request).not.toHaveProperty("selector");
    expect(request).not.toHaveProperty("view");
    expect(request).not.toHaveProperty("context");
    expect(request).not.toHaveProperty("readiness");
    expect(request).not.toHaveProperty("closeCandidate");
    expect(request).not.toHaveProperty("closeReadiness");
    expect(request).not.toHaveProperty("closeTarget");
    expect(request).not.toHaveProperty("waitRequest");
    expect(request).not.toHaveProperty("waitConsumer");
    expect(request).not.toHaveProperty("spawnRequest");
    expect(request).not.toHaveProperty("spawnTarget");
    expect(request).not.toHaveProperty("guardrails");
    expect(request).not.toHaveProperty("profile");
    expect(request).not.toHaveProperty("force");
    expect(request).not.toHaveProperty("cascade");
    expect(request).not.toHaveProperty("childPolicy");
    expect(request).not.toHaveProperty("settlePolicy");
    expect(request).not.toHaveProperty("manifest");
    expect(request).not.toHaveProperty("lifecycleState");
  });
});

function createCloseTarget(
  overrides: Partial<ExecutionSessionCloseTarget> = {}
): ExecutionSessionCloseTarget {
  return {
    attemptId: "att_active",
    runtime: "codex-cli",
    sessionId: "thr_active",
    ...overrides
  };
}
