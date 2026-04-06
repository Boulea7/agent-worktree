import { describe, expect, it, vi } from "vitest";

import type {
  HeadlessExecutionInput,
  HeadlessExecutionResult
} from "../../src/adapters/types.js";
import {
  applyExecutionSessionSpawnBatchHeadlessApply,
  applyExecutionSessionSpawnHeadlessInputBatch,
  buildExecutionSessionView,
  deriveExecutionSessionSpawnBatchHeadlessApplyItems,
  deriveExecutionSessionSpawnBatchItems,
  deriveExecutionSessionSpawnBatchPlan,
  deriveExecutionSessionSpawnCandidate,
  deriveExecutionSessionSpawnHeadlessCloseCandidateBatch,
  deriveExecutionSessionSpawnHeadlessCloseTargetBatch,
  deriveExecutionSessionSpawnHeadlessContextBatch,
  deriveExecutionSessionSpawnHeadlessRecordBatch,
  deriveExecutionSessionSpawnHeadlessViewBatch,
  deriveExecutionSessionSpawnHeadlessWaitCandidateBatch,
  deriveExecutionSessionSpawnHeadlessWaitTargetBatch,
  executeExecutionSessionSpawnHeadlessBatch,
  type ExecutionSessionSpawnBatchHeadlessApplyItems,
  type ExecutionSessionSpawnHeadlessInputSeed,
  type ExecutionSessionSpawnRequest,
  type ExecutionSessionRecord
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-batch-headless-apply helpers", () => {
  it("should preserve a blocked batch without invoking spawn or projecting apply results", async () => {
    const invokeSpawn = vi.fn(async () => undefined);
    const headlessApplyItems = {
      batchItems: {
        plan: createPlan({
          requestedCount: 1,
          canPlan: false
        })
      }
    } satisfies ExecutionSessionSpawnBatchHeadlessApplyItems;
    const result = (await applyExecutionSessionSpawnBatchHeadlessApply({
      headlessApplyItems,
      invokeSpawn
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      headlessApplyItems
    });
    expect(invokeSpawn).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("apply");
    expect(result).not.toHaveProperty("execute");
    expect(result).not.toHaveProperty("record");
    expect(result).not.toHaveProperty("view");
    expect(result).not.toHaveProperty("context");
    expect(result).not.toHaveProperty("queue");
    expect(result).not.toHaveProperty("scheduler");
    expect(result).not.toHaveProperty("manifest");
  });

  it("should bridge projected headless apply items into the existing headless apply batch helper", async () => {
    const abortController = new AbortController();
    const headlessApplyItems = createHeadlessApplyItems({
      items: [
        createHeadlessApplyItem({
          childAttemptId: "att_child_1",
          execution: {
            prompt: "child one",
            cwd: "/tmp/headless-one"
          }
        }),
        createHeadlessApplyItem({
          childAttemptId: "att_child_2",
          request: createSpawnRequest({
            parentAttemptId: "att_parent_2",
            parentSessionId: "thr_parent_2",
            sourceKind: "delegated",
            inheritedGuardrails: {
              maxChildren: 2,
              maxDepth: 3
            }
          }),
          execution: {
            prompt: "child two",
            abortSignal: abortController.signal,
            timeoutMs: 2_000
          }
        })
      ]
    });
    const invokedSessionIds: string[] = [];

    const manualApply = await applyExecutionSessionSpawnHeadlessInputBatch({
      items: headlessApplyItems.items ?? [],
      invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
        invokedSessionIds.push(request.parentSessionId);
      }
    });
    invokedSessionIds.length = 0;

    await expect(
      applyExecutionSessionSpawnBatchHeadlessApply({
        headlessApplyItems,
        invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
          invokedSessionIds.push(request.parentSessionId);
        }
      })
    ).resolves.toEqual({
      headlessApplyItems,
      apply: manualApply
    });
    expect(invokedSessionIds).toEqual(["thr_parent", "thr_parent_2"]);
  });

  it("should preserve traceability from batch projection through wait and close target batches", async () => {
    const batchItems = deriveExecutionSessionSpawnBatchItems({
      plan: createPlan({
        requestedCount: 2,
        canPlan: true,
        records: [
          createRecord({
            attemptId: "att_trace_parent",
            sessionId: "thr_trace_parent",
            sourceKind: "direct",
            lifecycleState: "active",
            guardrails: {
              maxChildren: 4,
              maxDepth: 3
            }
          })
        ]
      }),
      childAttemptIds: ["att_trace_child_1", "att_trace_child_2"],
      sourceKind: "delegated"
    });
    const abortController = new AbortController();
    const headlessApplyItems = deriveExecutionSessionSpawnBatchHeadlessApplyItems({
      batchItems,
      executions: [
        {
          prompt: "child one",
          cwd: "/tmp/trace-one"
        },
        {
          prompt: "child two",
          abortSignal: abortController.signal,
          timeoutMs: 2_000
        }
      ]
    });
    const invokedSessionIds: string[] = [];
    const executedAttempts: Array<HeadlessExecutionInput["attempt"]> = [];

    const applyResult = await applyExecutionSessionSpawnBatchHeadlessApply({
      headlessApplyItems,
      invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
        invokedSessionIds.push(request.parentSessionId);
      }
    });
    const headlessExecuteBatch = await executeExecutionSessionSpawnHeadlessBatch({
      items: applyResult.headlessApplyItems.items ?? [],
      invokeSpawn: async () => undefined,
      executeHeadless: async (input: HeadlessExecutionInput) => {
        executedAttempts.push(input.attempt);

        return createHeadlessExecutionResult({
          observation: {
            threadId: `thr_exec_${input.attempt?.attemptId ?? "missing"}`,
            runCompleted: false,
            errorEventCount: 0
          }
        });
      }
    });
    const headlessRecordBatch = deriveExecutionSessionSpawnHeadlessRecordBatch({
      items: headlessExecuteBatch.results
    });
    const headlessViewBatch = deriveExecutionSessionSpawnHeadlessViewBatch({
      headlessRecordBatch
    });
    const headlessContextBatch = deriveExecutionSessionSpawnHeadlessContextBatch({
      headlessViewBatch
    });
    const headlessWaitCandidateBatch =
      deriveExecutionSessionSpawnHeadlessWaitCandidateBatch({
        headlessContextBatch
      });
    const headlessWaitTargetBatch = deriveExecutionSessionSpawnHeadlessWaitTargetBatch({
      headlessWaitCandidateBatch
    });
    const headlessCloseCandidateBatch =
      deriveExecutionSessionSpawnHeadlessCloseCandidateBatch({
        headlessContextBatch,
        resolveSessionLifecycleCapability: () => true
      });
    const headlessCloseTargetBatch =
      deriveExecutionSessionSpawnHeadlessCloseTargetBatch({
        headlessCloseCandidateBatch
      });

    expect(applyResult.apply?.results.map((result) => result.apply.effects.lineage)).toEqual([
      {
        attemptId: "att_trace_child_1",
        parentAttemptId: "att_trace_parent",
        sourceKind: "delegated",
        guardrails: {
          maxChildren: 4,
          maxDepth: 3
        }
      },
      {
        attemptId: "att_trace_child_2",
        parentAttemptId: "att_trace_parent",
        sourceKind: "delegated",
        guardrails: {
          maxChildren: 4,
          maxDepth: 3
        }
      }
    ]);
    expect(invokedSessionIds).toEqual(["thr_trace_parent", "thr_trace_parent"]);
    expect(executedAttempts).toEqual([
      {
        attemptId: "att_trace_child_1",
        parentAttemptId: "att_trace_parent",
        sourceKind: "delegated",
        guardrails: {
          maxChildren: 4,
          maxDepth: 3
        }
      },
      {
        attemptId: "att_trace_child_2",
        parentAttemptId: "att_trace_parent",
        sourceKind: "delegated",
        guardrails: {
          maxChildren: 4,
          maxDepth: 3
        }
      }
    ]);
    expect(
      headlessRecordBatch.results.map((result) => ({
        attemptId: result.record.attemptId,
        parentAttemptId: result.record.parentAttemptId,
        sessionId: result.record.sessionId,
        sourceKind: result.record.sourceKind
      }))
    ).toEqual([
      {
        attemptId: "att_trace_child_1",
        parentAttemptId: "att_trace_parent",
        sessionId: "thr_exec_att_trace_child_1",
        sourceKind: "delegated"
      },
      {
        attemptId: "att_trace_child_2",
        parentAttemptId: "att_trace_parent",
        sessionId: "thr_exec_att_trace_child_2",
        sourceKind: "delegated"
      }
    ]);
    expect(headlessViewBatch.descendantCoverage).toBe("incomplete");
    expect(
      headlessWaitTargetBatch.results.map(
        (result) => result.headlessWaitCandidate.candidate.context.record.attemptId
      )
    ).toEqual(["att_trace_child_1", "att_trace_child_2"]);
    expect(
      headlessCloseTargetBatch.results.map(
        (result) => result.headlessCloseCandidate.candidate.context.record.attemptId
      )
    ).toEqual(["att_trace_child_1", "att_trace_child_2"]);

    for (const result of headlessWaitTargetBatch.results) {
      expect(
        result.headlessWaitCandidate.candidate.readiness.blockingReasons
      ).toContain("descendant_coverage_incomplete");
      expect(result).not.toHaveProperty("target");
    }

    for (const result of headlessCloseTargetBatch.results) {
      expect(
        result.headlessCloseCandidate.candidate.readiness.blockingReasons
      ).toContain("descendant_coverage_incomplete");
      expect(
        result.headlessCloseCandidate.candidate.readiness.sessionLifecycleSupported
      ).toBe(true);
      expect(result).not.toHaveProperty("target");
    }
  });

  it("should reject malformed projected headless apply items before invoking spawn", async () => {
    const invokeSpawn = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionSpawnBatchHeadlessApply({
        headlessApplyItems: createHeadlessApplyItems({
          items: [
            createHeadlessApplyItem({
              request: createSpawnRequest({
                parentSessionId: "   "
              })
            })
          ]
        }),
        invokeSpawn
      })
    ).rejects.toThrow(/sessionId/i);
    expect(invokeSpawn).not.toHaveBeenCalled();
  });

  it("should fail fast on the first invoker error", async () => {
    const expectedError = new Error("spawn failed");
    const invokedSessionIds: string[] = [];

    await expect(
      applyExecutionSessionSpawnBatchHeadlessApply({
        headlessApplyItems: createHeadlessApplyItems({
          items: [
            createHeadlessApplyItem({
              childAttemptId: "att_child_1",
              request: createSpawnRequest({
                parentSessionId: "thr_parent_1"
              })
            }),
            createHeadlessApplyItem({
              childAttemptId: "att_child_2",
              request: createSpawnRequest({
                parentSessionId: "thr_parent_2"
              })
            }),
            createHeadlessApplyItem({
              childAttemptId: "att_child_3",
              request: createSpawnRequest({
                parentSessionId: "thr_parent_3"
              })
            })
          ]
        }),
        invokeSpawn: async (request: ExecutionSessionSpawnRequest) => {
          invokedSessionIds.push(request.parentSessionId);

          if (request.parentSessionId === "thr_parent_2") {
            throw expectedError;
          }
        }
      })
    ).rejects.toThrow(expectedError);
    expect(invokedSessionIds).toEqual(["thr_parent_1", "thr_parent_2"]);
  });

  it("should keep the result minimal and leave headlessApplyItems untouched", async () => {
    const headlessApplyItems = createHeadlessApplyItems({
      items: [
        createHeadlessApplyItem({
          childAttemptId: "att_child_1",
          execution: {
            prompt: "child one",
            cwd: "/tmp/headless-one"
          }
        }),
        createHeadlessApplyItem({
          childAttemptId: "att_child_2",
          execution: {
            prompt: "child two",
            timeoutMs: 9_000
          }
        })
      ]
    });
    const snapshot = structuredClone(headlessApplyItems);
    const result = (await applyExecutionSessionSpawnBatchHeadlessApply({
      headlessApplyItems,
      invokeSpawn: async () => undefined
    })) as unknown as Record<string, unknown>;

    expect(headlessApplyItems).toEqual(snapshot);
    expect(result).not.toHaveProperty("execution");
    expect(result).not.toHaveProperty("headlessInput");
    expect(result).not.toHaveProperty("execute");
    expect(result).not.toHaveProperty("record");
    expect(result).not.toHaveProperty("view");
    expect(result).not.toHaveProperty("context");
    expect(result).not.toHaveProperty("queue");
    expect(result).not.toHaveProperty("scheduler");
    expect(result).not.toHaveProperty("manifest");
  });
});

