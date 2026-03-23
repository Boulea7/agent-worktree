import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnHeadlessContext,
  type ExecutionSessionRecord,
  type ExecutionSessionSpawnHeadlessRecord,
  type ExecutionSessionSpawnHeadlessView
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state spawn-headless-context helpers", () => {
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
    expect(result).not.toHaveProperty("readiness");
    expect(result).not.toHaveProperty("results");
    expect(result).not.toHaveProperty("headlessViewBatch");
    expect(result).not.toHaveProperty("spawnHeadlessContext");
    expect(result).not.toHaveProperty("spawnHeadlessContextBatch");
  });

  it("should fail when the supplied headless view cannot select the headless record", () => {
    const headlessView = {
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
      parentAttemptId: overrides.parentAttemptId,
      sessionId: overrides.sessionId
    })
  };
}
