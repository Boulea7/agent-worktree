import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionSpawnHeadlessCloseRequestBatch,
  type ExecutionSessionSpawnHeadlessCloseTarget,
  type ExecutionSessionSpawnHeadlessCloseTargetBatch
} from "../../src/control-plane/internal.js";

describe(
  "control-plane runtime-state spawn-headless-close-request-batch helpers",
  () => {
    it("should return an empty ordered result list for an empty headless close-target batch", () => {
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
        results: []
      } satisfies ExecutionSessionSpawnHeadlessCloseTargetBatch;

      expect(
        deriveExecutionSessionSpawnHeadlessCloseRequestBatch({
          headlessCloseTargetBatch
        })
      ).toEqual({
        headlessCloseTargetBatch,
        results: []
      });
    });

    it("should preserve ordering while keeping blocked headless close targets in place", () => {
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
      } satisfies ExecutionSessionSpawnHeadlessCloseTargetBatch;

      expect(
        deriveExecutionSessionSpawnHeadlessCloseRequestBatch({
          headlessCloseTargetBatch
        })
      ).toEqual({
        headlessCloseTargetBatch,
        results: [
          {
            headlessCloseTarget: headlessCloseTargetBatch.results[0]
          },
          {
            headlessCloseTarget: headlessCloseTargetBatch.results[1],
            request: {
              attemptId: "att_supported_close",
              runtime: "supported-cli",
              sessionId: "thr_supported_close"
            }
          }
        ]
      });
    });

    it("should reject malformed headless close request batch wrappers", () => {
      expect(() =>
        deriveExecutionSessionSpawnHeadlessCloseRequestBatch(undefined as never)
      ).toThrow(
        "Execution session spawn headless close request batch input must be an object."
      );
      expect(() =>
        deriveExecutionSessionSpawnHeadlessCloseRequestBatch({
          headlessCloseTargetBatch: undefined as never
        })
      ).toThrow(ValidationError);
      expect(() =>
        deriveExecutionSessionSpawnHeadlessCloseRequestBatch({
          headlessCloseTargetBatch: undefined as never
        })
      ).toThrow(
        "Execution session spawn headless close request batch requires a headlessCloseTargetBatch wrapper."
      );
    });

    it("should fail loudly when headlessCloseTargetBatch.results entries are sparse or non-object", () => {
      const sparseResults = new Array(1);

      expect(() =>
        deriveExecutionSessionSpawnHeadlessCloseRequestBatch({
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
            results: sparseResults
          } as never
        })
      ).toThrow(
        "Execution session spawn headless close request batch requires headlessCloseTargetBatch.results entries to be objects."
      );

      expect(() =>
        deriveExecutionSessionSpawnHeadlessCloseRequestBatch({
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
            results: [0]
          } as never
        })
      ).toThrow(
        "Execution session spawn headless close request batch requires headlessCloseTargetBatch.results entries to be objects."
      );
    });

    it("should fail fast on the first malformed wrapped headless close target and stop before later entries", () => {
      let tailAccessed = false;

      expect(() =>
        deriveExecutionSessionSpawnHeadlessCloseRequestBatch({
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
              {} as ExecutionSessionSpawnHeadlessCloseTarget,
              {
                get headlessCloseCandidate() {
                  tailAccessed = true;
                  return createHeadlessCloseTarget().headlessCloseCandidate;
                }
              } as ExecutionSessionSpawnHeadlessCloseTarget
            ]
          }
        })
      ).toThrow(
        "Execution session spawn headless close request requires a headlessCloseTarget wrapper."
      );
      expect(tailAccessed).toBe(false);
    });

    it("should fail fast when the first wrapped headless close target omits candidate or headlessContext", () => {
      let tailAccessed = false;

      expect(() =>
        deriveExecutionSessionSpawnHeadlessCloseRequestBatch({
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
              {
                headlessCloseCandidate: {} as never
              } as ExecutionSessionSpawnHeadlessCloseTarget,
              {
                get headlessCloseCandidate() {
                  tailAccessed = true;
                  return createHeadlessCloseTarget().headlessCloseCandidate;
                }
              } as ExecutionSessionSpawnHeadlessCloseTarget
            ]
          }
        })
      ).toThrow(
        "Execution session spawn headless close request requires headlessCloseTarget.headlessCloseCandidate to include candidate and headlessContext objects."
      );
      expect(tailAccessed).toBe(false);
    });
  }
);

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
            attemptId: "att_close_child",
            errorEventCount: 0,
            lifecycleState: "active",
            origin: "headless_result",
            runCompleted: false,
            runtime: "codex-cli",
            sessionId: "thr_close_child",
            sourceKind: "delegated"
          },
          selectedBy: "attemptId"
        },
        headlessView: {
          headlessRecord: {
            headlessExecute: {} as never,
            record: {
              attemptId: "att_close_child",
              errorEventCount: 0,
              lifecycleState: "active",
              origin: "headless_result",
              runCompleted: false,
              runtime: "codex-cli",
              sessionId: "thr_close_child",
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
            attemptId: "att_close_child",
            errorEventCount: 0,
            lifecycleState: "active",
            origin: "headless_result",
            runCompleted: false,
            runtime: "codex-cli",
            sessionId: "thr_close_child",
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