function createPlan(input: {
  canPlan: boolean;
  requestedCount: number;
  records?: ExecutionSessionRecord[];
}) {
  const candidate = deriveExecutionSessionSpawnCandidate({
    view: buildExecutionSessionView(
      input.records ?? [
        createRecord({
          attemptId: "att_parent",
          sessionId: "thr_parent",
          sourceKind: "direct",
          lifecycleState: input.canPlan ? "active" : "failed"
        })
      ]
    ),
    selector: {
      attemptId: input.records?.[0]?.attemptId ?? "att_parent"
    }
  });

  if (!candidate) {
    throw new Error("expected spawn candidate");
  }

  return deriveExecutionSessionSpawnBatchPlan({
    candidate,
    requestedCount: input.requestedCount
  });
}

function createHeadlessApplyItems(
  overrides: Partial<ExecutionSessionSpawnBatchHeadlessApplyItems> = {}
): ExecutionSessionSpawnBatchHeadlessApplyItems {
  return {
    batchItems: {
      plan: createPlan({
        requestedCount: overrides.items?.length ?? 1,
        canPlan: true
      }),
      ...(overrides.items === undefined ? {} : { items: [] })
    },
    ...overrides
  };
}

function createHeadlessApplyItem(input: {
  childAttemptId?: string;
  execution?: ExecutionSessionSpawnHeadlessInputSeed;
  request?: ExecutionSessionSpawnRequest;
}) {
  return {
    childAttemptId: input.childAttemptId ?? "att_child",
    request: input.request ?? createSpawnRequest(),
    execution: input.execution ?? { prompt: "child" }
  };
}

function createSpawnRequest(
  overrides: Partial<ExecutionSessionSpawnRequest> = {}
): ExecutionSessionSpawnRequest {
  return {
    parentAttemptId: "att_parent",
    parentRuntime: "codex-cli",
    parentSessionId: "thr_parent",
    sourceKind: "fork",
    ...overrides
  };
}

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

function createHeadlessExecutionResult(
  overrides: Partial<HeadlessExecutionResult> = {}
): HeadlessExecutionResult {
  return {
    command: {
      runtime: "codex-cli",
      executable: "codex",
      args: ["exec", "--json", "Reply with exactly: ok"],
      metadata: {
        executionMode: "headless_event_stream",
        machineReadable: true,
        promptIncluded: true,
        resumeRequested: false,
        safetyIntent: "workspace_write_with_approval"
      }
    },
    events: [],
    exitCode: 0,
    observation: {
      runCompleted: true,
      errorEventCount: 0
    },
    stderr: "",
    stdout: "",
    ...overrides
  };
}
