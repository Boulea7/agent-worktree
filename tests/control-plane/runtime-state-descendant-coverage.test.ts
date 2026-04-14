import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionDescendantCoverageSummary
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/internal.js";

describe("control-plane runtime-state descendant coverage helpers", () => {
  it("should default descendant coverage to incomplete while preserving descendant ids", () => {
    const parentRecord = createRecord({
      attemptId: "att_parent",
      sessionId: "thr_parent"
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      parentAttemptId: "att_parent",
      sessionId: "thr_child"
    });

    expect(
      deriveExecutionSessionDescendantCoverageSummary({
        record: parentRecord,
        view: buildExecutionSessionView([parentRecord, childRecord])
      })
    ).toEqual({
      coverage: "incomplete",
      isDefaulted: true,
      descendantCount: 1,
      descendantAttemptIds: ["att_child"],
      blockingReason: "descendant_coverage_incomplete"
    });
  });

  it("should preserve explicit descendant coverage and stable descendant ids", () => {
    const parentRecord = createRecord({
      attemptId: "att_parent",
      sessionId: "thr_parent"
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      parentAttemptId: "att_parent",
      sessionId: "thr_child"
    });

    expect(
      deriveExecutionSessionDescendantCoverageSummary({
        record: parentRecord,
        view: buildExecutionSessionView([parentRecord, childRecord]),
        descendantCoverage: "complete"
      })
    ).toEqual({
      coverage: "complete",
      isDefaulted: false,
      descendantCount: 1,
      descendantAttemptIds: ["att_child"],
      blockingReason: undefined
    });
  });

  it("should fail loudly when descendant coverage uses unknown vocabulary", () => {
    const parentRecord = createRecord({
      attemptId: "att_parent",
      sessionId: "thr_parent"
    });

    expect(() =>
      deriveExecutionSessionDescendantCoverageSummary({
        record: parentRecord,
        view: buildExecutionSessionView([parentRecord]),
        descendantCoverage: "partial" as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionDescendantCoverageSummary({
        record: parentRecord,
        view: buildExecutionSessionView([parentRecord]),
        descendantCoverage: "partial" as never
      })
    ).toThrow(
      'Execution session descendant coverage summary requires descendantCoverage to be "complete" or "incomplete" when provided.'
    );
  });
});

function createRecord(
  overrides: Partial<ExecutionSessionRecord> & Pick<ExecutionSessionRecord, "attemptId">
): ExecutionSessionRecord {
  return {
    runtime: "codex-cli",
    sourceKind: "delegated",
    lifecycleState: "active",
    runCompleted: false,
    errorEventCount: 0,
    origin: "headless_result",
    ...overrides
  };
}
