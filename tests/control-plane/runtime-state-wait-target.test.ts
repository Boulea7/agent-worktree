import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionView,
  deriveExecutionSessionWaitCandidate,
  deriveExecutionSessionWaitTarget
} from "../../src/control-plane/internal.js";
import type { ExecutionSessionRecord } from "../../src/control-plane/types.js";

describe("control-plane runtime-state wait-target helpers", () => {
  it("should derive a wait target from a waitable candidate", () => {
    const candidate = deriveExecutionSessionWaitCandidate({
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
      deriveExecutionSessionWaitTarget({
        candidate: candidate!
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
  });

  it("should return undefined when the candidate is blocked", () => {
    const blockedCandidate = deriveExecutionSessionWaitCandidate({
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
      deriveExecutionSessionWaitTarget({
        candidate: blockedCandidate!
      })
    ).toBeUndefined();
  });

  it("should derive the same wait target shape through attemptId and sessionId selection paths", () => {
    const record = createRecord({
      attemptId: "att_active",
      sessionId: "thr_active",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const view = buildExecutionSessionView([record]);
    const candidateByAttemptId = deriveExecutionSessionWaitCandidate({
      view,
      selector: {
        attemptId: "att_active"
      }
    });
    const candidateBySessionId = deriveExecutionSessionWaitCandidate({
      view,
      selector: {
        sessionId: "thr_active"
      }
    });

    expect(
      deriveExecutionSessionWaitTarget({
        candidate: candidateByAttemptId!
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
    expect(
      deriveExecutionSessionWaitTarget({
        candidate: candidateBySessionId!
      })
    ).toEqual({
      attemptId: "att_active",
      runtime: "codex-cli",
      sessionId: "thr_active"
    });
  });

  it("should trim raw wrapper string fields before returning a wait target", () => {
    expect(
      deriveExecutionSessionWaitTarget({
        candidate: {
          context: {
            record: {
              attemptId: "  att_trim_wait  ",
              runtime: "  codex-cli  ",
              sessionId: "  thr_trim_wait  "
            }
          },
          readiness: {
            canWait: true
          }
        } as never
      })
    ).toEqual({
      attemptId: "att_trim_wait",
      runtime: "codex-cli",
      sessionId: "thr_trim_wait"
    });
  });

  it("should return undefined when the candidate has an unknown session", () => {
    const candidate = deriveExecutionSessionWaitCandidate({
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
      deriveExecutionSessionWaitTarget({
        candidate: candidate!
      })
    ).toBeUndefined();
  });

  it("should return undefined when child attempts still block waiting", () => {
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
    const candidate = deriveExecutionSessionWaitCandidate({
      view: buildExecutionSessionView([rootRecord, childRecord]),
      selector: {
        attemptId: "att_parent"
      }
    });

    expect(
      deriveExecutionSessionWaitTarget({
        candidate: candidate!
      })
    ).toBeUndefined();
  });

  it("should derive a wait target through the existing record-view-candidate chain without mutating the candidate", () => {
    const record = createRecord({
      attemptId: "att_chain",
      sessionId: "thr_chain",
      sourceKind: "direct",
      lifecycleState: "active"
    });
    const candidate = deriveExecutionSessionWaitCandidate({
      view: buildExecutionSessionView([record]),
      selector: {
        attemptId: "att_chain"
      }
    })!;
    const candidateSnapshot = JSON.parse(JSON.stringify(candidate));

    expect(
      deriveExecutionSessionWaitTarget({
        candidate
      })
    ).toEqual({
      attemptId: "att_chain",
      runtime: "codex-cli",
      sessionId: "thr_chain"
    });
    expect(candidate).toEqual(candidateSnapshot);
  });

  it("should fail loudly when the supplied wait-target input or candidate containers are malformed", () => {
    expect(() =>
      deriveExecutionSessionWaitTarget(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveExecutionSessionWaitTarget(undefined as never)
    ).toThrow("Execution session wait target input must be an object.");

    expect(() =>
      deriveExecutionSessionWaitTarget({
        candidate: undefined as never
      })
    ).toThrow("Execution session wait target requires candidate to be an object.");

    expect(() =>
      deriveExecutionSessionWaitTarget({
        candidate: {
          context: null,
          readiness: {}
        } as never
      })
    ).toThrow(
      "Execution session wait target requires candidate.context to be an object."
    );

    expect(() =>
      deriveExecutionSessionWaitTarget({
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
      "Execution session wait target requires candidate.readiness to be an object."
    );

    expect(() =>
      deriveExecutionSessionWaitTarget({
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
      "Execution session wait target requires candidate.readiness.canWait to be a boolean."
    );

    expect(() =>
      deriveExecutionSessionWaitTarget({
        candidate: {
          context: {
            record: {
              attemptId: "   ",
              runtime: "codex-cli",
              sessionId: "thr_active"
            }
          },
          readiness: {
            canWait: true
          }
        } as never
      })
    ).toThrow(
      "Execution session wait target requires candidate.context.record.attemptId to be a non-empty string."
    );
  });

  it("should fail closed on inherited or accessor-shaped candidate wrappers", () => {
    const inheritedInput = Object.create({
      candidate: deriveExecutionSessionWaitCandidate({
        view: buildExecutionSessionView([
          createRecord({
            attemptId: "att_inherited_wait_target",
            sessionId: "thr_inherited_wait_target",
            sourceKind: "direct",
            lifecycleState: "active"
          })
        ]),
        selector: {
          attemptId: "att_inherited_wait_target"
        }
      })
    });

    expect(() =>
      deriveExecutionSessionWaitTarget(inheritedInput as never)
    ).toThrow("Execution session wait target requires candidate to be an object.");

    expect(() =>
      deriveExecutionSessionWaitTarget({
        get candidate() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow(ValidationError);
  });

  it("should fail closed on prototype-backed or accessor-backed candidate.context.record identifiers", () => {
    expect(() =>
      deriveExecutionSessionWaitTarget({
        candidate: {
          context: {
            record: Object.assign(
              Object.create({
                attemptId: "att_proto_wait_target"
              }),
              {
                runtime: "codex-cli",
                sessionId: "thr_proto_wait_target"
              }
            )
          },
          readiness: {
            canWait: true
          }
        } as never
      })
    ).toThrow(
      "Execution session wait target requires candidate.context.record.attemptId to be a non-empty string."
    );

    const recordWithAccessor = {
      attemptId: "att_accessor_wait_target",
      sessionId: "thr_accessor_wait_target"
    };
    Object.defineProperty(recordWithAccessor, "runtime", {
      enumerable: true,
      get() {
        throw new Error("runtime getter boom");
      }
    });

    expect(() =>
      deriveExecutionSessionWaitTarget({
        candidate: {
          context: {
            record: recordWithAccessor as never
          },
          readiness: {
            canWait: true
          }
        } as never
      })
    ).toThrow(
      "Execution session wait target requires candidate.context.record.runtime to be a non-empty string."
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
