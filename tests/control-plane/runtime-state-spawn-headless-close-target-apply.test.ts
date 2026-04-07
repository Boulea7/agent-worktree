import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionSpawnHeadlessCloseTarget,
  applyExecutionSessionSpawnHeadlessCloseTargetBatch,
  applyExecutionSessionCloseTarget,
  type ExecutionSessionCloseTarget,
  type ExecutionSessionSpawnHeadlessCloseTarget
} from "../../src/control-plane/internal.js";

describe(
  "control-plane runtime-state spawn-headless-close-target-apply helpers",
  () => {
    it("should return the original wrapper unchanged when no close target is available", async () => {
      const headlessCloseTarget = createHeadlessCloseTarget();
      let invoked = false;

      await expect(
        applyExecutionSessionSpawnHeadlessCloseTarget({
          headlessCloseTarget,
          invokeClose: async () => {
            invoked = true;
          }
        })
      ).resolves.toEqual({
        headlessCloseTarget
      });
      expect(invoked).toBe(false);
    });

    it("should fail loudly when the supplied headless close target wrapper is invalid", async () => {
      await expect(
        applyExecutionSessionSpawnHeadlessCloseTarget({
          headlessCloseTarget: {} as ExecutionSessionSpawnHeadlessCloseTarget,
          invokeClose: async () => undefined
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        applyExecutionSessionSpawnHeadlessCloseTarget({
          headlessCloseTarget: {} as ExecutionSessionSpawnHeadlessCloseTarget,
          invokeClose: async () => undefined
        })
      ).rejects.toThrow(
        "Execution session spawn headless close target apply requires a headlessCloseTarget wrapper."
      );
    });

    it("should reject a malformed nested headless close candidate wrapper", async () => {
      await expect(
        applyExecutionSessionSpawnHeadlessCloseTarget({
          headlessCloseTarget: {
            headlessCloseCandidate: null as never,
            target: {
              attemptId: "att_supported_close",
              runtime: "supported-cli",
              sessionId: "thr_supported_close"
            }
          },
          invokeClose: async () => undefined
        })
      ).rejects.toThrow(
        "Execution session spawn headless close target apply requires headlessCloseTarget.headlessCloseCandidate to be an object."
      );
    });

    it("should reject an empty nested headless close candidate wrapper", async () => {
      await expect(
        applyExecutionSessionSpawnHeadlessCloseTarget({
          headlessCloseTarget: {
            headlessCloseCandidate: {} as never
          },
          invokeClose: async () => undefined
        })
      ).rejects.toThrow(
        "Execution session spawn headless close target apply requires headlessCloseTarget.headlessCloseCandidate to include candidate and headlessContext objects."
      );
    });

    it("should compose an apply result from an available close target without widening the result shape", async () => {
      const headlessCloseTarget = createHeadlessCloseTarget({
        target: {
          attemptId: "att_supported_close",
          runtime: "supported-cli",
          sessionId: "thr_supported_close"
        }
      });
      const snapshot = structuredClone(headlessCloseTarget);
      const result = (await applyExecutionSessionSpawnHeadlessCloseTarget({
        headlessCloseTarget,
        invokeClose: async () => undefined,
        resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
      })) as unknown as Record<string, unknown>;

      expect(headlessCloseTarget).toEqual(snapshot);
      expect(result).toEqual({
        headlessCloseTarget,
        apply: {
          request: {
            attemptId: "att_supported_close",
            runtime: "supported-cli",
            sessionId: "thr_supported_close"
          },
          apply: {
            consumer: {
              request: {
                attemptId: "att_supported_close",
                runtime: "supported-cli",
                sessionId: "thr_supported_close"
              },
              readiness: {
                blockingReasons: [],
                canConsumeClose: true,
                hasBlockingReasons: false,
                sessionLifecycleSupported: true
              }
            },
            consume: {
              request: {
                attemptId: "att_supported_close",
                runtime: "supported-cli",
                sessionId: "thr_supported_close"
              },
              readiness: {
                blockingReasons: [],
                canConsumeClose: true,
                hasBlockingReasons: false,
                sessionLifecycleSupported: true
              },
              invoked: true
            }
          }
        }
      });
      expect(result).not.toHaveProperty("target");
      expect(result).not.toHaveProperty("candidate");
      expect(result).not.toHaveProperty("headlessContext");
      expect(result).not.toHaveProperty("request");
      expect(result).not.toHaveProperty("consumer");
      expect(result).not.toHaveProperty("consume");
    });

    it("should wrap the same apply result as the generic close target helper", async () => {
      const target = {
        attemptId: "att_supported_close",
        runtime: "supported-cli",
        sessionId: "thr_supported_close"
      } satisfies ExecutionSessionCloseTarget;
      const headlessCloseTarget = createHeadlessCloseTarget({
        target
      });

      const wrapped = await applyExecutionSessionSpawnHeadlessCloseTarget({
        headlessCloseTarget,
        invokeClose: async () => undefined,
        resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
      });
      const direct = await applyExecutionSessionCloseTarget({
        target,
        invokeClose: async () => undefined,
        resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
      });

      expect(wrapped).toEqual({
        headlessCloseTarget,
        apply: direct
      });
    });

    it("should preserve batch order while leaving blocked entries in place", async () => {
      const invokedSessionIds: string[] = [];
      const headlessCloseTargetBatch = {
        headlessCloseCandidateBatch: {
          headlessContextBatch: {
            headlessViewBatch: {
              headlessRecordBatch: {
                results: []
              },
              view: buildEmptyView()
            },
            results: []
          },
          results: []
        },
        results: [
          createHeadlessCloseTarget(),
          createHeadlessCloseTarget({
            target: {
              attemptId: "att_supported_close",
              runtime: "supported-cli",
              sessionId: "thr_supported_close"
            }
          })
        ]
      };

      await expect(
        applyExecutionSessionSpawnHeadlessCloseTargetBatch({
          headlessCloseTargetBatch,
          invokeClose: async ({ sessionId }) => {
            invokedSessionIds.push(sessionId);
          },
          resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
        })
      ).resolves.toEqual({
        headlessCloseTargetBatch,
        results: [
          {
            headlessCloseTarget: headlessCloseTargetBatch.results[0]
          },
          {
            headlessCloseTarget: headlessCloseTargetBatch.results[1],
            apply: {
              request: {
                attemptId: "att_supported_close",
                runtime: "supported-cli",
                sessionId: "thr_supported_close"
              },
              apply: {
                consumer: {
                  request: {
                    attemptId: "att_supported_close",
                    runtime: "supported-cli",
                    sessionId: "thr_supported_close"
                  },
                  readiness: {
                    blockingReasons: [],
                    canConsumeClose: true,
                    hasBlockingReasons: false,
                    sessionLifecycleSupported: true
                  }
                },
                consume: {
                  request: {
                    attemptId: "att_supported_close",
                    runtime: "supported-cli",
                    sessionId: "thr_supported_close"
                  },
                  readiness: {
                    blockingReasons: [],
                    canConsumeClose: true,
                    hasBlockingReasons: false,
                    sessionLifecycleSupported: true
                  },
                  invoked: true
                }
              }
            }
          }
        ]
      });
      expect(invokedSessionIds).toEqual(["thr_supported_close"]);
    });

    it("should fail fast when the first batch entry does not provide a headless wrapper", async () => {
      const invokeClose = vi.fn(async () => undefined);

      await expect(
        applyExecutionSessionSpawnHeadlessCloseTargetBatch({
          headlessCloseTargetBatch: {
            headlessCloseCandidateBatch: {
              headlessContextBatch: {
                headlessViewBatch: {
                  headlessRecordBatch: {
                    results: []
                  },
                  view: buildEmptyView()
                },
                results: []
              },
              results: []
            },
            results: [
              {} as ExecutionSessionSpawnHeadlessCloseTarget,
              createHeadlessCloseTarget({
                target: {
                  attemptId: "att_supported_close",
                  runtime: "supported-cli",
                  sessionId: "thr_supported_close"
                }
              })
            ]
          },
          invokeClose,
          resolveSessionLifecycleCapability: () => true
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        applyExecutionSessionSpawnHeadlessCloseTargetBatch({
          headlessCloseTargetBatch: {
            headlessCloseCandidateBatch: {
              headlessContextBatch: {
                headlessViewBatch: {
                  headlessRecordBatch: {
                    results: []
                  },
                  view: buildEmptyView()
                },
                results: []
              },
              results: []
            },
            results: [
              {} as ExecutionSessionSpawnHeadlessCloseTarget,
              createHeadlessCloseTarget({
                target: {
                  attemptId: "att_supported_close",
                  runtime: "supported-cli",
                  sessionId: "thr_supported_close"
                }
              })
            ]
          },
          invokeClose,
          resolveSessionLifecycleCapability: () => true
        })
      ).rejects.toThrow(
        "Execution session spawn headless close target apply requires a headlessCloseTarget wrapper."
      );
      expect(invokeClose).not.toHaveBeenCalled();
    });

    it("should reject malformed headless close target batch wrappers before iterating results", async () => {
      await expect(
        applyExecutionSessionSpawnHeadlessCloseTargetBatch(undefined as never)
      ).rejects.toThrow(
        "Execution session spawn headless close target apply batch input must be an object."
      );
      await expect(
        applyExecutionSessionSpawnHeadlessCloseTargetBatch({
          headlessCloseTargetBatch: undefined as never,
          invokeClose: async () => undefined
        })
      ).rejects.toThrow(
        "Execution session spawn headless close target apply batch requires a headlessCloseTargetBatch wrapper."
      );
      await expect(
        applyExecutionSessionSpawnHeadlessCloseTargetBatch({
          headlessCloseTargetBatch: {
            headlessCloseCandidateBatch: {
              headlessContextBatch: {
                headlessViewBatch: {
                  headlessRecordBatch: {
                    results: []
                  },
                  view: buildEmptyView()
                },
                results: []
              },
              results: []
            },
            results: undefined as never
          },
          invokeClose: async () => undefined
        })
      ).rejects.toThrow(
        "Execution session spawn headless close target apply batch requires headlessCloseTargetBatch.results to be an array."
      );
    });

    it("should fail fast on the first supported invoker error in batch mode", async () => {
      const expectedError = new Error("close failed");
      const invokedSessionIds: string[] = [];

      await expect(
        applyExecutionSessionSpawnHeadlessCloseTargetBatch({
          headlessCloseTargetBatch: {
            headlessCloseCandidateBatch: {
              headlessContextBatch: {
                headlessViewBatch: {
                  headlessRecordBatch: {
                    results: []
                  },
                  view: buildEmptyView()
                },
                results: []
              },
              results: []
            },
            results: [
              createHeadlessCloseTarget({
                target: {
                  attemptId: "att_supported_close_1",
                  runtime: "supported-cli",
                  sessionId: "thr_supported_close_1"
                }
              }),
              createHeadlessCloseTarget({
                target: {
                  attemptId: "att_supported_close_2",
                  runtime: "supported-cli",
                  sessionId: "thr_supported_close_2"
                }
              }),
              createHeadlessCloseTarget({
                target: {
                  attemptId: "att_supported_close_3",
                  runtime: "supported-cli",
                  sessionId: "thr_supported_close_3"
                }
              })
            ]
          },
          invokeClose: async ({ sessionId }) => {
            invokedSessionIds.push(sessionId);

            if (sessionId === "thr_supported_close_2") {
              throw expectedError;
            }
          },
          resolveSessionLifecycleCapability: () => true
        })
      ).rejects.toThrow(expectedError);
      expect(invokedSessionIds).toEqual([
        "thr_supported_close_1",
        "thr_supported_close_2"
      ]);
    });
  }
);

function createHeadlessCloseTarget(
  overrides: Partial<ExecutionSessionSpawnHeadlessCloseTarget> = {}
): ExecutionSessionSpawnHeadlessCloseTarget {
  const record = {
    attemptId: "att_close_child",
    errorEventCount: 0,
    lifecycleState: "active",
    origin: "headless_result",
    runCompleted: false,
    runtime: "codex-cli",
    sessionId: "thr_close_child",
    sourceKind: "delegated"
  } as const;

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
            ...record,
            attemptId: "att_parent",
            sessionId: "thr_parent",
            sourceKind: "direct"
          },
          record,
          selectedBy: "attemptId"
        },
        headlessView: {
          headlessRecord: {
            headlessExecute: {} as never,
            record
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
            ...record,
            attemptId: "att_parent",
            sessionId: "thr_parent",
            sourceKind: "direct"
          },
          record,
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
    },
    ...overrides
  };
}

function buildEmptyView() {
  return {
    childAttemptIdsByParent: new Map<string, string[]>(),
    index: {
      byAttemptId: new Map<string, ExecutionSessionCloseTarget[]>(),
      bySessionId: new Map<string, ExecutionSessionCloseTarget[]>()
    }
  } as never;
}
