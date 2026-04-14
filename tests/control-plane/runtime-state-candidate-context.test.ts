import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionCandidateContext
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/internal.js";

describe("control-plane runtime-state candidate-context helpers", () => {
  it("should derive a shared execution-session context from selector and view", () => {
    const record = createRecord({
      attemptId: "att_parent",
      sessionId: "thr_parent"
    });

    expect(
      deriveExecutionSessionCandidateContext(
        {
          selector: {
            attemptId: "att_parent"
          },
          view: buildExecutionSessionView([record])
        },
        {
          input: "Execution session wait candidate input must be an object.",
          selector: "Execution session wait candidate requires selector to be an object.",
          view: "Execution session wait candidate requires view to be an object."
        }
      )
    ).toEqual({
      record,
      selectedBy: "attemptId",
      childRecords: [],
      hasKnownSession: true,
      hasParent: false,
      hasResolvedParent: false,
      hasChildren: false
    });
  });

  it("should fail loudly when selector or view is malformed", () => {
    expect(() =>
      deriveExecutionSessionCandidateContext(
        null as never,
        {
          input: "Execution session wait candidate input must be an object.",
          selector: "Execution session wait candidate requires selector to be an object.",
          view: "Execution session wait candidate requires view to be an object."
        }
      )
    ).toThrow("Execution session wait candidate input must be an object.");

    expect(() =>
      deriveExecutionSessionCandidateContext(
        {
          selector: {
            attemptId: "att_parent"
          },
          view: {}
        } as never,
        {
          input: "Execution session wait candidate input must be an object.",
          selector: "Execution session wait candidate requires selector to be an object.",
          view: "Execution session wait candidate requires view to be an object."
        }
      )
    ).toThrow("Execution session wait candidate requires view to be an object.");
  });
});

function createRecord(
  overrides: Partial<ExecutionSessionRecord> & Pick<ExecutionSessionRecord, "attemptId">
): ExecutionSessionRecord {
  return {
    runtime: "codex-cli",
    sourceKind: "direct",
    lifecycleState: "active",
    runCompleted: false,
    errorEventCount: 0,
    origin: "headless_result",
    ...overrides
  };
}
