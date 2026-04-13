import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionCloseCandidate,
  deriveExecutionSessionCloseTarget
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state close-target helpers", () => {
  it("should derive a close target from a closable candidate", () => {
    const candidate = deriveExecutionSessionCloseCandidate({
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
      },
      resolveSessionLifecycleCapability: () => true
    });

    expect(
      deriveExecutionSessionCloseTarget({
        candidate: candidate!
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
  });

  it("should return undefined when session lifecycle support blocks closing", () => {
    const blockedCandidate = deriveExecutionSessionCloseCandidate({
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
      deriveExecutionSessionCloseTarget({
        candidate: blockedCandidate!
      })
    ).toBeUndefined();
  });

  it("should derive the same close target shape through attemptId and sessionId selection paths", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);
    const candidateByAttemptId = deriveExecutionSessionCloseCandidate({
      view,
      selector: {
        attemptId: "att_active"
      },
      resolveSessionLifecycleCapability: () => true
    });
    const candidateBySessionId = deriveExecutionSessionCloseCandidate({
      view,
      selector: {
        sessionId: "thr_active"
      },
      resolveSessionLifecycleCapability: () => true
    });

    expect(
      deriveExecutionSessionCloseTarget({
        candidate: candidateByAttemptId!
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
    expect(
      deriveExecutionSessionCloseTarget({
        candidate: candidateBySessionId!
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
  });

  it("should trim raw wrapper string fields before returning a close target", () => {
    expect(
      deriveExecutionSessionCloseTarget({
        candidate: {
          context: {
            record: {
              attemptId: "  att_trim_close  ",
              runtime: "  codex-cli  ",
              sessionId: "  thr_trim_close  "
            }
          },
          readiness: {
            canClose: true
          }
        } as never
      })
    ).toEqual({
      attemptId: "att_trim_close",
      runtime: "codex-cli",
      sessionId: "thr_trim_close"
    });
  });

  it("should return undefined when the candidate has an unknown session", () => {
    const candidate = deriveExecutionSessionCloseCandidate({
      view: buildExecutionSessionView([
        createRecord({
          attemptId: "att_unknown_session",
          sourceKind: "direct",
          lifecycleState: "active"
        })
      ]),
      selector: {
        attemptId: "att_unknown_session"
      },
      resolveSessionLifecycleCapability: () => true
    });

    expect(
      deriveExecutionSessionCloseTarget({
        candidate: candidate!
      })
    ).toBeUndefined();
  });

  it("should return undefined when child attempts still block closing", () => {
    const rootRecord = createRecord({
      attemptId: "att_parent",
      sessionId: "thr_parent",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const childRecord = createRecord({
      attemptId: "att_child",
      sessionId: "thr_child",
      sourceKind: "fork",
      parentAttemptId: "att_parent",
      lifecycleState: "active"
    });
    const candidate = deriveExecutionSessionCloseCandidate({
      view: buildExecutionSessionView([rootRecord, childRecord]),
      selector: {
        attemptId: "att_parent"
      },
      resolveSessionLifecycleCapability: () => true
    });

    expect(
      deriveExecutionSessionCloseTarget({
        candidate: candidate!
      })
    ).toBeUndefined();
  });

  it("should derive a close target through the existing record-view-candidate chain without mutating the candidate", () => {
    const record = createRecord({
      attemptId: "att_chain",
      sessionId: "thr_chain",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const candidate = deriveExecutionSessionCloseCandidate({
      view: buildExecutionSessionView([record]),
      selector: {
        attemptId: "att_chain"
      },
      resolveSessionLifecycleCapability: () => true
    })!;
    const candidateSnapshot = JSON.parse(JSON.stringify(candidate));

    expect(
      deriveExecutionSessionCloseTarget({
        candidate
      })
    ).toEqual({
      attemptId: "att_chain",
      runtime: "codex-cli",
      sessionId: "thr_chain"
    });
    expect(candidate).toEqual(candidateSnapshot);
  });

  it("should fail loudly when the supplied close-target input or candidate containers are malformed", () => {
    expect(() =>
      deriveExecutionSessionCloseTarget(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionCloseTarget(undefined as never)
    ).toThrow("Execution session close target input must be an object.");

    expect(() =>
      deriveExecutionSessionCloseTarget({
        candidate: undefined as never
      })
    ).toThrow(
      "Execution session close target requires candidate to be an object."
    );

    expect(() =>
      deriveExecutionSessionCloseTarget({
        candidate: {
          context: null,
          readiness: {}
        } as never
      })
    ).toThrow(
      "Execution session close target requires candidate.context to be an object."
    );

    expect(() =>
      deriveExecutionSessionCloseTarget({
        candidate: {
          context: {
            record: {
              attemptId: "att_active",
              runtime: "codex-cli",
              sessionId: "thr_active"
            }
          },
          readiness: null
        } as never
      })
    ).toThrow(
      "Execution session close target requires candidate.readiness to be an object."
    );

    expect(() =>
      deriveExecutionSessionCloseTarget({
        candidate: {
          context: {
            record: {
              attemptId: "att_active",
              runtime: "codex-cli",
              sessionId: "thr_active"
            }
          },
          readiness: {}
        } as never
      })
    ).toThrow(
      "Execution session close target requires candidate.readiness.canClose to be a boolean."
    );

    expect(() =>
      deriveExecutionSessionCloseTarget({
        candidate: {
          context: {
            record: {
              attemptId: "att_active",
              runtime: "   ",
              sessionId: "thr_active"
            }
          },
          readiness: {
            canClose: true
          }
        } as never
      })
    ).toThrow(
      "Execution session close target requires candidate.context.record.runtime to be a non-empty string."
    );
  });

  it("should fail closed on inherited or accessor-shaped candidate wrappers", () => {
    const inheritedInput = Object.create({
      candidate: deriveExecutionSessionCloseCandidate({
        view: buildExecutionSessionView([
          createRecord({
            attemptId: "att_inherited_close_target",
            sessionId: "thr_inherited_close_target",
            sourceKind: "direct",
            lifecycleState: "active"
          })
        ]),
        selector: {
          attemptId: "att_inherited_close_target"
        },
        resolveSessionLifecycleCapability: () => true
      })
    });

    expect(() =>
      deriveExecutionSessionCloseTarget(inheritedInput as never)
    ).toThrow(
      "Execution session close target requires candidate to be an object."
    );

    expect(() =>
      deriveExecutionSessionCloseTarget({
        get candidate() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow(ValidationError);
  });

  it("should fail closed on prototype-backed or accessor-backed candidate.context.record identifiers", () => {
    expect(() =>
      deriveExecutionSessionCloseTarget({
        candidate: {
          context: {
            record: Object.assign(
              Object.create({
                sessionId: "thr_proto_close_target"
              }),
              {
                attemptId: "att_proto_close_target",
                runtime: "codex-cli"
              }
            )
          },
          readiness: {
            canClose: true
          }
        } as never
      })
    ).toThrow(
      "Execution session close target requires candidate.context.record.sessionId to be a non-empty string when present."
    );

    const recordWithAccessor = {
      attemptId: "att_accessor_close_target",
      sessionId: "thr_accessor_close_target"
    };
    Object.defineProperty(recordWithAccessor, "runtime", {
      enumerable: true,
      get() {
        throw new Error("runtime getter boom");
      }
    });

    expect(() =>
      deriveExecutionSessionCloseTarget({
        candidate: {
          context: {
            record: recordWithAccessor as never
          },
          readiness: {
            canClose: true
          }
        } as never
      })
    ).toThrow(
      "Execution session close target requires candidate.context.record.runtime to be a non-empty string."
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
    lifecycleState: "created",
    runCompleted: false,
    errorEventCount: 0,
    origin: "headless_result",
    ...rest
  };
}
