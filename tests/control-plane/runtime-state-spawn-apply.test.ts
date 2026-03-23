import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  applyExecutionSessionSpawn,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state spawn-apply helpers", () => {
  it("should compose consume first and then derive effects", async () => {
    const request = createSpawnRequest({
      sourceKind: "delegated",
      inheritedGuardrails: {
        maxChildren: 2,
        maxDepth: 3
      }
    });
    const invokeSpawn = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionSpawn({
        childAttemptId: "att_child_apply",
        request,
        invokeSpawn
      })
    ).resolves.toEqual({
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
          attemptId: "att_child_apply",
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
    });
    expect(invokeSpawn).toHaveBeenCalledTimes(1);
    expect(invokeSpawn).toHaveBeenCalledWith(request);
  });

  it("should keep the apply result minimal and leave the request untouched", async () => {
    const request = createSpawnRequest({
      sourceKind: "fork"
    });
    const requestSnapshot = JSON.parse(JSON.stringify(request));
    const result = (await applyExecutionSessionSpawn({
      childAttemptId: "att_child_minimal",
      request,
      invokeSpawn: async () => undefined
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
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
          attemptId: "att_child_minimal",
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
    });
    expect(result).not.toHaveProperty("request");
    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("errors");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("branch");
    expect(result).not.toHaveProperty("worktreePath");
    expect(result).not.toHaveProperty("runtimeMode");
    expect(result).not.toHaveProperty("prompt");
    expect(result).not.toHaveProperty("task");
    expect(result).not.toHaveProperty("taskId");
    expect(request).toEqual(requestSnapshot);
  });

  it("should surface invoker failures without returning partial effects", async () => {
    const expectedError = new Error("spawn failed");

    await expect(
      applyExecutionSessionSpawn({
        childAttemptId: "att_child_failed",
        request: createSpawnRequest({
          sourceKind: "fork"
        }),
        invokeSpawn: async () => {
          throw expectedError;
        }
      })
    ).rejects.toThrow(expectedError);
  });

  it("should invoke consume before surfacing invalid childAttemptId failures", async () => {
    const invokeSpawn = vi.fn(async () => undefined);

    await expect(
      applyExecutionSessionSpawn({
        childAttemptId: "  ",
        request: createSpawnRequest({
          sourceKind: "fork"
        }),
        invokeSpawn
      })
    ).rejects.toThrow(ValidationError);
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
