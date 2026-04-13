import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnHeadlessContext,
  deriveExecutionSessionSpawnHeadlessView,
  deriveExecutionSessionSpawnHeadlessWaitCandidate,
  deriveExecutionSessionWaitReadiness,
  type ExecutionSessionRecord,
  type ExecutionSessionSpawnHeadlessRecord,
  type ExecutionSessionSpawnHeadlessView
} from "../../src/control-plane/internal.js";

describe(
  "control-plane runtime-state spawn-headless-wait-candidate helpers",
  () => {
    it("should bridge a headless context into a wait candidate without reshaping the shared context", () => {
      const rootRecord = createRecord({
        attemptId: "att_parent_wait_candidate",
        sessionId: "thr_parent_wait_candidate",
        sourceKind: "direct"
      });
      const childRecord = createHeadlessRecord({
        attemptId: "att_child_wait_candidate",
        parentAttemptId: "att_parent_wait_candidate",
        sessionId: "thr_child_wait_candidate",
        sourceKind: "delegated"
      });
      const headlessView = {
        descendantCoverage: "complete",
        headlessRecord: childRecord,
        view: buildExecutionSessionView([rootRecord, childRecord.record])
      } satisfies ExecutionSessionSpawnHeadlessView;
      const headlessContext = deriveExecutionSessionSpawnHeadlessContext({
        headlessView
      });

      const result = deriveExecutionSessionSpawnHeadlessWaitCandidate({
        headlessContext
      }) as unknown as Record<string, unknown>;

      expect(result.headlessContext).toEqual(headlessContext);
      expect(result.headlessContext).not.toBe(headlessContext);
      expect((result.headlessContext as { context: unknown }).context).toBe(
        headlessContext.context
      );
      expect(
        (result.headlessContext as { headlessView: unknown }).headlessView
      ).toBe(headlessContext.headlessView);
      expect(result.candidate).toEqual({
        context: headlessContext.context,
        readiness: deriveExecutionSessionWaitReadiness({
          context: headlessContext.context
        })
      });
      expect((result.candidate as { context: unknown }).context).toBe(
        headlessContext.context
      );
      expect(result).not.toHaveProperty("context");
      expect(result).not.toHaveProperty("readiness");
      expect(result).not.toHaveProperty("results");
      expect(result).not.toHaveProperty("headlessView");
      expect(result).not.toHaveProperty("headlessContextBatch");
      expect(result).not.toHaveProperty("summary");
      expect(result).not.toHaveProperty("count");
      expect(result).not.toHaveProperty("error");
      expect(result).not.toHaveProperty("errors");
      expect(result).not.toHaveProperty("spawnHeadlessWaitCandidate");
      expect(result).not.toHaveProperty("spawnHeadlessWaitCandidateBatch");
    });

    it("should preserve wait-readiness blockers when the bridged context is terminal, sessionless, and has children", () => {
      const parentRecord = createRecord({
        attemptId: "att_parent_blocked_wait_candidate",
        sessionId: "thr_parent_blocked_wait_candidate",
        sourceKind: "direct"
      });
      const childRecord = createHeadlessRecord({
        attemptId: "att_child_blocked_wait_candidate",
        lifecycleState: "failed",
        parentAttemptId: "att_parent_blocked_wait_candidate",
        sourceKind: "fork"
      });
      const grandchildRecord = createRecord({
        attemptId: "att_grandchild_blocked_wait_candidate",
        parentAttemptId: "att_child_blocked_wait_candidate",
        sessionId: "thr_grandchild_blocked_wait_candidate",
        sourceKind: "delegated"
      });
      const headlessContext = deriveExecutionSessionSpawnHeadlessContext({
        headlessView: {
          descendantCoverage: "complete",
          headlessRecord: childRecord,
          view: buildExecutionSessionView([
            parentRecord,
            childRecord.record,
            grandchildRecord
          ])
        }
      });

      expect(
        deriveExecutionSessionSpawnHeadlessWaitCandidate({
          headlessContext
        })
      ).toEqual({
        headlessContext,
        candidate: {
          context: headlessContext.context,
          readiness: {
            blockingReasons: [
              "lifecycle_terminal",
              "session_unknown",
              "child_attempts_present"
            ],
            canWait: false,
            hasBlockingReasons: true
          }
        }
      });
    });

    it("should fail closed when the headless context comes from an incomplete default headless view", () => {
      const headlessRecord = createHeadlessRecord({
        attemptId: "att_child_wait_candidate_incomplete",
        parentAttemptId: "att_parent_wait_candidate_incomplete",
        sessionId: "thr_child_wait_candidate_incomplete",
        sourceKind: "delegated"
      });
      const headlessContext = deriveExecutionSessionSpawnHeadlessContext({
        headlessView: deriveExecutionSessionSpawnHeadlessView({
          headlessRecord
        })
      });

      expect(
        deriveExecutionSessionSpawnHeadlessWaitCandidate({
          headlessContext
        })
      ).toEqual({
        headlessContext,
        candidate: {
          context: headlessContext.context,
          readiness: {
            blockingReasons: ["descendant_coverage_incomplete"],
            canWait: false,
            hasBlockingReasons: true
          }
        }
      });
    });

    it("should fail closed when a manually constructed headless view omits descendant coverage", () => {
      const parentRecord = createRecord({
        attemptId: "att_parent_wait_candidate_manual_missing",
        sessionId: "thr_parent_wait_candidate_manual_missing",
        sourceKind: "direct"
      });
      const childRecord = createHeadlessRecord({
        attemptId: "att_child_wait_candidate_manual_missing",
        parentAttemptId: "att_parent_wait_candidate_manual_missing",
        sessionId: "thr_child_wait_candidate_manual_missing",
        sourceKind: "delegated"
      });
      const headlessContext = deriveExecutionSessionSpawnHeadlessContext({
        headlessView: {
          headlessRecord: childRecord,
          view: buildExecutionSessionView([parentRecord, childRecord.record])
        }
      });

      expect(
        deriveExecutionSessionSpawnHeadlessWaitCandidate({
          headlessContext
        })
      ).toEqual({
        headlessContext: {
          ...headlessContext,
          headlessView: {
            ...headlessContext.headlessView,
            descendantCoverage: "incomplete"
          }
        },
        candidate: {
          context: headlessContext.context,
          readiness: {
            blockingReasons: ["descendant_coverage_incomplete"],
            canWait: false,
            hasBlockingReasons: true
          }
        }
      });
    });

    it("should reject malformed headless context wrappers before deriving readiness", () => {
      expect(() =>
        deriveExecutionSessionSpawnHeadlessWaitCandidate({
          headlessContext: null
        } as never)
      ).toThrow(ValidationError);
      expect(() =>
        deriveExecutionSessionSpawnHeadlessWaitCandidate({
          headlessContext: null
        } as never)
      ).toThrow(
        "Execution session spawn headless wait candidate requires a headlessContext wrapper."
      );
    });

    it("should reject headless contexts that omit context or headlessView objects", () => {
      expect(() =>
        deriveExecutionSessionSpawnHeadlessWaitCandidate({
          headlessContext: {
            context: undefined,
            headlessView: {}
          }
        } as never)
      ).toThrow(ValidationError);
      expect(() =>
        deriveExecutionSessionSpawnHeadlessWaitCandidate({
          headlessContext: {
            context: undefined,
            headlessView: {}
          }
        } as never)
      ).toThrow(
        "Execution session spawn headless wait candidate requires headlessContext to include context and headlessView objects."
      );
    });

    it("should snapshot nested headlessContext values so readiness only reads them once", () => {
      let headlessContextReads = 0;

      const canonicalHeadlessContext = deriveExecutionSessionSpawnHeadlessContext({
        headlessView: {
          descendantCoverage: "complete",
          headlessRecord: createHeadlessRecord({
            attemptId: "att_child_wait_candidate_snapshot",
            parentAttemptId: "att_parent_wait_candidate_snapshot",
            sessionId: "thr_child_wait_candidate_snapshot",
            sourceKind: "delegated"
          }),
          view: buildExecutionSessionView([
            createRecord({
              attemptId: "att_parent_wait_candidate_snapshot",
              sessionId: "thr_parent_wait_candidate_snapshot",
              sourceKind: "direct"
            }),
            createRecord({
              attemptId: "att_child_wait_candidate_snapshot",
              parentAttemptId: "att_parent_wait_candidate_snapshot",
              sessionId: "thr_child_wait_candidate_snapshot",
              sourceKind: "delegated"
            })
          ])
        }
      });

      const result = deriveExecutionSessionSpawnHeadlessWaitCandidate({
        get headlessContext() {
          headlessContextReads += 1;

          if (headlessContextReads > 1) {
            throw new Error("headlessContext getter read twice");
          }

          return canonicalHeadlessContext;
        }
      } as never);

      expect(result).toEqual({
        headlessContext: canonicalHeadlessContext,
        candidate: {
          context: canonicalHeadlessContext.context,
          readiness: deriveExecutionSessionWaitReadiness({
            context: canonicalHeadlessContext.context
          })
        }
      });
      expect(headlessContextReads).toBe(1);
    });
  }
);

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
    sourceKind: "direct" | "fork" | "delegated";
    lifecycleState?: ExecutionSessionRecord["lifecycleState"];
    parentAttemptId?: string;
    sessionId?: string;
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
              parentAttemptId:
                overrides.parentAttemptId ?? "att_parent_wait_candidate",
              parentRuntime: "codex-cli",
              parentSessionId: "thr_parent_wait_candidate",
              sourceKind: requestSourceKind
            },
            invoked: true
          },
          effects: {
            lineage: {
              attemptId: overrides.attemptId,
              sourceKind: lineageSourceKind,
              parentAttemptId:
                overrides.parentAttemptId ?? "att_parent_wait_candidate"
            },
            requestedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_parent_wait_candidate",
              runtime: "codex-cli",
              sessionId: "thr_parent_wait_candidate",
              lifecycleEventKind: "spawn_requested"
            },
            recordedEvent: {
              attemptId: overrides.parentAttemptId ?? "att_parent_wait_candidate",
              runtime: "codex-cli",
              sessionId: "thr_parent_wait_candidate",
              lifecycleEventKind: "spawn_recorded"
            }
          }
        },
        headlessInput: {
          prompt: "Reply with exactly: ok",
          attempt: {
            attemptId: overrides.attemptId,
            sourceKind: lineageSourceKind,
            parentAttemptId:
              overrides.parentAttemptId ?? "att_parent_wait_candidate"
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
          ...(overrides.sessionId === undefined
            ? {}
            : { threadId: overrides.sessionId })
        },
        stderr: "",
        stdout: ""
      }
    },
    record: createRecord({
      attemptId: overrides.attemptId,
      runtime: "codex-cli",
      sourceKind: overrides.sourceKind,
      ...(overrides.lifecycleState === undefined
        ? {}
        : { lifecycleState: overrides.lifecycleState }),
      ...(overrides.sessionId === undefined
        ? {}
        : { sessionId: overrides.sessionId }),
      ...(overrides.parentAttemptId === undefined
        ? {}
        : { parentAttemptId: overrides.parentAttemptId })
    })
  };
}
