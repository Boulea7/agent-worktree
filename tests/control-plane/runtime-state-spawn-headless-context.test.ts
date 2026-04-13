import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnHeadlessContext,
  type ExecutionSessionRecord,
  type ExecutionSessionSpawnHeadlessRecord,
  type ExecutionSessionSpawnHeadlessView
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-headless-context helpers", () => {
  it("should fail loudly when the supplied headless context input or nested objects are malformed", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessContext(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessContext(undefined as never)
    ).toThrow(
      "Execution session spawn headless context input must be an object."
    );

    expect(() =>
      deriveExecutionSessionSpawnHeadlessContext({} as never)
    ).toThrow(
      "Execution session spawn headless context requires headlessView to be an object."
    );

    expect(() =>
      deriveExecutionSessionSpawnHeadlessContext({
        headlessView: {
          headlessRecord: null,
          view: {}
        }
      } as never)
    ).toThrow(
      "Execution session spawn headless context requires headlessView.headlessRecord to be an object."
    );

    expect(() =>
      deriveExecutionSessionSpawnHeadlessContext({
        headlessView: {
          headlessRecord: {
            record: null
          },
          view: {}
        }
      } as never)
    ).toThrow(
      "Execution session spawn headless context requires headlessView.headlessRecord.record to be an object."
    );

    expect(() =>
      deriveExecutionSessionSpawnHeadlessContext({
        headlessView: {
          headlessRecord: {
            record: {}
          },
          view: null
        }
      } as never)
    ).toThrow(
      "Execution session spawn headless context requires headlessView.view to be an object."
    );
  });

  it("should fail closed on inherited or accessor-shaped headless view wrappers", () => {
    const inheritedInput = Object.create({
      headlessView: {
        headlessRecord: {
          record: createRecord({
            attemptId: "att_inherited_context",
            sessionId: "thr_inherited_context",
            sourceKind: "direct"
          })
        },
        view: buildExecutionSessionView([])
      }
    });

    expect(() =>
      deriveExecutionSessionSpawnHeadlessContext(inheritedInput as never)
    ).toThrow(
      "Execution session spawn headless context requires headlessView to be an object."
    );

    expect(() =>
      deriveExecutionSessionSpawnHeadlessContext({
        get headlessView() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow(ValidationError);
  });

  it("should snapshot headlessView once before reusing it", () => {
    let headlessViewReads = 0;

    const rootRecord = createRecord({
      attemptId: "att_parent_snapshot_context",
      sessionId: "thr_parent_snapshot_context",
      sourceKind: "direct"
    });
    const childRecord = createHeadlessRecord({
      attemptId: "att_child_snapshot_context",
      parentAttemptId: "att_parent_snapshot_context",
      sessionId: "thr_child_snapshot_context",
      sourceKind: "delegated"
    });

    expect(
      deriveExecutionSessionSpawnHeadlessContext({
        get headlessView() {
          headlessViewReads += 1;

          if (headlessViewReads > 1) {
            throw new Error("headlessView getter read twice");
          }

          return {
            descendantCoverage: "complete",
            headlessRecord: childRecord,
            view: buildExecutionSessionView([rootRecord, childRecord.record])
          };
        }
      } as never)
    ).toEqual({
      headlessView: {
        descendantCoverage: "complete",
        headlessRecord: childRecord,
        view: buildExecutionSessionView([rootRecord, childRecord.record])
      },
      context: {
        record: childRecord.record,
        selectedBy: "attemptId",
        parentRecord: rootRecord,
        childRecords: [],
        hasKnownSession: true,
        hasParent: true,
        hasResolvedParent: true,
        hasChildren: false
      }
    });
    expect(headlessViewReads).toBe(1);
  });

  it("should derive context from the selected attemptId within the supplied headless view", () => {
    const rootRecord = createRecord({
      attemptId: "att_parent_context",
      sessionId: "thr_parent_context",
      sourceKind: "direct"
    });
    const childRecord = createHeadlessRecord({
      attemptId: "att_child_context",
      parentAttemptId: "att_parent_context",
      sessionId: "thr_child_context",
      sourceKind: "delegated"
    });
    const grandchildRecord = createRecord({
      attemptId: "att_grandchild_context",
      parentAttemptId: "att_child_context",
      sessionId: "thr_grandchild_context",
      sourceKind: "fork"
    });
    const headlessView = {
      descendantCoverage: "complete",
      headlessRecord: childRecord,
      view: buildExecutionSessionView([
        rootRecord,
        childRecord.record,
        grandchildRecord
      ])
    } satisfies ExecutionSessionSpawnHeadlessView;

    const result = deriveExecutionSessionSpawnHeadlessContext({
      headlessView
    }) as unknown as Record<string, unknown>;

    expect(result.headlessView).toBe(headlessView);
    expect(result.context).toEqual({
      record: childRecord.record,
      selectedBy: "attemptId",
      parentRecord: rootRecord,
      childRecords: [grandchildRecord],
      hasKnownSession: true,
      hasParent: true,
      hasResolvedParent: true,
      hasChildren: true
    });
    expect(result).not.toHaveProperty("view");
    expect(result).not.toHaveProperty("record");
    expect(result).not.toHaveProperty("selector");
    expect(result).not.toHaveProperty("candidate");
    expect(result).not.toHaveProperty("readiness");
    expect(result).not.toHaveProperty("candidate");
    expect(result).not.toHaveProperty("results");
    expect(result).not.toHaveProperty("headlessViewBatch");
    expect(result).not.toHaveProperty("spawnHeadlessContext");
    expect(result).not.toHaveProperty("spawnHeadlessContextBatch");
    expect(result).not.toHaveProperty("spawnHeadlessWaitCandidate");
    expect(result).not.toHaveProperty("spawnHeadlessWaitCandidateBatch");
  });

  it("should fail when the supplied headless view cannot select the headless record", () => {
    const headlessView = {
      descendantCoverage: "complete",
      headlessRecord: createHeadlessRecord({
        attemptId: "att_missing_context",
        parentAttemptId: "att_parent_context",
        sessionId: "thr_missing_context",
        sourceKind: "delegated"
      }),
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_parent_context",
          sessionId: "thr_parent_context",
          sourceKind: "direct"
        }),
        createRecord({
          attemptId: "att_other_context",
          parentAttemptId: "att_parent_context",
          sessionId: "thr_other_context",
          sourceKind: "fork"
        })
      ])
    } satisfies ExecutionSessionSpawnHeadlessView;

    expect(() =>
      deriveExecutionSessionSpawnHeadlessContext({
        headlessView
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessContext({
        headlessView
      })
    ).toThrow(
      "Execution session spawn headless context requires a selected record."
    );
  });
});

