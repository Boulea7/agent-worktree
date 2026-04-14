import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionCloseRequest,
  deriveExecutionSessionSpawnHeadlessCloseRequest,
  type ExecutionSessionSpawnHeadlessCloseTarget
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-headless-close-request helpers", () => {
  it("should derive a wrapped close request from a closable headless close target", () => {
    const headlessCloseTarget = createHeadlessCloseTarget({
      target: {
        attemptId: "att_supported_close_request",
        runtime: "supported-cli",
        sessionId: "thr_supported_close_request"
      }
    });

    const result = deriveExecutionSessionSpawnHeadlessCloseRequest({
      headlessCloseTarget
    }) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      headlessCloseTarget,
      request: deriveExecutionSessionCloseRequest({
        target: headlessCloseTarget.target!
      })
    });
    expect(result).not.toHaveProperty("target");
    expect(result).not.toHaveProperty("candidate");
    expect(result).not.toHaveProperty("headlessContext");
    expect(result).not.toHaveProperty("consumer");
    expect(result).not.toHaveProperty("consume");
  });

  it("should preserve a blocked headless close target while omitting request output", () => {
    expect(
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget: createHeadlessCloseTarget()
      })
    ).toEqual({
      headlessCloseTarget: createHeadlessCloseTarget()
    });
  });

  it("should preserve descendant coverage blockers when the headless close target cannot produce a request", () => {
    const headlessCloseTarget = createHeadlessCloseTarget({
      headlessCloseCandidate: {
        headlessContext: {
          context: {
            childRecords: [],
            hasChildren: false,
            hasKnownSession: true,
            hasParent: true,
            hasResolvedParent: true,
            parentRecord: {
              attemptId: "att_parent_descendant_close",
              errorEventCount: 0,
              lifecycleState: "active",
              origin: "headless_result",
              runCompleted: false,
              runtime: "codex-cli",
              sessionId: "thr_parent_descendant_close",
              sourceKind: "direct"
            },
            record: {
              attemptId: "att_child_descendant_close",
              errorEventCount: 0,
              lifecycleState: "active",
              origin: "headless_result",
              runCompleted: false,
              runtime: "codex-cli",
              sessionId: "thr_child_descendant_close",
              sourceKind: "delegated"
            },
            selectedBy: "attemptId"
          },
          headlessView: {
            descendantCoverage: "incomplete",
            headlessRecord: {
              headlessExecute: {} as never,
              record: {
                attemptId: "att_child_descendant_close",
                errorEventCount: 0,
                lifecycleState: "active",
                origin: "headless_result",
                runCompleted: false,
                runtime: "codex-cli",
                sessionId: "thr_child_descendant_close",
                sourceKind: "delegated"
              }
            },
            view: buildEmptyView()
          }
        },
        candidate: {
          context: {
            childRecords: [],
            hasChildren: false,
            hasKnownSession: true,
            hasParent: true,
            hasResolvedParent: true,
            parentRecord: {
              attemptId: "att_parent_descendant_close",
              errorEventCount: 0,
              lifecycleState: "active",
              origin: "headless_result",
              runCompleted: false,
              runtime: "codex-cli",
              sessionId: "thr_parent_descendant_close",
              sourceKind: "direct"
            },
            record: {
              attemptId: "att_child_descendant_close",
              errorEventCount: 0,
              lifecycleState: "active",
              origin: "headless_result",
              runCompleted: false,
              runtime: "codex-cli",
              sessionId: "thr_child_descendant_close",
              sourceKind: "delegated"
            },
            selectedBy: "attemptId"
          },
          readiness: {
            alreadyFinal: false,
            blockingReasons: ["descendant_coverage_incomplete"],
            canClose: false,
            hasBlockingReasons: true,
            sessionLifecycleSupported: true,
            wouldAffectDescendants: false
          }
        }
      }
    });

    expect(
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget
      })
    ).toEqual({
      headlessCloseTarget
    });
    expect(
      headlessCloseTarget.headlessCloseCandidate.candidate.readiness.blockingReasons
    ).toContain("descendant_coverage_incomplete");
  });

  it("should reject non-object close request seam inputs before reading headlessCloseTarget", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest(undefined as never)
    ).toThrow(
      "Execution session spawn headless close request input must be an object."
    );
    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest(null as never)
    ).toThrow(
      "Execution session spawn headless close request input must be an object."
    );
  });

  it("should reject inherited or getter-backed top-level headlessCloseTarget inputs", () => {
    const canonicalTarget = createHeadlessCloseTarget({
      target: {
        attemptId: "att_top_level_close_request",
        runtime: "codex-cli",
        sessionId: "thr_top_level_close_request"
      }
    });
    const inheritedInput = Object.create({
      headlessCloseTarget: canonicalTarget
    });

    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest(inheritedInput as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest(inheritedInput as never)
    ).toThrow(
      "Execution session spawn headless close request requires a headlessCloseTarget wrapper."
    );

    const accessorInput = {};
    Object.defineProperty(accessorInput, "headlessCloseTarget", {
      enumerable: true,
      get() {
        throw new Error("boom");
      }
    });

    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest(accessorInput as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest(accessorInput as never)
    ).toThrow(
      "Execution session spawn headless close request requires a headlessCloseTarget wrapper."
    );
  });

  it("should reject wrapper-level targets that come only from the prototype chain", () => {
    const canonicalTarget = createHeadlessCloseTarget({
      target: {
        attemptId: "att_proto_close_request",
        runtime: "codex-cli",
        sessionId: "thr_proto_close_request"
      }
    });
    const headlessCloseTarget = Object.create({
      target: canonicalTarget.target
    });
    headlessCloseTarget.headlessCloseCandidate =
      canonicalTarget.headlessCloseCandidate;

    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget
      } as never)
    ).toThrow(
      "Execution session spawn headless close request requires headlessCloseTarget.target to be an object when provided."
    );
  });

  it("should reject wrapper-level targets whose getter throws", () => {
    const canonicalTarget = createHeadlessCloseTarget({
      target: {
        attemptId: "att_accessor_close_request",
        runtime: "codex-cli",
        sessionId: "thr_accessor_close_request"
      }
    });
    const headlessCloseTarget = {
      headlessCloseCandidate: canonicalTarget.headlessCloseCandidate
    };
    Object.defineProperty(headlessCloseTarget, "target", {
      enumerable: true,
      get() {
        throw new Error("boom");
      }
    });

    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget
      } as never)
    ).toThrow(
      "Execution session spawn headless close request requires headlessCloseTarget.target to be an object when provided."
    );
  });

  it("should reject malformed headless close target wrappers", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget: {} as ExecutionSessionSpawnHeadlessCloseTarget
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget: {} as ExecutionSessionSpawnHeadlessCloseTarget
      })
    ).toThrow(
      "Execution session spawn headless close request requires a headlessCloseTarget wrapper."
    );
  });

  it("should reject nested headless close candidates that are not objects", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget: {
          headlessCloseCandidate: null as never
        } as ExecutionSessionSpawnHeadlessCloseTarget
      })
    ).toThrow(
      "Execution session spawn headless close request requires headlessCloseTarget.headlessCloseCandidate to be an object."
    );
  });

  it("should reject nested headless close candidates that omit candidate or headlessContext", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget: {
          headlessCloseCandidate: {} as never
        } as ExecutionSessionSpawnHeadlessCloseTarget
      })
    ).toThrow(
      "Execution session spawn headless close request requires headlessCloseTarget.headlessCloseCandidate to include candidate and headlessContext objects."
    );
  });

  it("should reject nested headless close candidates whose companion omits context or headlessView", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessCloseRequest({
        headlessCloseTarget: {
          headlessCloseCandidate: {
            candidate: {} as never,
            headlessContext: {} as never
          }
        } as ExecutionSessionSpawnHeadlessCloseTarget
      })
    ).toThrow(
      "Execution session spawn headless close request requires headlessCloseTarget.headlessCloseCandidate.headlessContext to include context and headlessView objects."
    );
  });

  it("should not mutate the supplied headless close target and should keep the result shape minimal", () => {
    const headlessCloseTarget = createHeadlessCloseTarget({
      target: {
        attemptId: "att_shape_close_request",
        runtime: "codex-cli",
        sessionId: "thr_shape_close_request"
      }
    });
    const snapshot = structuredClone(headlessCloseTarget);
    const result = deriveExecutionSessionSpawnHeadlessCloseRequest({
      headlessCloseTarget
    }) as unknown as Record<string, unknown>;

    expect(headlessCloseTarget).toEqual(snapshot);
    expect(result).toEqual({
      headlessCloseTarget,
      request: {
        attemptId: "att_shape_close_request",
        runtime: "codex-cli",
        sessionId: "thr_shape_close_request"
      }
    });
    expect(result).not.toHaveProperty("results");
    expect(result).not.toHaveProperty("headlessCloseTargetBatch");
    expect(result).not.toHaveProperty("closeTarget");
    expect(result).not.toHaveProperty("waitTarget");
  });
});

