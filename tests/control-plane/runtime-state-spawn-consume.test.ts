import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  consumeExecutionSessionSpawn,
  type ExecutionSessionSpawnRequest
} from "../../src/control-plane/internal.js";

describe("control-plane runtime-state spawn-consume helpers", () => {
  it("should fail loudly when the top-level spawn-consume input is malformed", async () => {
    await expect(
      consumeExecutionSessionSpawn(null as never)
    ).rejects.toThrow(ValidationError);
    await expect(
      consumeExecutionSessionSpawn([] as never)
    ).rejects.toThrow("Execution session spawn consume input must be an object.");
  });

  it("should fail closed when request only exists on the prototype chain", async () => {
    const input = Object.create({
      request: createSpawnRequest(),
      invokeSpawn: async () => undefined
    });

    await expect(
      consumeExecutionSessionSpawn(input as never)
    ).rejects.toThrow(
      "Execution session spawn consume requires request to be an object."
    );
  });

  it("should invoke spawn exactly once for a valid spawn request", async () => {
    const request = createSpawnRequest();
    let seenRequest: ExecutionSessionSpawnRequest | undefined;
    const invokeSpawn = vi.fn(async (suppliedRequest: ExecutionSessionSpawnRequest) => {
      seenRequest = suppliedRequest;
    });

    await expect(
      consumeExecutionSessionSpawn({
        request,
        invokeSpawn
      })
    ).resolves.toEqual({
      request: {
        parentAttemptId: "att_parent",
        parentRuntime: "codex-cli",
        parentSessionId: "thr_parent",
        sourceKind: "fork"
      },
      invoked: true
    });
    expect(invokeSpawn).toHaveBeenCalledTimes(1);
    expect(invokeSpawn).toHaveBeenCalledWith({
      parentAttemptId: "att_parent",
      parentRuntime: "codex-cli",
      parentSessionId: "thr_parent",
      sourceKind: "fork"
    });
    expect(seenRequest).toEqual({
      parentAttemptId: "att_parent",
      parentRuntime: "codex-cli",
      parentSessionId: "thr_parent",
      sourceKind: "fork"
    });
    expect(seenRequest).not.toBe(request);
  });

  it("should preserve the minimal consume result shape without adding child or lifecycle side effects", async () => {
    const result = (await consumeExecutionSessionSpawn({
      request: createSpawnRequest(),
      invokeSpawn: async () => {}
    })) as unknown as Record<string, unknown>;

    expect(result).toEqual({
      request: {
        parentAttemptId: "att_parent",
        parentRuntime: "codex-cli",
        parentSessionId: "thr_parent",
        sourceKind: "fork"
      },
      invoked: true
    });
    expect(result).not.toHaveProperty("selector");
    expect(result).not.toHaveProperty("view");
    expect(result).not.toHaveProperty("context");
    expect(result).not.toHaveProperty("candidate");
    expect(result).not.toHaveProperty("target");
    expect(result).not.toHaveProperty("readiness");
    expect(result).not.toHaveProperty("spawnCandidate");
    expect(result).not.toHaveProperty("spawnRequest");
    expect(result).not.toHaveProperty("spawnTarget");
    expect(result).not.toHaveProperty("spawnLineage");
    expect(result).not.toHaveProperty("spawnRequestedEvent");
    expect(result).not.toHaveProperty("spawnRecordedEvent");
    expect(result).not.toHaveProperty("spawnEffects");
    expect(result).not.toHaveProperty("spawnApply");
    expect(result).not.toHaveProperty("effects");
    expect(result).not.toHaveProperty("apply");
    expect(result).not.toHaveProperty("lifecycleState");
    expect(result).not.toHaveProperty("lifecycleEventKind");
    expect(result).not.toHaveProperty("outcome");
    expect(result).not.toHaveProperty("parentAttemptId");
    expect(result).not.toHaveProperty("parentRuntime");
    expect(result).not.toHaveProperty("parentSessionId");
    expect(result).not.toHaveProperty("sourceKind");
    expect(result).not.toHaveProperty("inheritedGuardrails");
    expect(result).not.toHaveProperty("childAttemptId");
    expect(result).not.toHaveProperty("branch");
    expect(result).not.toHaveProperty("childBranch");
    expect(result).not.toHaveProperty("worktreePath");
    expect(result).not.toHaveProperty("childWorktreePath");
    expect(result).not.toHaveProperty("childRuntime");
    expect(result).not.toHaveProperty("runtimeMode");
    expect(result).not.toHaveProperty("prompt");
    expect(result).not.toHaveProperty("task");
    expect(result).not.toHaveProperty("taskId");
    expect(result).not.toHaveProperty("manifest");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("adapterResult");
  });

  it("should not mutate the supplied spawn request", async () => {
    const request = createSpawnRequest({
      sourceKind: "delegated",
      inheritedGuardrails: {
        maxChildren: 2,
        maxDepth: 3
      }
    });
    const requestSnapshot = JSON.parse(JSON.stringify(request));

    await expect(
      consumeExecutionSessionSpawn({
        request,
        invokeSpawn: async () => {}
      })
    ).resolves.toEqual({
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
    });
    expect(request).toEqual(requestSnapshot);
  });

  it("should normalize the request before invoking spawn", async () => {
    const invokeSpawn = vi.fn(async () => undefined);

    await expect(
      consumeExecutionSessionSpawn({
        request: createSpawnRequest({
          parentAttemptId: "  att_parent_trimmed  ",
          parentRuntime: "  codex-cli  ",
          parentSessionId: "  thr_parent_trimmed  ",
          sourceKind: "delegated"
        }),
        invokeSpawn
      })
    ).resolves.toEqual({
      request: {
        parentAttemptId: "att_parent_trimmed",
        parentRuntime: "codex-cli",
        parentSessionId: "thr_parent_trimmed",
        sourceKind: "delegated"
      },
      invoked: true
    });
    expect(invokeSpawn).toHaveBeenCalledWith({
      parentAttemptId: "att_parent_trimmed",
      parentRuntime: "codex-cli",
      parentSessionId: "thr_parent_trimmed",
      sourceKind: "delegated"
    });
  });

  it("should fail before invoking spawn when the request is malformed", async () => {
    const invokeSpawn = vi.fn(async () => undefined);

    await expect(
      consumeExecutionSessionSpawn({
        request: {
          ...createSpawnRequest(),
          parentSessionId: "   "
        } as ExecutionSessionSpawnRequest,
        invokeSpawn
      })
    ).rejects.toThrow(ValidationError);
    expect(invokeSpawn).not.toHaveBeenCalled();
  });

  it("should surface invoker failures without wrapping them into consume metadata", async () => {
    const expectedError = new Error("spawn failed");

    await expect(
      consumeExecutionSessionSpawn({
        request: createSpawnRequest({
          sourceKind: "delegated"
        }),
        invokeSpawn: async (suppliedRequest: ExecutionSessionSpawnRequest) => {
          expect(suppliedRequest).toEqual({
            parentAttemptId: "att_parent",
            parentRuntime: "codex-cli",
            parentSessionId: "thr_parent",
            sourceKind: "delegated"
          });
          throw expectedError;
        }
      })
    ).rejects.toThrow(expectedError);
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
