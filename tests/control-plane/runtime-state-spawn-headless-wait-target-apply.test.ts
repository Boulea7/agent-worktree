import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionSpawnHeadlessWaitTarget,
  applyExecutionSessionSpawnHeadlessWaitTargetBatch,
  applyExecutionSessionWaitTarget,
  type ExecutionSessionSpawnHeadlessWaitTarget,
  type ExecutionSessionWaitTarget
} from "../../src/control-plane/internal.js";

describe(
  "control-plane runtime-state spawn-headless-wait-target-apply helpers",
  () => {
    it("should fail loudly when the top-level wait target apply input is malformed", async () => {
      await expect(
        applyExecutionSessionSpawnHeadlessWaitTarget(undefined as never)
      ).rejects.toThrow(ValidationError);
      await expect(
        applyExecutionSessionSpawnHeadlessWaitTarget(undefined as never)
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply input must be an object."
      );
    });

    it("should return the original wrapper unchanged when no wait target is available", async () => {
      const headlessWaitTarget = createHeadlessWaitTarget();
      let invoked = false;

      await expect(
        applyExecutionSessionSpawnHeadlessWaitTarget({
          headlessWaitTarget,
          invokeWait: async () => {
            invoked = true;
          }
        })
      ).resolves.toEqual({
        headlessWaitTarget
      });
      expect(invoked).toBe(false);
    });

    it("should fail loudly when the supplied headless wait target wrapper is invalid", async () => {
      await expect(
        applyExecutionSessionSpawnHeadlessWaitTarget({
          headlessWaitTarget: {} as ExecutionSessionSpawnHeadlessWaitTarget,
          invokeWait: async () => undefined
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        applyExecutionSessionSpawnHeadlessWaitTarget({
          headlessWaitTarget: {} as ExecutionSessionSpawnHeadlessWaitTarget,
          invokeWait: async () => undefined
        })
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply requires a headlessWaitTarget wrapper."
      );
    });

    it("should reject wrapper-level targets that come only from the prototype chain", async () => {
      const canonicalTarget = createHeadlessWaitTarget({
        target: {
          attemptId: "att_proto_wait_apply",
          runtime: "supported-cli",
          sessionId: "thr_proto_wait_apply"
        }
      });
      const headlessWaitTarget = Object.create({
        target: canonicalTarget.target
      });
      headlessWaitTarget.headlessWaitCandidate =
        canonicalTarget.headlessWaitCandidate;

      await expect(
        applyExecutionSessionSpawnHeadlessWaitTarget({
          headlessWaitTarget,
          invokeWait: async () => undefined
        } as never)
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply requires headlessWaitTarget.target to be an object when provided."
      );
    });

    it("should reject wrapper-level targets whose getter throws", async () => {
      const canonicalTarget = createHeadlessWaitTarget({
        target: {
          attemptId: "att_accessor_wait_apply",
          runtime: "supported-cli",
          sessionId: "thr_accessor_wait_apply"
        }
      });
      const headlessWaitTarget = {
        headlessWaitCandidate: canonicalTarget.headlessWaitCandidate
      };
      Object.defineProperty(headlessWaitTarget, "target", {
        enumerable: true,
        get() {
          throw new Error("boom");
        }
      });

      await expect(
        applyExecutionSessionSpawnHeadlessWaitTarget({
          headlessWaitTarget,
          invokeWait: async () => undefined
        } as never)
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply requires headlessWaitTarget.target to be an object when provided."
      );
    });

    it("should reject a malformed nested headless wait candidate wrapper", async () => {
      await expect(
        applyExecutionSessionSpawnHeadlessWaitTarget({
          headlessWaitTarget: {
            headlessWaitCandidate: null as never,
            target: {
              attemptId: "att_supported_wait",
              runtime: "supported-cli",
              sessionId: "thr_supported_wait"
            }
          },
          invokeWait: async () => undefined
        })
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply requires headlessWaitTarget.headlessWaitCandidate to be an object."
      );
    });

    it("should reject an empty nested headless wait candidate wrapper", async () => {
      await expect(
        applyExecutionSessionSpawnHeadlessWaitTarget({
          headlessWaitTarget: {
            headlessWaitCandidate: {} as never
          },
          invokeWait: async () => undefined
        })
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply requires headlessWaitTarget.headlessWaitCandidate to include candidate and headlessContext objects."
      );
    });

    it("should reject malformed headlessContext companions before invoking wait", async () => {
      const invokeWait = vi.fn(async () => undefined);

      await expect(
        applyExecutionSessionSpawnHeadlessWaitTarget({
          headlessWaitTarget: {
            headlessWaitCandidate: {
              candidate: {} as never,
              headlessContext: {} as never
            }
          } as ExecutionSessionSpawnHeadlessWaitTarget,
          invokeWait
        })
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply requires headlessWaitTarget.headlessWaitCandidate.headlessContext to include context and headlessView objects."
      );
      expect(invokeWait).not.toHaveBeenCalled();
    });

    it("should compose an apply result from an available wait target without widening the result shape", async () => {
      const headlessWaitTarget = createHeadlessWaitTarget({
        target: {
          attemptId: "att_supported_wait",
          runtime: "supported-cli",
          sessionId: "thr_supported_wait"
        }
      });
      const snapshot = structuredClone(headlessWaitTarget);
      const result = (await applyExecutionSessionSpawnHeadlessWaitTarget({
        headlessWaitTarget,
        timeoutMs: 250,
        invokeWait: async () => undefined,
        resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
      })) as unknown as Record<string, unknown>;

      expect(headlessWaitTarget).toEqual(snapshot);
      expect(result).toEqual({
        headlessWaitTarget,
        apply: {
          request: {
            attemptId: "att_supported_wait",
            runtime: "supported-cli",
            sessionId: "thr_supported_wait",
            timeoutMs: 250
          },
          apply: {
            consumer: {
              request: {
                attemptId: "att_supported_wait",
                runtime: "supported-cli",
                sessionId: "thr_supported_wait",
                timeoutMs: 250
              },
              readiness: {
                blockingReasons: [],
                canConsumeWait: true,
                hasBlockingReasons: false,
                sessionLifecycleSupported: true
              }
            },
            consume: {
              request: {
                attemptId: "att_supported_wait",
                runtime: "supported-cli",
                sessionId: "thr_supported_wait",
                timeoutMs: 250
              },
              readiness: {
                blockingReasons: [],
                canConsumeWait: true,
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

    it("should wrap the same apply result as the generic wait target helper", async () => {
      const target = {
        attemptId: "att_supported_wait",
        runtime: "supported-cli",
        sessionId: "thr_supported_wait"
      } satisfies ExecutionSessionWaitTarget;
      const headlessWaitTarget = createHeadlessWaitTarget({
        target
      });

      const wrapped = await applyExecutionSessionSpawnHeadlessWaitTarget({
        headlessWaitTarget,
        timeoutMs: 250,
        invokeWait: async () => undefined,
        resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
      });
      const direct = await applyExecutionSessionWaitTarget({
        target,
        timeoutMs: 250,
        invokeWait: async () => undefined,
        resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
      });

      expect(wrapped).toEqual({
        headlessWaitTarget,
        apply: direct
      });
    });

    it("should preserve batch order while leaving blocked entries in place", async () => {
      const invokedSessionIds: string[] = [];
      const headlessWaitTargetBatch = {
        headlessWaitCandidateBatch: {
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
          createHeadlessWaitTarget(),
          createHeadlessWaitTarget({
            target: {
              attemptId: "att_supported_wait",
              runtime: "supported-cli",
              sessionId: "thr_supported_wait"
            }
          })
        ]
      };

      await expect(
        applyExecutionSessionSpawnHeadlessWaitTargetBatch({
          headlessWaitTargetBatch,
          timeoutMs: 500,
          invokeWait: async ({ sessionId }) => {
            invokedSessionIds.push(sessionId);
          },
          resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
        })
      ).resolves.toEqual({
        headlessWaitTargetBatch,
        results: [
          {
            headlessWaitTarget: headlessWaitTargetBatch.results[0]
          },
          {
            headlessWaitTarget: headlessWaitTargetBatch.results[1],
            apply: {
              request: {
                attemptId: "att_supported_wait",
                runtime: "supported-cli",
                sessionId: "thr_supported_wait",
                timeoutMs: 500
              },
              apply: {
                consumer: {
                  request: {
                    attemptId: "att_supported_wait",
                    runtime: "supported-cli",
                    sessionId: "thr_supported_wait",
                    timeoutMs: 500
                  },
                  readiness: {
                    blockingReasons: [],
                    canConsumeWait: true,
                    hasBlockingReasons: false,
                    sessionLifecycleSupported: true
                  }
                },
                consume: {
                  request: {
                    attemptId: "att_supported_wait",
                    runtime: "supported-cli",
                    sessionId: "thr_supported_wait",
                    timeoutMs: 500
                  },
                  readiness: {
                    blockingReasons: [],
                    canConsumeWait: true,
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
      expect(invokedSessionIds).toEqual(["thr_supported_wait"]);
    });

    it("should fail fast when the first batch entry does not provide a headless wrapper", async () => {
      const invokeWait = vi.fn(async () => undefined);

      await expect(
        applyExecutionSessionSpawnHeadlessWaitTargetBatch({
          headlessWaitTargetBatch: {
            headlessWaitCandidateBatch: {
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
              {} as ExecutionSessionSpawnHeadlessWaitTarget,
              createHeadlessWaitTarget({
                target: {
                  attemptId: "att_supported_wait",
                  runtime: "supported-cli",
                  sessionId: "thr_supported_wait"
                }
              })
            ]
          },
          invokeWait,
          resolveSessionLifecycleCapability: () => true
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        applyExecutionSessionSpawnHeadlessWaitTargetBatch({
          headlessWaitTargetBatch: {
            headlessWaitCandidateBatch: {
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
              {} as ExecutionSessionSpawnHeadlessWaitTarget,
              createHeadlessWaitTarget({
                target: {
                  attemptId: "att_supported_wait",
                  runtime: "supported-cli",
                  sessionId: "thr_supported_wait"
                }
              })
            ]
          },
          invokeWait,
          resolveSessionLifecycleCapability: () => true
        })
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply requires a headlessWaitTarget wrapper."
      );
      expect(invokeWait).not.toHaveBeenCalled();
    });

    it("should reject malformed headless wait target batch wrappers before iterating results", async () => {
      await expect(
        applyExecutionSessionSpawnHeadlessWaitTargetBatch(undefined as never)
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply batch input must be an object."
      );
      await expect(
        applyExecutionSessionSpawnHeadlessWaitTargetBatch({
          headlessWaitTargetBatch: undefined as never,
          invokeWait: async () => undefined
        })
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply batch requires a headlessWaitTargetBatch wrapper."
      );
      await expect(
        applyExecutionSessionSpawnHeadlessWaitTargetBatch({
          headlessWaitTargetBatch: {
            headlessWaitCandidateBatch: {
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
          invokeWait: async () => undefined
        })
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply batch requires headlessWaitTargetBatch.results to be an array."
      );
    });

    it("should reject inherited or getter-backed top-level headlessWaitTargetBatch wrappers", async () => {
      const validBatch = {
        headlessWaitCandidateBatch: {
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
        results: []
      };
      const inheritedInput = Object.create({
        headlessWaitTargetBatch: validBatch
      });
      inheritedInput.invokeWait = async () => undefined;

      await expect(
        applyExecutionSessionSpawnHeadlessWaitTargetBatch(inheritedInput as never)
      ).rejects.toThrow(ValidationError);
      await expect(
        applyExecutionSessionSpawnHeadlessWaitTargetBatch(inheritedInput as never)
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply batch requires a headlessWaitTargetBatch wrapper."
      );

      const accessorInput = {
        invokeWait: async () => undefined
      };
      Object.defineProperty(accessorInput, "headlessWaitTargetBatch", {
        enumerable: true,
        get() {
          throw new Error("boom");
        }
      });

      await expect(
        applyExecutionSessionSpawnHeadlessWaitTargetBatch(accessorInput as never)
      ).rejects.toThrow(ValidationError);
      await expect(
        applyExecutionSessionSpawnHeadlessWaitTargetBatch(accessorInput as never)
      ).rejects.toThrow(
        "Execution session spawn headless wait target apply batch requires a headlessWaitTargetBatch wrapper."
      );
    });

    it("should snapshot invokeWait once for the whole batch", async () => {
      let invokeWaitReads = 0;
      const invokedSessionIds: string[] = [];

      await expect(
        applyExecutionSessionSpawnHeadlessWaitTargetBatch({
          headlessWaitTargetBatch: {
            headlessWaitCandidateBatch: {
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
              createHeadlessWaitTarget({
                target: {
                  attemptId: "att_snapshot_wait_1",
                  runtime: "supported-cli",
                  sessionId: "thr_snapshot_wait_1"
                }
              }),
              createHeadlessWaitTarget({
                target: {
                  attemptId: "att_snapshot_wait_2",
                  runtime: "supported-cli",
                  sessionId: "thr_snapshot_wait_2"
                }
              })
            ]
          },
          get invokeWait() {
            invokeWaitReads += 1;

            if (invokeWaitReads > 1) {
              throw new Error("invokeWait getter read twice");
            }

            return async ({ sessionId }: { sessionId: string }) => {
              invokedSessionIds.push(sessionId);
            };
          },
          resolveSessionLifecycleCapability: () => true
        } as never)
      ).resolves.toMatchObject({
        results: [
          {
            apply: {
              apply: {
                consume: {
                  invoked: true
                }
              }
            }
          },
          {
            apply: {
              apply: {
                consume: {
                  invoked: true
                }
              }
            }
          }
        ]
      });
      expect(invokeWaitReads).toBe(1);
      expect(invokedSessionIds).toEqual([
        "thr_snapshot_wait_1",
        "thr_snapshot_wait_2"
      ]);
    });

    it("should fail fast on the first supported invoker error in batch mode", async () => {
      const expectedError = new Error("wait failed");
      const invokedSessionIds: string[] = [];

      await expect(
        applyExecutionSessionSpawnHeadlessWaitTargetBatch({
          headlessWaitTargetBatch: {
            headlessWaitCandidateBatch: {
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
              createHeadlessWaitTarget({
                target: {
                  attemptId: "att_supported_wait_1",
                  runtime: "supported-cli",
                  sessionId: "thr_supported_wait_1"
                }
              }),
              createHeadlessWaitTarget({
                target: {
                  attemptId: "att_supported_wait_2",
                  runtime: "supported-cli",
                  sessionId: "thr_supported_wait_2"
                }
              }),
              createHeadlessWaitTarget({
                target: {
                  attemptId: "att_supported_wait_3",
                  runtime: "supported-cli",
                  sessionId: "thr_supported_wait_3"
                }
              })
            ]
          },
          invokeWait: async ({ sessionId }) => {
            invokedSessionIds.push(sessionId);

            if (sessionId === "thr_supported_wait_2") {
              throw expectedError;
            }
          },
          resolveSessionLifecycleCapability: () => true
        })
      ).rejects.toThrow(expectedError);
      expect(invokedSessionIds).toEqual([
        "thr_supported_wait_1",
        "thr_supported_wait_2"
      ]);
    });
  }
);

function createHeadlessWaitTarget(
  overrides: Partial<ExecutionSessionSpawnHeadlessWaitTarget> = {}
): ExecutionSessionSpawnHeadlessWaitTarget {
  const record = {
    attemptId: "att_wait_child",
    errorEventCount: 0,
    lifecycleState: "active",
    origin: "headless_result",
    runCompleted: false,
    runtime: "codex-cli",
    sessionId: "thr_wait_child",
    sourceKind: "delegated"
  } as const;

  return {
    headlessWaitCandidate: {
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
          blockingReasons: ["descendant_coverage_incomplete"],
          canWait: false,
          hasBlockingReasons: true
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
      byAttemptId: new Map<string, ExecutionSessionWaitTarget[]>(),
      bySessionId: new Map<string, ExecutionSessionWaitTarget[]>()
    }
  } as never;
}
