import { describe, expect, it } from "vitest";

import {
  deriveExecutionSessionSpawnHeadlessInput,
  type ExecutionSessionSpawnEffects
} from "../../src/control-plane/index.js";

describe("control-plane runtime-state spawn-headless-input helpers", () => {
  it("should derive a minimal headless execution input from spawn effects", () => {
    const abortController = new AbortController();
    const effects = createSpawnEffects({
      childAttemptId: "att_child_bridge",
      parentAttemptId: "att_parent_bridge",
      parentSessionId: "thr_parent_bridge",
      sourceKind: "delegated",
      guardrails: {
        maxChildren: 2,
        maxDepth: 3
      }
    });

    const result = deriveExecutionSessionSpawnHeadlessInput({
      effects,
      execution: {
        prompt: "Reply with exactly: ok",
        cwd: "/tmp/bridge-child",
        timeoutMs: 5_000,
        abortSignal: abortController.signal
      }
    });

    expect(result).toEqual({
      prompt: "Reply with exactly: ok",
      cwd: "/tmp/bridge-child",
      timeoutMs: 5_000,
      abortSignal: abortController.signal,
      attempt: {
        attemptId: "att_child_bridge",
        parentAttemptId: "att_parent_bridge",
        sourceKind: "delegated",
        guardrails: {
          maxChildren: 2,
          maxDepth: 3
        }
      }
    });
    expect(result.abortSignal).toBe(abortController.signal);
  });

  it("should override dynamic attempt payloads and ignore unexpected execution fields", () => {
    const effects = createSpawnEffects({
      childAttemptId: "att_child_override",
      parentAttemptId: "att_parent_override",
      parentSessionId: "thr_parent_override"
    });
    const result = deriveExecutionSessionSpawnHeadlessInput({
      effects,
      execution: {
        prompt: "Bridge child runtime",
        cwd: "/tmp/override",
        timeoutMs: 7_500,
        attempt: {
          attemptId: "att_fake",
          sourceKind: "direct"
        },
        profile: "unsafe",
        env: {
          OPENAI_API_KEY: "should-not-pass-through"
        },
        controlPlane: {
          sessionSnapshot: {
            node: {
              attemptId: "att_fake"
            }
          }
        }
      } as never
    }) as Record<string, unknown>;

    expect(result).toEqual({
      prompt: "Bridge child runtime",
      cwd: "/tmp/override",
      timeoutMs: 7_500,
      attempt: {
        attemptId: "att_child_override",
        parentAttemptId: "att_parent_override",
        sourceKind: "fork"
      }
    });
    expect(result).not.toHaveProperty("effects");
    expect(result).not.toHaveProperty("requestedEvent");
    expect(result).not.toHaveProperty("recordedEvent");
    expect(result).not.toHaveProperty("controlPlane");
    expect(result).not.toHaveProperty("profile");
    expect(result).not.toHaveProperty("env");
    expect(result).not.toHaveProperty("spawnEffects");
    expect(result).not.toHaveProperty("spawnApply");
    expect(result).not.toHaveProperty("spawnHeadlessApply");
    expect(result).not.toHaveProperty("spawnHeadlessApplyBatch");
    expect(result).not.toHaveProperty("spawnHeadlessExecute");
    expect(result).not.toHaveProperty("spawnHeadlessExecuteBatch");
    expect(result).not.toHaveProperty("consume");
    expect(result).not.toHaveProperty("apply");
    expect(result).not.toHaveProperty("stdout");
    expect(result).not.toHaveProperty("stderr");
    expect(result).not.toHaveProperty("exitCode");
    expect(result).not.toHaveProperty("events");
  });

  it("should not mutate the supplied effects or execution seed", () => {
    const effects = createSpawnEffects({
      childAttemptId: "att_child_immutable",
      parentAttemptId: "att_parent_immutable",
      parentSessionId: "thr_parent_immutable",
      sourceKind: "delegated",
      guardrails: {
        maxChildren: 4,
        maxDepth: 5
      }
    });
    const execution = {
      prompt: "Keep inputs stable",
      cwd: "/tmp/immutable",
      timeoutMs: 9_000
    };
    const effectsSnapshot = JSON.parse(JSON.stringify(effects));
    const executionSnapshot = JSON.parse(JSON.stringify(execution));

    expect(
      deriveExecutionSessionSpawnHeadlessInput({
        effects,
        execution
      })
    ).toEqual({
      prompt: "Keep inputs stable",
      cwd: "/tmp/immutable",
      timeoutMs: 9_000,
      attempt: {
        attemptId: "att_child_immutable",
        parentAttemptId: "att_parent_immutable",
        sourceKind: "delegated",
        guardrails: {
          maxChildren: 4,
          maxDepth: 5
        }
      }
    });
    expect(effects).toEqual(effectsSnapshot);
    expect(execution).toEqual(executionSnapshot);
  });
});

function createSpawnEffects(
  overrides: {
    childAttemptId?: string;
    guardrails?: ExecutionSessionSpawnEffects["lineage"]["guardrails"];
    parentAttemptId?: string;
    parentSessionId?: string;
    sourceKind?: ExecutionSessionSpawnEffects["lineage"]["sourceKind"];
  } = {}
): ExecutionSessionSpawnEffects {
  const childAttemptId = overrides.childAttemptId ?? "att_child";
  const parentAttemptId = overrides.parentAttemptId ?? "att_parent";
  const parentSessionId = overrides.parentSessionId ?? "thr_parent";
  const sourceKind = overrides.sourceKind ?? "fork";

  return {
    lineage: {
      attemptId: childAttemptId,
      parentAttemptId,
      sourceKind,
      ...(overrides.guardrails === undefined
        ? {}
        : {
            guardrails: overrides.guardrails
          })
    },
    requestedEvent: {
      attemptId: parentAttemptId,
      runtime: "codex-cli",
      sessionId: parentSessionId,
      lifecycleEventKind: "spawn_requested"
    },
    recordedEvent: {
      attemptId: parentAttemptId,
      runtime: "codex-cli",
      sessionId: parentSessionId,
      lifecycleEventKind: "spawn_recorded"
    }
  };
}