function createRecord(
  overrides: Partial<ExecutionSessionRecord> &
    Pick<ExecutionSessionRecord, "attemptId" | "sourceKind">
): ExecutionSessionRecord {
  const { attemptId, sourceKind, ...rest } = overrides;

  return {
    attemptId,
    runtime: "codex-cli",
    sourceKind,
    lifecycleState: "active",
    runCompleted: false,
    errorEventCount: 0,
    origin: "headless_result",
    ...rest
  };
}

function createHeadlessRecord(
  overrides: {
    attemptId: string;
    sessionId: string;
    sourceKind: "direct" | "fork" | "delegated";
    parentAttemptId?: string;
  }
): ExecutionSessionSpawnHeadlessRecord {
  const requestSourceKind: "fork" | "delegated" =
    overrides.sourceKind === "direct" ? "fork" : overrides.sourceKind;
  const lineageSourceKind: "fork" | "delegated" =
    overrides.sourceKind === "direct" ? "fork" : overrides.sourceKind;

  return {
    headlessExecute: {
      headlessApply: {
        apply: {
          consume: {
            request: {
              parentAttemptId: overrides.parentAttemptId ?? "att_parent_context",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_parent_context",
              sourceKind: requestSourceKind
            },
            invoked: true
          },
          effects: {
            lineage: {
              attemptId: overrides.attemptId,
              sourceKind: lineageSourceKind,
              parentAttemptId: overrides.parentAttemptId ?? "att_parent_context"
            },
            requestedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_parent_context",
              runtime: "codex-cli",
              sessionId: "thr_parent_context",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_parent_context",
              runtime: "codex-cli",
              sessionId: "thr_parent_context",
              lifecycleEventKind: "spawn_recorded"
            }
          }
        },
        headlessInput: {
          prompt: "Reply with exactly: ok",
          attempt: {
            attemptId: overrides.attemptId,
            sourceKind: lineageSourceKind,
            parentAttemptId: overrides.parentAttemptId ?? "att_parent_context"
          }
        }
      },
      executionResult: {
        command: {
          runtime: "codex-cli",
          executable: "codex",
          args: ["exec", "--json", "Reply with exactly: ok"],
          metadata: {
            executionMode: "headless_event_stream",
            machineReadable: true,
            promptIncluded: true,
            resumeRequested: false,
            safetyIntent: "workspace_write_with_approval"
          }
        },
        events: [],
        exitCode: 0,
        observation: {
          runCompleted: false,
          errorEventCount: 0,
          threadId: overrides.sessionId
        },
        stderr: "",
        stdout: ""
      }
    },
    record: createRecord({
      attemptId: overrides.attemptId,
      runtime: "codex-cli",
      sourceKind: overrides.sourceKind,
      sessionId: overrides.sessionId,
      ...(overrides.parentAttemptId === undefined
        ? {}
        : { parentAttemptId: overrides.parentAttemptId })
    })
  };
}
