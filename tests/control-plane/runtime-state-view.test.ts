import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  listChildExecutionSessions,
  resolveExecutionSessionRecord
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state view helpers", () => {
  it("should build a read-only execution session view with parent-child ordering", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct"
    });
    const childA = createRecord({
      attemptId: "att_child_a",
      sessionId: "thr_child_a",
      sourceKind: "fork",
      parentAttemptId: "att_root"
    });
    const childB = createRecord({
      attemptId: "att_child_b",
      sourceKind: "delegated",
      parentAttemptId: "att_root"
    });
    const orphanChild = createRecord({
      attemptId: "att_orphan",
      sourceKind: "delegated",
      parentAttemptId: "att_missing_parent"
    });

    const view = buildExecutionSessionView([
      rootRecord,
      childA,
      childB,
      orphanChild
    ]);

    expect(view.index.byAttemptId.get("att_root")).toBe(rootRecord);
    expect(view.index.bySessionId.get("thr_root")).toBe(rootRecord);
    expect(view.index.bySessionId.get("thr_child_a")).toBe(childA);
    expect(view.childAttemptIdsByParent.get("att_root")).toEqual([
      "att_child_a",
      "att_child_b"
    ]);
    expect(view.childAttemptIdsByParent.get("att_missing_parent")).toEqual([
      "att_orphan"
    ]);
  });

  it("should resolve a record by attemptId selector", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct"
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      sessionId: "thr_child",
      sourceKind: "fork",
      parentAttemptId: "att_root"
    });
    const view = buildExecutionSessionView([rootRecord, childRecord]);

    expect(
      resolveExecutionSessionRecord(view, {
        attemptId: "att_child"
      })
    ).toBe(childRecord);
  });

  it("should resolve a record by sessionId selector", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sessionId: "thr_root",
      sourceKind: "direct"
    });
    const view = buildExecutionSessionView([rootRecord]);

    expect(
      resolveExecutionSessionRecord(view, {
        sessionId: "thr_root"
      })
    ).toBe(rootRecord);
  });

  it("should resolve canonicalized selectors against records with spaced identity fields", () => {
    const rootRecord = createRecord({
      attemptId: "  att_root  ",
      sessionId: "  thr_root  ",
      sourceKind: "direct"
    });
    const childRecord = createRecord({
      attemptId: "  att_child  ",
      sessionId: "  thr_child  ",
      sourceKind: "fork",
      parentAttemptId: "  att_root  "
    });
    const view = buildExecutionSessionView([rootRecord, childRecord]);

    expect(
      resolveExecutionSessionRecord(view, {
        attemptId: "att_child"
      })
    ).toBe(childRecord);
    expect(
      resolveExecutionSessionRecord(view, {
        sessionId: "thr_root"
      })
    ).toBe(rootRecord);
    expect(listChildExecutionSessions(view, "att_root")).toEqual([childRecord]);
  });

  it("should return undefined when the selector does not match a record", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sourceKind: "direct"
    });
    const view = buildExecutionSessionView([rootRecord]);

    expect(
      resolveExecutionSessionRecord(view, {
        attemptId: "att_missing"
      })
    ).toBeUndefined();
    expect(
      resolveExecutionSessionRecord(view, {
        sessionId: "thr_missing"
      })
    ).toBeUndefined();
  });

  it("should reject selectors that are missing both lookup keys", () => {
    const view = buildExecutionSessionView([
      createRecord({
        attemptId: "att_root",
        sourceKind: "direct"
      })
    ]);

    expect(() =>
      resolveExecutionSessionRecord(view, {})
    ).toThrow(ValidationError);
  });

  it("should reject selectors that provide both attemptId and sessionId", () => {
    const view = buildExecutionSessionView([
      createRecord({
        attemptId: "att_root",
        sessionId: "thr_root",
        sourceKind: "direct"
      })
    ]);

    expect(() =>
      resolveExecutionSessionRecord(view, {
        attemptId: "att_root",
        sessionId: "thr_root"
      })
    ).toThrow(ValidationError);
  });

  it("should reject blank selector values", () => {
    const view = buildExecutionSessionView([
      createRecord({
        attemptId: "att_root",
        sessionId: "thr_root",
        sourceKind: "direct"
      })
    ]);

    expect(() =>
      resolveExecutionSessionRecord(view, {
        attemptId: "   "
      })
    ).toThrow(ValidationError);
    expect(() =>
      resolveExecutionSessionRecord(view, {
        sessionId: "   "
      })
    ).toThrow(ValidationError);
  });

  it("should list child execution sessions in input order", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sourceKind: "direct"
    });
    const childA = createRecord({
      attemptId: "att_child_a",
      sourceKind: "fork",
      parentAttemptId: "att_root"
    });
    const childB = createRecord({
      attemptId: "att_child_b",
      sourceKind: "delegated",
      parentAttemptId: "att_root"
    });
    const view = buildExecutionSessionView([rootRecord, childA, childB]);

    expect(listChildExecutionSessions(view, "att_root")).toEqual([
      childA,
      childB
    ]);
  });

  it("should return an empty child list for missing parents or parents without children", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sourceKind: "direct"
    });
    const view = buildExecutionSessionView([rootRecord]);

    expect(listChildExecutionSessions(view, "att_root")).toEqual([]);
    expect(listChildExecutionSessions(view, "att_missing")).toEqual([]);
  });

  it("should reject blank parent attempt identifiers when listing children", () => {
    const rootRecord = createRecord({
      attemptId: "att_root",
      sourceKind: "direct"
    });
    const view = buildExecutionSessionView([rootRecord]);

    expect(() => listChildExecutionSessions(view, "   ")).toThrow(
      ValidationError
    );
  });

  it("should reject blank parent attempt identifiers when building a view", () => {
    expect(() =>
      buildExecutionSessionView([
        createRecord({
          attemptId: "att_child",
          sourceKind: "fork",
          parentAttemptId: "   "
        })
      ])
    ).toThrow(ValidationError);
  });

  it("should reject blank record attempt identifiers when building a view", () => {
    expect(() =>
      buildExecutionSessionView([
        createRecord({
          attemptId: "   ",
          sessionId: "thr_blank",
          sourceKind: "direct"
        })
      ])
    ).toThrow(ValidationError);
  });

  it("should fail loudly when view helper inputs or containers are malformed", () => {
    const view = buildExecutionSessionView([
      createRecord({
        attemptId: "att_root",
        sessionId: "thr_root",
        sourceKind: "direct"
      })
    ]);

    expect(() => buildExecutionSessionView(undefined as never)).toThrow(
      ValidationError
    );
    expect(() => buildExecutionSessionView(undefined as never)).toThrow(
      "Execution session view records must be an array."
    );

    expect(() =>
      resolveExecutionSessionRecord(undefined as never, {
        attemptId: "att_root"
      })
    ).toThrow(ValidationError);
    expect(() =>
      resolveExecutionSessionRecord(undefined as never, {
        attemptId: "att_root"
      })
    ).toThrow("Execution session view requires view to be an object.");

    expect(() =>
      resolveExecutionSessionRecord(view, undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      resolveExecutionSessionRecord(view, undefined as never)
    ).toThrow("Execution session view requires selector to be an object.");

    expect(() =>
      listChildExecutionSessions(undefined as never, "att_root")
    ).toThrow(ValidationError);
    expect(() =>
      listChildExecutionSessions(undefined as never, "att_root")
    ).toThrow("Execution session view requires view to be an object.");

    expect(() =>
      listChildExecutionSessions(view, 123 as never)
    ).toThrow(ValidationError);
    expect(() =>
      listChildExecutionSessions(view, 123 as never)
    ).toThrow(
      "Execution session view parent attemptId must be a non-empty string."
    );
  });
});

function createRecord(
  overrides: Partial<ExecutionSessionRecord> & Pick<ExecutionSessionRecord, "attemptId" | "sourceKind">
): ExecutionSessionRecord {
  const { attemptId, sourceKind, ...rest } = overrides;

  return {
    attemptId,
    runtime: "codex-cli",
    sourceKind,
    lifecycleState: "created",
    runCompleted: false,
    errorEventCount: 0,
    origin: "headless_result",
    ...rest
  };
}
