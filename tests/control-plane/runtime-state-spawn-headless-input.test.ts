import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveExecutionSessionSpawnHeadlessInput,
  type ExecutionSessionSpawnEffects
} from "../../src/control-plane/internal.js";

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

  it("should fail loudly when execution is not an object", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: createSpawnEffects(),
        execution: null as unknown as {
          prompt: string;
        }
      } as never)
    ).toThrow(ValidationError);

    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: createSpawnEffects(),
        execution: null as unknown as {
          prompt: string;
        }
      } as never)
    ).toThrow(
      "Execution session spawn headless input requires execution to be an object."
    );
  });

  it("should fail loudly when effects.lineage is not an object", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: {
          ...createSpawnEffects(),
          lineage: null as unknown as ExecutionSessionSpawnEffects["lineage"]
        },
        execution: {
          prompt: "Bridge child runtime"
        }
      })
    ).toThrow(ValidationError);

    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: {
          ...createSpawnEffects(),
          lineage: null as unknown as ExecutionSessionSpawnEffects["lineage"]
        },
        execution: {
          prompt: "Bridge child runtime"
        }
      })
    ).toThrow(
      "Execution session spawn headless input requires effects.lineage to be an object."
    );
  });

  it("should fail loudly when execution.timeoutMs is not a finite integer greater than 0", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: createSpawnEffects(),
        execution: {
          prompt: "Bridge child runtime",
          timeoutMs: 0
        }
      })
    ).toThrow(ValidationError);

    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: createSpawnEffects(),
        execution: {
          prompt: "Bridge child runtime",
          timeoutMs: 0
        }
      })
    ).toThrow(
      "Execution session spawn headless input timeoutMs must be a finite integer greater than 0."
    );
  });

  it("should fail loudly when execution.abortSignal is only AbortSignal-shaped", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: createSpawnEffects(),
        execution: {
          prompt: "Bridge child runtime",
          abortSignal: {
            aborted: false
          } as unknown as AbortSignal
        }
      })
    ).toThrow(ValidationError);

    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: createSpawnEffects(),
        execution: {
          prompt: "Bridge child runtime",
          abortSignal: {
            aborted: false
          } as unknown as AbortSignal
        }
      })
    ).toThrow(
      "Execution session spawn headless input requires execution.abortSignal to be an AbortSignal-like object when provided."
    );
  });

  it("should fail loudly when effects.lineage.parentAttemptId is missing", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: {
          ...createSpawnEffects(),
          lineage: {
            attemptId: "att_child",
            sourceKind: "fork"
          } as unknown as ExecutionSessionSpawnEffects["lineage"]
        },
        execution: {
          prompt: "Bridge child runtime"
        }
      })
    ).toThrow(ValidationError);

    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: {
          ...createSpawnEffects(),
          lineage: {
            attemptId: "att_child",
            sourceKind: "fork"
          } as unknown as ExecutionSessionSpawnEffects["lineage"]
        },
        execution: {
          prompt: "Bridge child runtime"
        }
      })
    ).toThrow(
      "Execution session spawn headless input requires effects.lineage.parentAttemptId to be a non-empty string."
    );
  });

  it("should fail loudly when effects.lineage.sourceKind is missing", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: {
          ...createSpawnEffects(),
          lineage: {
            attemptId: "att_child",
            parentAttemptId: "att_parent"
          } as unknown as ExecutionSessionSpawnEffects["lineage"]
        },
        execution: {
          prompt: "Bridge child runtime"
        }
      })
    ).toThrow(ValidationError);

    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: {
          ...createSpawnEffects(),
          lineage: {
            attemptId: "att_child",
            parentAttemptId: "att_parent"
          } as unknown as ExecutionSessionSpawnEffects["lineage"]
        },
        execution: {
          prompt: "Bridge child runtime"
        }
      })
    ).toThrow(
      "Execution session spawn headless input requires effects.lineage.sourceKind to use the existing spawn source-kind vocabulary when provided."
    );
  });

  it("should omit empty guardrails objects after canonical normalization", () => {
    expect(
      deriveExecutionSessionSpawnHeadlessInput({
        effects: createSpawnEffects({
          guardrails: {}
        }),
        execution: {
          prompt: "Bridge child runtime"
        }
      })
    ).toEqual({
      prompt: "Bridge child runtime",
      attempt: {
        attemptId: "att_child",
        parentAttemptId: "att_parent",
        sourceKind: "fork"
      }
    });
  });

  it("should preserve prompt and cwd exactly without trimming execution seed text", () => {
    expect(
      deriveExecutionSessionSpawnHeadlessInput({
        effects: createSpawnEffects(),
        execution: {
          prompt: "  keep deliberate whitespace  \n",
          cwd: " /tmp/with-leading-space "
        }
      })
    ).toEqual({
      prompt: "  keep deliberate whitespace  \n",
      cwd: " /tmp/with-leading-space ",
      attempt: {
        attemptId: "att_child",
        parentAttemptId: "att_parent",
        sourceKind: "fork"
      }
    });
  });

  it("should fail loudly when effects.lineage.sourceKind is outside the existing spawn source-kind vocabulary", () => {
    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: {
          ...createSpawnEffects(),
          lineage: {
            ...createSpawnEffects().lineage,
            sourceKind: "direct" as unknown as ExecutionSessionSpawnEffects["lineage"]["sourceKind"]
          }
        },
        execution: {
          prompt: "Bridge child runtime"
        }
      })
    ).toThrow(ValidationError);

    expect(() =>
      deriveExecutionSessionSpawnHeadlessInput({
        effects: {
          ...createSpawnEffects(),
          lineage: {
            ...createSpawnEffects().lineage,
            sourceKind: "direct" as unknown as ExecutionSessionSpawnEffects["lineage"]["sourceKind"]
          }
        },
        execution: {
          prompt: "Bridge child runtime"
        }
      })
    ).toThrow(
      "Execution session spawn headless input requires effects.lineage.sourceKind to use the existing spawn source-kind vocabulary when provided."
    );
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