function createHeadlessCloseTarget(
  overrides: Partial<ExecutionSessionSpawnHeadlessCloseTarget> = {}
): ExecutionSessionSpawnHeadlessCloseTarget {
  return {
    headlessCloseCandidate: {
      headlessContext: {
        context: {
          childRecords: [],
          hasChildren: false,
          hasKnownSession: true,
          hasParent: true,
          hasResolvedParent: true,
          parentRecord: {
            attemptId: "att_parent",
            errorEventCount: 0,
            lifecycleState: "active",
            origin: "headless_result",
            runCompleted: false,
            runtime: "codex-cli",
            sessionId: "thr_parent",
            sourceKind: "direct"
          },
          record: {
            attemptId: "att_child",
            errorEventCount: 0,
            lifecycleState: "active",
            origin: "headless_result",
            runCompleted: false,
            runtime: "codex-cli",
            sessionId: "thr_child",
            sourceKind: "delegated"
          },
          selectedBy: "attemptId"
        },
        headlessView: {
          headlessRecord: {
            headlessExecute: {} as never,
            record: {
              attemptId: "att_child",
              errorEventCount: 0,
              lifecycleState: "active",
              origin: "headless_result",
              runCompleted: false,
              runtime: "codex-cli",
              sessionId: "thr_child",
              sourceKind: "delegated"
            }
          },
          view: buildEmptyView()
        }
      },
      candidate: {
        context: {
          childRecords: [],
          hasChildren: false,
          hasKnownSession: true,
          hasParent: true,
          hasResolvedParent: true,
          parentRecord: {
            attemptId: "att_parent",
            errorEventCount: 0,
            lifecycleState: "active",
            origin: "headless_result",
            runCompleted: false,
            runtime: "codex-cli",
            sessionId: "thr_parent",
            sourceKind: "direct"
          },
          record: {
            attemptId: "att_child",
            errorEventCount: 0,
            lifecycleState: "active",
            origin: "headless_result",
            runCompleted: false,
            runtime: "codex-cli",
            sessionId: "thr_child",
            sourceKind: "delegated"
          },
          selectedBy: "attemptId"
        },
        readiness: {
          alreadyFinal: false,
          blockingReasons: ["session_lifecycle_unsupported"],
          canClose: false,
          hasBlockingReasons: true,
          sessionLifecycleSupported: false,
          wouldAffectDescendants: false
        }
      }
    },
    ...overrides
  };
}

function buildEmptyView() {
  return {
    childAttemptIdsByParent: new Map<string, string[]>(),
    index: {
      byAttemptId: new Map<string, ExecutionSessionSpawnHeadlessCloseTarget[]>(),
      bySessionId: new Map<string, ExecutionSessionSpawnHeadlessCloseTarget[]>()
    }
  } as never;
}
