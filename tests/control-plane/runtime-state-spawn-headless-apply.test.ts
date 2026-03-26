import { describe, expect, it, vi } from "vitest";

import {
  applyExecutionSessionSpawnHeadlessInput,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-headless-apply helpers", () => {
  it("should compose spawn apply first and then derive headless input", async () => {
    const abortController = new AbortController();
    const request = createSpawnRequest({
      sourceKind: "delegated",
      inheritedGuardrails: {
        maxChildren: 2,
        maxDepth: 3
      }
    });
    const invokeSpawn = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionSpawnHeadlessInput({
        childAttemptId: "att_child_headless_apply",
        request,
        execution: {
          prompt: "Reply with exactly: ok",
          cwd: "/tmp/headless-child",
          timeoutMs: 5_000,
          abortSignal: abortController.signal
        },
        invokeSpawn
      })
    ).resolves.toEqual({
      apply: {
        consume: {
          request: {
            parentAttemptId: "att_parent",
            parentRuntime: "codex-cli",
            parentSessionId: "thr_parent",
            sourceKind: "delegated",
            inheritedGuardrails: {
              maxChildren: 2,
              maxDepth: 3
            }
          },
          invoked: true
        },
        effects: {
          lineage: {
            attemptId: "att_child_headless_apply",
            parentAttemptId: "att_parent",
            sourceKind: "delegated",
            guardrails: {
              maxChildren: 2,
              maxDepth: 3
            }
          },
          requestedEvent: {
            attemptId: "att_parent",
            runtime: "codex-cli",
            sessionId: "thr_parent",
            lifecycleEventKind: "spawn_requested"
          },
          recordedEvent: {
            attemptId: "att_parent",
            runtime: "codex-cli",
            sessionId: "thr_parent",
            lifecycleEventKind: "spawn_recorded"
          }
        }
      },
      headlessInput: {
        prompt: "Reply with exactly: ok",
        cwd: "/tmp/headless-child",
        timeoutMs: 5_000,
        abortSignal: abortController.signal,
        attempt: {
          attemptId: "att_child_headless_apply",
          parentAttemptId: "att_parent",
          sourceKind: "delegated",
          guardrails: {
            maxChildren: 2,
            maxDepth: 3
          }
        }
      }
    });
    expect(invokeSpawn).toHaveBeenCalledTimes(1);
    expect(invokeSpawn).toHaveBeenCalledWith(request);
  });

  it("should keep the apply result minimal and leave request plus execution untouched", async () => {
    const request = createSpawnRequest({
      sourceKind: "fork"
    });
    const execution = {
      prompt: "Bridge child runtime",
      cwd: "/tmp/headless-minimal",
      timeoutMs: 7_500
    };
    const requestSnapshot = JSON.parse(JSON.stringify(request));
    const executionSnapshot = JSON.parse(JSON.stringify(execution));
    const result = (await applyExecutionSessionSpawnHeadlessInput({
      childAttemptId: "att_child_headless_minimal",
      request,
      execution,
      invokeSpawn: async () => undefined
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      apply: {
        consume: {
          request: {
            parentAttemptId: "att_parent",
            parentRuntime: "codex-cli",
            parentSessionId: "thr_parent",
            sourceKind: "fork"
          },
          invoked: true
        },
        effects: {
          lineage: {
            attemptId: "att_child_headless_minimal",
            parentAttemptId: "att_parent",
            sourceKind: "fork"
          },
          requestedEvent: {
            attemptId: "att_parent",
            runtime: "codex-cli",
            sessionId: "thr_parent",
            lifecycleEventKind: "spawn_requested"
          },
          recordedEvent: {
            attemptId: "att_parent",
            runtime: "codex-cli",
            sessionId: "thr_parent",
            lifecycleEventKind: "spawn_recorded"
          }
        }
      },
      headlessInput: {
        prompt: "Bridge child runtime",
        cwd: "/tmp/headless-minimal",
        timeoutMs: 7_500,
        attempt: {
          attemptId: "att_child_headless_minimal",
          parentAttemptId: "att_parent",
          sourceKind: "fork"
        }
      }
    });
    expect(result).not.toHaveProperty("request");
    expect(result).not.toHaveProperty("consume");
    expect(result).not.toHaveProperty("effects");
    expect(result).not.toHaveProperty("input");
    expect(result).not.toHaveProperty("result");
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("spawnApply");
    expect(result).not.toHaveProperty("spawnHeadlessApply");
    expect(result).not.toHaveProperty("spawnHeadlessExecute");
    expect(result).not.toHaveProperty("controlPlane");
    expect(result).not.toHaveProperty("manifest");
    expect(request).toEqual(requestSnapshot);
    expect(execution).toEqual(executionSnapshot);
  });

  it("should surface invoker failures without returning partial headless input", async () => {
    const expectedError = new Error("spawn failed");

    await expect(
      applyExecutionSessionSpawnHeadlessInput({
        childAttemptId: "att_child_headless_failed",
        request: createSpawnRequest({
          sourceKind: "fork"
        }),
        execution: {
          prompt: "Reply with ok"
        },
        invokeSpawn: async () => {
          throw expectedError;
        }
      })
    ).rejects.toThrow(expectedError);
  });

  it("should invoke spawn before surfacing bridge failures from the execution seed", async () => {
    const invokeSpawn = vi.fn(async () => undefined);
    const expectedError = new Error("bridge failed");

    await expect(
      applyExecutionSessionSpawnHeadlessInput({
        childAttemptId: "att_child_headless_bridge",
        request: createSpawnRequest({
          sourceKind: "delegated"
        }),
        get execution(): never {
          throw expectedError;
        },
        invokeSpawn
      } as const)
    ).rejects.toThrow(expectedError);
    expect(invokeSpawn).toHaveBeenCalledTimes(1);
  });
});

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
