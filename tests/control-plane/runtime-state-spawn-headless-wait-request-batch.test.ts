import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionSpawnHeadlessWaitRequestBatch,
  type ExecutionSessionSpawnHeadlessWaitTarget,
  type ExecutionSessionSpawnHeadlessWaitTargetBatch
} from "../../src/control-plane/internal.js";

describe(
  "control-plane runtime-state spawn-headless-wait-request-batch helpers",
  () => {
    it("should return an empty ordered result list for an empty headless wait-target batch", () => {
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
        results: []
      } satisfies ExecutionSessionSpawnHeadlessWaitTargetBatch;

      expect(
        deriveExecutionSessionSpawnHeadlessWaitRequestBatch({
          headlessWaitTargetBatch
        })
      ).toEqual({
        headlessWaitTargetBatch,
        results: []
      });
    });

    it("should preserve ordering while keeping blocked headless wait targets in place", () => {
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

      expect(
        deriveExecutionSessionSpawnHeadlessWaitRequestBatch({
          headlessWaitTargetBatch,
          timeoutMs: 500
        })
      ).toEqual({
        headlessWaitTargetBatch,
        results: [
          {
            headlessWaitTarget: headlessWaitTargetBatch.results[0]
          },
          {
            headlessWaitTarget: headlessWaitTargetBatch.results[1],
            request: {
              attemptId: "att_supported_wait",
              runtime: "supported-cli",
              sessionId: "thr_supported_wait",
              timeoutMs: 500
            }
          }
        ]
      });
    });

    it("should reject malformed headless wait request batch wrappers", () => {
      expect(() =>
        deriveExecutionSessionSpawnHeadlessWaitRequestBatch(undefined as never)
      ).toThrow(
        "Execution session spawn headless wait request batch input must be an object."
      );
      expect(() =>
        deriveExecutionSessionSpawnHeadlessWaitRequestBatch({
          headlessWaitTargetBatch: undefined as never
        })
      ).toThrow(ValidationError);
      expect(() =>
        deriveExecutionSessionSpawnHeadlessWaitRequestBatch({
          headlessWaitTargetBatch: undefined as never
        })
      ).toThrow(
        "Execution session spawn headless wait request batch requires a headlessWaitTargetBatch wrapper."
      );
    });

    it("should fail loudly when headlessWaitTargetBatch.results entries are sparse or non-object", () => {
      const sparseResults = new Array(1);

      expect(() =>
        deriveExecutionSessionSpawnHeadlessWaitRequestBatch({
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
            results: sparseResults
          } as never
        })
      ).toThrow(
        "Execution session spawn headless wait request batch requires headlessWaitTargetBatch.results entries to be objects."
      );

      expect(() =>
        deriveExecutionSessionSpawnHeadlessWaitRequestBatch({
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
            results: [0]
          } as never
        })
      ).toThrow(
        "Execution session spawn headless wait request batch requires headlessWaitTargetBatch.results entries to be objects."
      );
    });

    it("should fail fast on the first malformed wrapped headless wait target and stop before later entries", () => {
      let tailAccessed = false;

      expect(() =>
        deriveExecutionSessionSpawnHeadlessWaitRequestBatch({
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
              {} as ExecutionSessionSpawnHeadlessWaitTarget,
              {
                get headlessWaitCandidate() {
                  tailAccessed = true;
                  return createHeadlessWaitTarget().headlessWaitCandidate;
                }
              } as ExecutionSessionSpawnHeadlessWaitTarget
            ]
          }
        })
      ).toThrow(
        "Execution session spawn headless wait request requires a headlessWaitTarget wrapper."
      );
      expect(tailAccessed).toBe(false);
    });

    it("should fail fast when the first wrapped headless wait target omits candidate or headlessContext", () => {
      let tailAccessed = false;

      expect(() =>
        deriveExecutionSessionSpawnHeadlessWaitRequestBatch({
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
              {
                headlessWaitCandidate: {} as never
              } as ExecutionSessionSpawnHeadlessWaitTarget,
              {
                get headlessWaitCandidate() {
                  tailAccessed = true;
                  return createHeadlessWaitTarget().headlessWaitCandidate;
                }
              } as ExecutionSessionSpawnHeadlessWaitTarget
            ]
          }
        })
      ).toThrow(
        "Execution session spawn headless wait request requires headlessWaitTarget.headlessWaitCandidate to include candidate and headlessContext objects."
      );
      expect(tailAccessed).toBe(false);
    });
  }
);

function createHeadlessWaitTarget(
  overrides: Partial<ExecutionSessionSpawnHeadlessWaitTarget> = {}
): ExecutionSessionSpawnHeadlessWaitTarget {
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
            attemptId: "att_wait_child",
            errorEventCount: 0,
            lifecycleState: "active",
            origin: "headless_result",
            runCompleted: false,
            runtime: "codex-cli",
            sessionId: "thr_wait_child",
            sourceKind: "delegated"
          },
          selectedBy: "attemptId"
        },
        headlessView: {
          headlessRecord: {
            headlessExecute: {} as never,
            record: {
              attemptId: "att_wait_child",
              errorEventCount: 0,
              lifecycleState: "active",
              origin: "headless_result",
              runCompleted: false,
              runtime: "codex-cli",
              sessionId: "thr_wait_child",
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
            attemptId: "att_wait_child",
            errorEventCount: 0,
            lifecycleState: "active",
            origin: "headless_result",
            runCompleted: false,
            runtime: "codex-cli",
            sessionId: "thr_wait_child",
            sourceKind: "delegated"
          },
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
      byAttemptId: new Map<string, ExecutionSessionSpawnHeadlessWaitTarget[]>(),
      bySessionId: new Map<string, ExecutionSessionSpawnHeadlessWaitTarget[]>()
    }
  } as never;
}
