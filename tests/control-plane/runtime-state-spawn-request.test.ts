import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionSpawnCandidate,
  deriveExecutionSessionSpawnRequest
} from "../../src/control-plane/index.js";
import type {
  ExecutionSessionRecord,
  ExecutionSessionSpawnRequestSourceKind
} from "../../src/control-plane/types.js";

describe("control-plane runtime-state spawn-request helpers", () => {
  it("should derive a fork spawn request from a spawnable candidate", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_active",
          sessionId: "thr_active",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_active"
      }
    });
    const request = deriveExecutionSessionSpawnRequest({
      candidate: candidate!,
      sourceKind: "fork"
    });

    expect(request).toEqual({
      parentAttemptId: "att_active",
      parentRuntime: "codex-cli",
      parentSessionId: "thr_active",
      sourceKind: "fork"
    });
    expect(request).not.toHaveProperty("childAttemptId");
    expect(request).not.toHaveProperty("branch");
    expect(request).not.toHaveProperty("worktreePath");
    expect(request).not.toHaveProperty("runtimeMode");
    expect(request).not.toHaveProperty("prompt");
    expect(request).not.toHaveProperty("task");
    expect(request).not.toHaveProperty("taskId");
    expect(request).not.toHaveProperty("invoked");
  });

  it("should derive a delegated spawn request from a spawnable candidate", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_active",
          sessionId: "thr_active",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_active"
      }
    });

    expect(
      deriveExecutionSessionSpawnRequest({
        candidate: candidate!,
        sourceKind: "delegated"
      })
    ).toEqual({
      parentAttemptId: "att_active",
      parentRuntime: "codex-cli",
      parentSessionId: "thr_active",
      sourceKind: "delegated"
    });
  });

  it("should return undefined when the candidate is blocked", () => {
    const blockedCandidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_terminal",
          sessionId: "thr_terminal",
          sourceKind: "direct",
          lifecycleState: "failed"
        })
      ]),
      selector: {
        attemptId: "att_terminal"
      }
    });

    expect(
      deriveExecutionSessionSpawnRequest({
        candidate: blockedCandidate!,
        sourceKind: "fork"
      })
    ).toBeUndefined();
  });

  it("should return undefined when the candidate has an unknown session", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_unknown_session",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_unknown_session"
      }
    });

    expect(
      deriveExecutionSessionSpawnRequest({
        candidate: candidate!,
        sourceKind: "fork"
      })
    ).toBeUndefined();
  });

  it("should carry through inherited guardrails when present on the parent record", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_guarded",
          sessionId: "thr_guarded",
          sourceKind: "direct",
          lifecycleState: "active",
          guardrails: {
            maxChildren: 2,
            maxDepth: 3
          }
        })
      ]),
      selector: {
        attemptId: "att_guarded"
      }
    });

    expect(
      deriveExecutionSessionSpawnRequest({
        candidate: candidate!,
        sourceKind: "delegated"
      })
    ).toEqual({
      parentAttemptId: "att_guarded",
      parentRuntime: "codex-cli",
      parentSessionId: "thr_guarded",
      sourceKind: "delegated",
      inheritedGuardrails: {
        maxChildren: 2,
        maxDepth: 3
      }
    });
  });

  it("should omit inheritedGuardrails when the parent record has none", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_active",
          sessionId: "thr_active",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_active"
      }
    });
    const request = deriveExecutionSessionSpawnRequest({
      candidate: candidate!,
      sourceKind: "fork"
    });

    expect(request).toEqual({
      parentAttemptId: "att_active",
      parentRuntime: "codex-cli",
      parentSessionId: "thr_active",
      sourceKind: "fork"
    });
    expect(request).not.toHaveProperty("inheritedGuardrails");
  });

  it("should derive the request without mutating the candidate", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_chain",
          sessionId: "thr_chain",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_chain"
      }
    })!;
    const candidateSnapshot = JSON.parse(JSON.stringify(candidate));

    expect(
      deriveExecutionSessionSpawnRequest({
        candidate,
        sourceKind: "fork"
      })
    ).toEqual({
      parentAttemptId: "att_chain",
      parentRuntime: "codex-cli",
      parentSessionId: "thr_chain",
      sourceKind: "fork"
    });
    expect(candidate).toEqual(candidateSnapshot);
  });

  it("should reject invalid spawn request source kinds", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_active",
          sessionId: "thr_active",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_active"
      }
    })!;

    for (const invalidSourceKind of ["direct", "resume", "   "]) {
      expect(() =>
        deriveExecutionSessionSpawnRequest({
          candidate,
          sourceKind:
            invalidSourceKind as unknown as ExecutionSessionSpawnRequestSourceKind
        })
      ).toThrow(ValidationError);
      expect(() =>
        deriveExecutionSessionSpawnRequest({
          candidate,
          sourceKind:
            invalidSourceKind as unknown as ExecutionSessionSpawnRequestSourceKind
        })
      ).toThrow(/sourceKind/i);
    }
  });

  it("should keep child planning details out of the derived request", () => {
    const candidate = deriveExecutionSessionSpawnCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_target",
          sessionId: "thr_target",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_target"
      }
    });
    const request = deriveExecutionSessionSpawnRequest({
      candidate: candidate!,
      sourceKind: "fork"
    });

    expect(request).toEqual({
      parentAttemptId: "att_target",
      parentRuntime: "codex-cli",
      parentSessionId: "thr_target",
      sourceKind: "fork"
    });
    expect(request).not.toHaveProperty("childAttemptId");
    expect(request).not.toHaveProperty("childBranch");
    expect(request).not.toHaveProperty("branch");
    expect(request).not.toHaveProperty("worktreePath");
    expect(request).not.toHaveProperty("childWorktreePath");
    expect(request).not.toHaveProperty("childRuntime");
    expect(request).not.toHaveProperty("runtimeMode");
    expect(request).not.toHaveProperty("prompt");
    expect(request).not.toHaveProperty("task");
    expect(request).not.toHaveProperty("taskId");
    expect(request).not.toHaveProperty("parentAttemptLineage");
    expect(request).not.toHaveProperty("invoked");
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
    lifecycleState: "created",
    runCompleted: false,
    errorEventCount: 0,
    origin: "headless_result",
    ...rest
  };
}
