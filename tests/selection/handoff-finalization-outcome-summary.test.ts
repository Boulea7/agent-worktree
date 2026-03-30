import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffFinalizationApply,
  AttemptHandoffFinalizationApplyBatch
} from "../../src/selection/types.js";

describe("selection handoff-finalization-outcome-summary helpers", () => {
  it("should return undefined when the supplied finalization apply batch is undefined", () => {
    expect(
      selection.deriveAttemptHandoffFinalizationOutcomeSummary(undefined)
    ).toBeUndefined();
  });

  it("should derive a zero-count summary for an empty apply batch results array", () => {
    expect(
      selection.deriveAttemptHandoffFinalizationOutcomeSummary({
        results: []
      })
    ).toEqual({
      outcomeBasis: "handoff_finalization_apply_batch",
      resultCount: 0,
      invokedResultCount: 0,
      blockedResultCount: 0,
      blockingReasons: [],
      outcomes: []
    });
  });

  it("should fail loudly when batch.results contains sparse array holes", () => {
    const sparseResults = new Array<AttemptHandoffFinalizationApply>(1);

    expect(() =>
      selection.deriveAttemptHandoffFinalizationOutcomeSummary({
        results: sparseResults
      })
    ).toThrow(ValidationError);
    expect(() =>
      selection.deriveAttemptHandoffFinalizationOutcomeSummary({
        results: sparseResults
      })
    ).toThrow(
      "Attempt handoff finalization outcome summary requires batch.results[0] to expose consumer and consume objects."
    );
  });

  it("should fail loudly when batch.results relies on inherited array indexes", () => {
    const inheritedResults = createInheritedIndexApplyArray(
      0,
      createApplyResult({
        request: {
          taskId: "task_shared",
          attemptId: "att_inherited",
          runtime: "codex-cli",
          status: "created",
          sourceKind: undefined
        },
        readiness: {
          blockingReasons: [],
          canConsumeHandoffFinalization: true,
          hasBlockingReasons: false,
          handoffFinalizationSupported: true
        },
        invoked: true
      })
    );

    expect(() =>
      selection.deriveAttemptHandoffFinalizationOutcomeSummary({
        results: inheritedResults
      })
    ).toThrow(ValidationError);
    expect(() =>
      selection.deriveAttemptHandoffFinalizationOutcomeSummary({
        results: inheritedResults
      })
    ).toThrow(
      "Attempt handoff finalization outcome summary requires batch.results[0] to expose consumer and consume objects."
    );
  });

  it("should derive minimal ordered outcomes plus canonical counts from a mixed apply batch", () => {
    const summary = selection.deriveAttemptHandoffFinalizationOutcomeSummary({
      results: [
        createApplyResult({
          request: {
            taskId: "task_shared",
            attemptId: "att_blocked",
            runtime: "blocked-cli",
            status: "created",
            sourceKind: undefined
          },
          readiness: {
            blockingReasons: ["handoff_finalization_unsupported"],
            canConsumeHandoffFinalization: false,
            hasBlockingReasons: true,
            handoffFinalizationSupported: false
          },
          invoked: false
        }),
        createApplyResult({
          request: {
            taskId: "task_shared",
            attemptId: "att_invoked",
            runtime: "codex-cli",
            status: "running",
            sourceKind: "delegated"
          },
          readiness: {
            blockingReasons: [],
            canConsumeHandoffFinalization: true,
            hasBlockingReasons: false,
            handoffFinalizationSupported: true
          },
          invoked: true
        })
      ]
    });

    expect(summary).toEqual({
      outcomeBasis: "handoff_finalization_apply_batch",
      resultCount: 2,
      invokedResultCount: 1,
      blockedResultCount: 1,
      blockingReasons: ["handoff_finalization_unsupported"],
      outcomes: [
        {
          taskId: "task_shared",
          attemptId: "att_blocked",
          runtime: "blocked-cli",
          status: "created",
          sourceKind: undefined,
          invoked: false,
          blockingReasons: ["handoff_finalization_unsupported"]
        },
        {
          taskId: "task_shared",
          attemptId: "att_invoked",
          runtime: "codex-cli",
          status: "running",
          sourceKind: "delegated",
          invoked: true,
          blockingReasons: []
        }
      ]
    });
  });

  it("should fail when consumer and consume requests do not match", () => {
    expect(() =>
      selection.deriveAttemptHandoffFinalizationOutcomeSummary({
        results: [
          createApplyResult({
            request: {
              taskId: "task_shared",
              attemptId: "att_ready",
              runtime: "codex-cli",
              status: "created",
              sourceKind: undefined
            },
            readiness: {
              blockingReasons: [],
              canConsumeHandoffFinalization: true,
              hasBlockingReasons: false,
              handoffFinalizationSupported: true
            },
            invoked: true,
            consumeRequest: {
              taskId: "task_shared",
              attemptId: "att_other",
              runtime: "codex-cli",
              status: "created",
              sourceKind: undefined
            }
          })
        ]
      })
    ).toThrow(ValidationError);
    expect(() =>
      selection.deriveAttemptHandoffFinalizationOutcomeSummary({
        results: [
          createApplyResult({
            request: {
              taskId: "task_shared",
              attemptId: "att_ready",
              runtime: "codex-cli",
              status: "created",
              sourceKind: undefined
            },
            readiness: {
              blockingReasons: [],
              canConsumeHandoffFinalization: true,
              hasBlockingReasons: false,
              handoffFinalizationSupported: true
            },
            invoked: true,
            consumeRequest: {
              taskId: "task_shared",
              attemptId: "att_other",
              runtime: "codex-cli",
              status: "created",
              sourceKind: undefined
            }
          })
        ]
      })
    ).toThrow(
      "Attempt handoff finalization outcome summary requires entry.consume.request to match entry.consumer.request."
    );
  });

  it("should fail when consumer and consume readiness do not match", () => {
    expect(() =>
      selection.deriveAttemptHandoffFinalizationOutcomeSummary({
        results: [
          createApplyResult({
            request: {
              taskId: "task_shared",
              attemptId: "att_ready",
              runtime: "codex-cli",
              status: "created",
              sourceKind: undefined
            },
            readiness: {
              blockingReasons: [],
              canConsumeHandoffFinalization: true,
              hasBlockingReasons: false,
              handoffFinalizationSupported: true
            },
            invoked: true,
            consumeReadiness: {
              blockingReasons: ["handoff_finalization_unsupported"],
              canConsumeHandoffFinalization: false,
              hasBlockingReasons: true,
              handoffFinalizationSupported: false
            }
          })
        ]
      })
    ).toThrow(ValidationError);
  });

  it("should fail when matching readiness still violates the canonical finalization readiness contract", () => {
    expect(() =>
      selection.deriveAttemptHandoffFinalizationOutcomeSummary({
        results: [
          createApplyResult({
            request: {
              taskId: "task_shared",
              attemptId: "att_ready",
              runtime: "codex-cli",
              status: "created",
              sourceKind: undefined
            },
            readiness: {
              blockingReasons: [],
              canConsumeHandoffFinalization: false,
              hasBlockingReasons: false,
              handoffFinalizationSupported: false
            },
            invoked: true
          })
        ]
      })
    ).toThrow(ValidationError);
    expect(() =>
      selection.deriveAttemptHandoffFinalizationOutcomeSummary({
        results: [
          createApplyResult({
            request: {
              taskId: "task_shared",
              attemptId: "att_ready",
              runtime: "codex-cli",
              status: "created",
              sourceKind: undefined
            },
            readiness: {
              blockingReasons: [],
              canConsumeHandoffFinalization: false,
              hasBlockingReasons: false,
              handoffFinalizationSupported: false
            },
            invoked: true
          })
        ]
      })
    ).toThrow(
      "Attempt handoff finalization outcome summary requires entry.consumer.readiness.canConsumeHandoffFinalization to match whether blockingReasons is empty."
    );
  });

  it("should fail with ValidationError when a request shape is missing", () => {
    expect(() =>
      selection.deriveAttemptHandoffFinalizationOutcomeSummary({
        results: [
          {
            consumer: {
              request: undefined,
              readiness: {
                blockingReasons: [],
                canConsumeHandoffFinalization: true,
                hasBlockingReasons: false,
                handoffFinalizationSupported: true
              }
            },
            consume: {
              request: undefined,
              readiness: {
                blockingReasons: [],
                canConsumeHandoffFinalization: true,
                hasBlockingReasons: false,
                handoffFinalizationSupported: true
              },
              invoked: true
            }
          } as unknown as AttemptHandoffFinalizationApply
        ]
      })
    ).toThrow(ValidationError);
    expect(() =>
      selection.deriveAttemptHandoffFinalizationOutcomeSummary({
        results: [
          {
            consumer: {
              request: undefined,
              readiness: {
                blockingReasons: [],
                canConsumeHandoffFinalization: true,
                hasBlockingReasons: false,
                handoffFinalizationSupported: true
              }
            },
            consume: {
              request: undefined,
              readiness: {
                blockingReasons: [],
                canConsumeHandoffFinalization: true,
                hasBlockingReasons: false,
                handoffFinalizationSupported: true
              },
              invoked: true
            }
          } as unknown as AttemptHandoffFinalizationApply
        ]
      })
    ).toThrow(
      "Attempt handoff finalization outcome summary requires entry.consumer.request to be an object."
    );
  });

  it("should keep the outcome summary shape minimal without leaking apply internals", () => {
    const summary = selection.deriveAttemptHandoffFinalizationOutcomeSummary({
      results: [
        {
          ...createApplyResult({
            request: {
              taskId: "task_shared",
              attemptId: "att_ready",
              runtime: "codex-cli",
              status: "created",
              sourceKind: undefined
            },
            readiness: {
              blockingReasons: [],
              canConsumeHandoffFinalization: true,
              hasBlockingReasons: false,
              handoffFinalizationSupported: true
            },
            invoked: true
          }),
          queue: { name: "default" },
          manifest: { attemptId: "att_ready" },
          report: { resultCount: 1 },
          event: { kind: "handoff_finalization_requested" }
        } as AttemptHandoffFinalizationApply
      ]
    }) as unknown as Record<string, unknown>;

    expect(Object.keys(summary).sort()).toEqual(
      [
        "blockedResultCount",
        "blockingReasons",
        "invokedResultCount",
        "outcomeBasis",
        "outcomes",
        "resultCount"
      ].sort()
    );
    expect(
      Object.keys((summary.outcomes as Array<Record<string, unknown>>)[0]!).sort()
    ).toEqual(
      [
        "attemptId",
        "blockingReasons",
        "invoked",
        "runtime",
        "sourceKind",
        "status",
        "taskId"
      ].sort()
    );
  });

  it("should summarize the current request-summary apply chain without widening the contract", async () => {
    const applyBatch =
      await selection.applyAttemptHandoffFinalizationRequestSummary({
        summary: {
          requestBasis: "handoff_finalization_target_summary",
          resultCount: 1,
          invokedResultCount: 1,
          blockedResultCount: 0,
          blockingReasons: [],
          canFinalizeHandoff: true,
          requests: [
            {
              taskId: "task_shared",
              attemptId: "att_supported",
              runtime: "codex-cli",
              status: "created",
              sourceKind: undefined
            }
          ]
        },
        invokeHandoffFinalization: async () => undefined,
        resolveHandoffFinalizationCapability: () => true
      });

    expect(
      selection.deriveAttemptHandoffFinalizationOutcomeSummary(applyBatch)
    ).toEqual({
      outcomeBasis: "handoff_finalization_apply_batch",
      resultCount: 1,
      invokedResultCount: 1,
      blockedResultCount: 0,
      blockingReasons: [],
      outcomes: [
        {
          taskId: "task_shared",
          attemptId: "att_supported",
          runtime: "codex-cli",
          status: "created",
          sourceKind: undefined,
          invoked: true,
          blockingReasons: []
        }
      ]
    });
  });
});

function createApplyResult(input: {
  request: AttemptHandoffFinalizationApply["consumer"]["request"];
  readiness: AttemptHandoffFinalizationApply["consumer"]["readiness"];
  invoked: boolean;
  consumeRequest?: AttemptHandoffFinalizationApply["consume"]["request"];
  consumeReadiness?: AttemptHandoffFinalizationApply["consume"]["readiness"];
}): AttemptHandoffFinalizationApply {
  return {
    consumer: {
      request: { ...input.request },
      readiness: { ...input.readiness }
    },
    consume: {
      request: { ...(input.consumeRequest ?? input.request) },
      readiness: { ...(input.consumeReadiness ?? input.readiness) },
      invoked: input.invoked
    }
  };
}

function createInheritedIndexApplyArray(
  index: number,
  value: AttemptHandoffFinalizationApply
): AttemptHandoffFinalizationApply[] {
  const inheritedIndexPrototype = Object.create(Array.prototype, {
    [index]: {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    }
  });
  const results = new Array<AttemptHandoffFinalizationApply>(index + 1);
  Object.setPrototypeOf(results, inheritedIndexPrototype);
  return results;
}
