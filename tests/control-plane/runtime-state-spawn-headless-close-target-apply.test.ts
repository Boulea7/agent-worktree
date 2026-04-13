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
    it("should fail loudly when the top-level close target apply input is malformed", async () => {
      await expect(
        applyExecutionSessionSpawnHeadlessCloseTarget(undefined as never)
      ).rejects.toThrow(ValidationError);
      await expect(
        applyExecutionSessionSpawnHeadlessCloseTarget(undefined as never)
      ).rejects.toThrow(
        "Execution session spawn headless close target apply input must be an object."
      );
    });

    it("should reject inherited or getter-backed top-level headlessCloseTarget inputs", async () => {
      const canonicalTarget = createHeadlessCloseTarget({
        target: {
          attemptId: "att_top_level_close_apply",
          runtime: "supported-cli",
          sessionId: "thr_top_level_close_apply"
        }
      });
      const inheritedInput = Object.create({
        headlessCloseTarget: canonicalTarget
      });
      inheritedInput.invokeClose = async () => undefined;

      await expect(
        applyExecutionSessionSpawnHeadlessCloseTarget(inheritedInput as never)
      ).rejects.toThrow(
        "Execution session spawn headless close target apply requires a headlessCloseTarget wrapper."
      );

      const accessorInput = {
        invokeClose: async () => undefined
      };
      Object.defineProperty(accessorInput, "headlessCloseTarget", {
        enumerable: true,
        get() {
          throw new Error("boom");
        }
      });

      await expect(
        applyExecutionSessionSpawnHeadlessCloseTarget(accessorInput as never)
      ).rejects.toThrow(
        "Execution session spawn headless close target apply requires a headlessCloseTarget wrapper."
      );
    });

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

    it("should reject wrapper-level targets that come only from the prototype chain", async () => {
      const canonicalTarget = createHeadlessCloseTarget({
        target: {
          attemptId: "att_proto_close_apply",
          runtime: "supported-cli",
          sessionId: "thr_proto_close_apply"
        }
      });
      const headlessCloseTarget = Object.create({
        target: canonicalTarget.target
      });
      headlessCloseTarget.headlessCloseCandidate =
        canonicalTarget.headlessCloseCandidate;

      await expect(
        applyExecutionSessionSpawnHeadlessCloseTarget({
          headlessCloseTarget,
          invokeClose: async () => undefined
        } as never)
      ).rejects.toThrow(
        "Execution session spawn headless close target apply requires headlessCloseTarget.target to be an object when provided."
      );
    });

    it("should reject wrapper-level targets whose getter throws", async () => {
      const canonicalTarget = createHeadlessCloseTarget({
        target: {
          attemptId: "att_accessor_close_apply",
          runtime: "supported-cli",
          sessionId: "thr_accessor_close_apply"
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

      await expect(
        applyExecutionSessionSpawnHeadlessCloseTarget({
          headlessCloseTarget,
          invokeClose: async () => undefined
        } as never)
      ).rejects.toThrow(
        "Execution session spawn headless close target apply requires headlessCloseTarget.target to be an object when provided."
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

    it("should reject malformed headlessContext companions before invoking close", async () => {
      const invokeClose = vi.fn(async () => undefined);

      await expect(
        applyExecutionSessionSpawnHeadlessCloseTarget({
          headlessCloseTarget: {
            headlessCloseCandidate: {
              candidate: {} as never,
              headlessContext: {} as never
            }
          } as ExecutionSessionSpawnHeadlessCloseTarget,
          invokeClose
        })
      ).rejects.toThrow(
        "Execution session spawn headless close target apply requires headlessCloseTarget.headlessCloseCandidate.headlessContext to include context and headlessView objects."
      );
      expect(invokeClose).not.toHaveBeenCalled();
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

    it("should snapshot headlessCloseTargetBatch.results once before applying the batch", async () => {
      let resultsReads = 0;
      const supportedTarget = createHeadlessCloseTarget({
        target: {
          attemptId: "att_supported_close_apply_results_once",
          runtime: "supported-cli",
          sessionId: "thr_supported_close_apply_results_once"
        }
      });

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
            get results() {
              resultsReads += 1;

              if (resultsReads > 1) {
                throw new Error("results getter read twice");
              }

              return [supportedTarget];
            }
          } as never,
          invokeClose: async () => undefined,
          resolveSessionLifecycleCapability: (runtime) => runtime === "supported-cli"
        })
      ).resolves.toEqual({
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
          results: [supportedTarget]
        },
        results: [
          {
            headlessCloseTarget: supportedTarget,
            apply: {
              request: {
                attemptId: "att_supported_close_apply_results_once",
                runtime: "supported-cli",
                sessionId: "thr_supported_close_apply_results_once"
              },
              apply: {
                consumer: {
                  request: {
                    attemptId: "att_supported_close_apply_results_once",
                    runtime: "supported-cli",
                    sessionId: "thr_supported_close_apply_results_once"
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
                    attemptId: "att_supported_close_apply_results_once",
                    runtime: "supported-cli",
                    sessionId: "thr_supported_close_apply_results_once"
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
      expect(resultsReads).toBe(1);
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

    it("should reject inherited or getter-backed top-level headlessCloseTargetBatch wrappers", async () => {
      const validBatch = {
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
        results: []
      };
      const inheritedInput = Object.create({
        headlessCloseTargetBatch: validBatch
      });
      inheritedInput.invokeClose = async () => undefined;

      await expect(
        applyExecutionSessionSpawnHeadlessCloseTargetBatch(inheritedInput as never)
      ).rejects.toThrow(ValidationError);
      await expect(
        applyExecutionSessionSpawnHeadlessCloseTargetBatch(inheritedInput as never)
      ).rejects.toThrow(
        "Execution session spawn headless close target apply batch requires a headlessCloseTargetBatch wrapper."
      );

      const accessorInput = {
        invokeClose: async () => undefined
      };
      Object.defineProperty(accessorInput, "headlessCloseTargetBatch", {
        enumerable: true,
        get() {
          throw new Error("boom");
        }
      });

      await expect(
        applyExecutionSessionSpawnHeadlessCloseTargetBatch(accessorInput as never)
      ).rejects.toThrow(ValidationError);
      await expect(
        applyExecutionSessionSpawnHeadlessCloseTargetBatch(accessorInput as never)
      ).rejects.toThrow(
        "Execution session spawn headless close target apply batch requires a headlessCloseTargetBatch wrapper."
      );
    });

    it("should snapshot invokeClose once for the whole batch", async () => {
      let invokeCloseReads = 0;
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
                  attemptId: "att_snapshot_close_1",
                  runtime: "supported-cli",
                  sessionId: "thr_snapshot_close_1"
                }
              }),
              createHeadlessCloseTarget({
                target: {
                  attemptId: "att_snapshot_close_2",
                  runtime: "supported-cli",
                  sessionId: "thr_snapshot_close_2"
                }
              })
            ]
          },
          get invokeClose() {
            invokeCloseReads += 1;

            if (invokeCloseReads > 1) {
              throw new Error("invokeClose getter read twice");
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
      expect(invokeCloseReads).toBe(1);
      expect(invokedSessionIds).toEqual([
        "thr_snapshot_close_1",
        "thr_snapshot_close_2"
      ]);
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
