import { readFile } from "node:fs/promises";

import { afterEach, describe, expect, it, vi } from "vitest";

import { getAdapterDescriptor } from "../../src/adapters/catalog.js";
import { CodexCliAdapter } from "../../src/adapters/codex-cli.js";
import {
  deriveExecutionSessionSpawnEffects,
  deriveExecutionSessionSpawnHeadlessInput
} from "../../src/control-plane/index.js";
import {
  detectCodexCli,
  executeCodexHeadless,
  probeCodexCliCompatibility
} from "../../src/adapters/codex-cli-exec.js";
import { RuntimeError, ValidationError } from "../../src/core/errors.js";

async function readFixture(name: string): Promise<string> {
  return readFile(
    new URL(`../fixtures/adapters/codex-cli/headless/${name}`, import.meta.url),
    "utf8"
  );
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("node:fs/promises");
  vi.doUnmock("../../src/adapters/codex-cli-env.js");
  vi.doUnmock("../../src/adapters/headless.js");
  vi.unstubAllEnvs();
});

function createAccessMock(
  allowedCandidates: string[]
): typeof import("node:fs/promises").access {
  return vi.fn(async (candidate) => {
    const resolvedCandidate = candidate.toString();

    if (allowedCandidates.includes(resolvedCandidate)) {
      return;
    }

    throw new Error(`ENOENT: ${resolvedCandidate}`);
  });
}

describe("detectCodexCli", () => {
  it("should return true when codex exec help exposes json mode", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: "Usage: codex exec\n      --json\n",
      stderr: ""
    }));

    await expect(detectCodexCli(runCommand)).resolves.toBe(true);
    expect(runCommand).toHaveBeenCalledWith(
      "codex",
      ["exec", "--help"],
      {
        timeoutMs: 5_000
      }
    );
  });

  it("should return false when the codex probe fails", async () => {
    const runCommand = vi.fn(async () => {
      throw new RuntimeError("spawn failed");
    });

    await expect(detectCodexCli(runCommand)).resolves.toBe(false);
  });

  it("should return false when json mode is not advertised", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: "Usage: codex exec\n",
      stderr: ""
    }));

    await expect(detectCodexCli(runCommand)).resolves.toBe(false);
  });

  it("should return false on non-zero exit even when help mentions json mode", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 1,
      stdout: "Usage: codex exec\n      --json\n",
      stderr: "failed"
    }));

    await expect(detectCodexCli(runCommand)).resolves.toBe(false);
  });

  it("should scan PATH candidates left to right for the default runner", async () => {
    vi.stubEnv("PATH", "/mock/shadow:/mock/real");
    const runSubprocess = vi.fn(async (executable: string) => {
      if (executable === "/mock/shadow/codex") {
        return {
          exitCode: 0,
          stdout: "Usage: codex exec\n",
          stderr: ""
        };
      }

      if (executable === "/mock/real/codex") {
        return {
          exitCode: 0,
          stdout: "Usage: codex exec\n      --json\n",
          stderr: ""
        };
      }

      throw new Error(`Unexpected executable ${executable}`);
    });
    const { detectCodexCli: detectWithDefaultRunner } =
      await loadCodexExecModule({
        accessImpl: createAccessMock([
          "/mock/shadow/codex",
          "/mock/real/codex"
        ]),
        runSubprocess
      });

    await expect(detectWithDefaultRunner()).resolves.toBe(true);
    expect(runSubprocess.mock.calls).toEqual([
      ["/mock/shadow/codex", ["exec", "--help"], { timeoutMs: 5_000 }],
      ["/mock/real/codex", ["exec", "--help"], { timeoutMs: 5_000 }]
    ]);
  });

  it("should fall back to the literal codex probe after PATH candidates fail", async () => {
    vi.stubEnv("PATH", "/mock/shadow:/mock/other");
    const runSubprocess = vi.fn(async (executable: string) => {
      if (executable === "codex") {
        return {
          exitCode: 0,
          stdout: "Usage: codex exec\n      --json\n",
          stderr: ""
        };
      }

      return {
        exitCode: 0,
        stdout: "Usage: codex exec\n",
        stderr: ""
      };
    });
    const { detectCodexCli: detectWithDefaultRunner } =
      await loadCodexExecModule({
        accessImpl: createAccessMock([
          "/mock/shadow/codex",
          "/mock/other/codex"
        ]),
        runSubprocess
      });

    await expect(detectWithDefaultRunner()).resolves.toBe(true);
    expect(runSubprocess.mock.calls).toEqual([
      ["/mock/shadow/codex", ["exec", "--help"], { timeoutMs: 5_000 }],
      ["/mock/other/codex", ["exec", "--help"], { timeoutMs: 5_000 }],
      ["codex", ["exec", "--help"], { timeoutMs: 5_000 }]
    ]);
  });

  it("should keep injected runner detection on the literal codex command only", async () => {
    vi.stubEnv("PATH", "/mock/shadow:/mock/real");
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: "Usage: codex exec\n      --json\n",
      stderr: ""
    }));

    await expect(detectCodexCli(runCommand)).resolves.toBe(true);
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(runCommand).toHaveBeenCalledWith(
      "codex",
      ["exec", "--help"],
      expect.objectContaining({
        timeoutMs: 5_000
      })
    );
  });
});

describe("probeCodexCliCompatibility", () => {
  it("should report supported when exec json compatibility is confirmed", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: "Usage: codex exec\n      --json\n",
      stderr: ""
    }));

    await expect(probeCodexCliCompatibility(runCommand)).resolves.toEqual({
      supported: true,
      diagnosisCode: "exec_json_supported",
      summary: "A local codex executable with `exec --json` support was confirmed."
    });
  });

  it("should report unsupported when exec json compatibility is not confirmed", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: "Usage: codex exec\n",
      stderr: ""
    }));

    await expect(probeCodexCliCompatibility(runCommand)).resolves.toEqual({
      supported: false,
      diagnosisCode: "exec_json_unavailable",
      summary: "No local codex executable with `exec --json` support was confirmed."
    });
  });
});

describe("executeCodexHeadless", () => {
  it("should return the command, raw output, and canonical events on success", async () => {
    const stdout = await readFixture("success.observed.jsonl");
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout,
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));
    const command = adapter.renderCommand({
      cwd: "/tmp/codex-demo",
      prompt: "Reply with ok"
    });

    await expect(
      executeCodexHeadless(
        { cwd: "/tmp/codex-demo", prompt: "Reply with ok", timeoutMs: 5000 },
        { command, runCommand }
      )
    ).resolves.toEqual({
      command: {
        ...command,
        args: ["exec", "--json", "--ephemeral", "Reply with ok"]
      },
      exitCode: 0,
      stdout,
      stderr: "",
      observation: {
        threadId: "thr_demo",
        runCompleted: true,
        lastAgentMessage: "ok",
        usage: {
          inputTokens: 1,
          outputTokens: 1
        },
        errorEventCount: 0
      },
      events: [
        {
          kind: "unknown",
          rawType: "thread.started",
          payload: { type: "thread.started", thread_id: "thr_demo" },
          index: 0
        },
        {
          kind: "unknown",
          rawType: "turn.started",
          payload: { type: "turn.started" },
          index: 1
        },
        {
          kind: "message_completed",
          rawType: "item.completed",
          payload: { id: "item_0", type: "agent_message", text: "ok" },
          index: 2
        },
        {
          kind: "run_completed",
          rawType: "turn.completed",
          payload: {
            type: "turn.completed",
            usage: { input_tokens: 1, output_tokens: 1 }
          },
          index: 3
        }
      ]
    });
  });

  it("should honor the subprocess contract and parser injection", async () => {
    const stdout = await readFixture("noisy-prelude.jsonl");
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout,
      stderr: "diagnostic stderr"
    }));
    const parseEventStream = vi.fn(() => [
      {
        kind: "unknown" as const,
        rawType: "diagnostic",
        payload: { ok: true },
        index: 0
      }
    ]);
    const abortController = new AbortController();
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    const result = await executeCodexHeadless(
      {
        cwd: "/tmp/codex-demo",
        prompt: "Reply with ok",
        timeoutMs: 5_000,
        abortSignal: abortController.signal
      },
      {
        command: adapter.renderCommand({
          cwd: "/tmp/codex-demo",
          prompt: "Reply with ok"
        }),
        runCommand,
        parseEventStream
      }
    );

    expect(runCommand).toHaveBeenCalledWith(
      "codex",
      ["exec", "--json", "--ephemeral", "Reply with ok"],
      {
        cwd: "/tmp/codex-demo",
        timeoutMs: 5_000,
        abortSignal: abortController.signal
      }
    );
    expect(parseEventStream).toHaveBeenCalledWith(stdout);
    expect(result).toMatchObject({
      exitCode: 0,
      stderr: "diagnostic stderr",
      observation: {
        runCompleted: false,
        errorEventCount: 0
      },
      events: [
        {
          kind: "unknown",
          rawType: "diagnostic"
        }
      ]
    });
  });

  it("should derive a root control-plane session snapshot for direct attempts", async () => {
    const stdout = await readFixture("success.observed.jsonl");
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout,
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await expect(
      executeCodexHeadless(
        {
          prompt: "Reply with ok",
          timeoutMs: 5_000,
          attempt: {
            attemptId: "att_root"
          }
        },
        {
          command: adapter.renderCommand({ prompt: "Reply with ok" }),
          runCommand
        }
      )
    ).resolves.toMatchObject({
      observation: {
        threadId: "thr_demo",
        runCompleted: true,
        lastAgentMessage: "ok",
        errorEventCount: 0
      },
      controlPlane: {
        sessionSnapshot: {
          node: {
            attemptId: "att_root",
            nodeKind: "root",
            sourceKind: "direct"
          },
          lifecycleState: "completed",
          sessionRef: {
            runtime: "codex-cli",
            sessionId: "thr_demo"
          },
          runCompleted: true,
          errorEventCount: 0,
          lastAgentMessage: "ok",
          usage: {
            inputTokens: 1,
            outputTokens: 1
          }
        }
      }
    });
  });

  it("should preserve attempt guardrails in the derived control-plane session snapshot", async () => {
    const stdout = await readFixture("success.observed.jsonl");
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout,
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await expect(
      executeCodexHeadless(
        {
          prompt: "Reply with ok",
          timeoutMs: 5_000,
          attempt: {
            attemptId: "att_guarded",
            guardrails: {
              maxChildren: 2,
              maxDepth: 3
            }
          }
        },
        {
          command: adapter.renderCommand({ prompt: "Reply with ok" }),
          runCommand
        }
      )
    ).resolves.toMatchObject({
      controlPlane: {
        sessionSnapshot: {
          node: {
            attemptId: "att_guarded",
            nodeKind: "root",
            sourceKind: "direct"
          },
          guardrails: {
            maxChildren: 2,
            maxDepth: 3
          }
        }
      }
    });
  });

  it("should derive a child control-plane session snapshot for non-direct attempts", async () => {
    const stdout = await readFixture("error-event.jsonl");
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout,
      stderr: "codex failed"
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await expect(
      executeCodexHeadless(
        {
          prompt: "Reply with ok",
          timeoutMs: 5_000,
          attempt: {
            attemptId: "att_child",
            sourceKind: "delegated",
            parentAttemptId: "att_parent"
          }
        },
        {
          command: adapter.renderCommand({ prompt: "Reply with ok" }),
          runCommand
        }
      )
    ).resolves.toMatchObject({
      observation: {
        runCompleted: false,
        errorEventCount: 1,
        lastErrorMessage: "codex failed"
      },
      controlPlane: {
        sessionSnapshot: {
          node: {
            attemptId: "att_child",
            nodeKind: "child",
            sourceKind: "delegated",
            parentAttemptId: "att_parent"
          },
          lifecycleState: "failed",
          runCompleted: false,
          errorEventCount: 1,
          lastErrorMessage: "codex failed"
        }
      }
    });
  });

  it("should accept bridge-shaped spawn lineage as the headless execution attempt input", async () => {
    const stdout = await readFixture("success.observed.jsonl");
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout,
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));
    const input = deriveExecutionSessionSpawnHeadlessInput({
      effects: deriveExecutionSessionSpawnEffects({
        childAttemptId: "att_child_bridge",
        request: {
          parentAttemptId: "att_parent_bridge",
          parentRuntime: "codex-cli",
          parentSessionId: "thr_parent_bridge",
          sourceKind: "delegated",
          inheritedGuardrails: {
            maxChildren: 2,
            maxDepth: 3
          }
        }
      }),
      execution: {
        prompt: "Reply with ok",
        timeoutMs: 5_000
      }
    });

    await expect(
      executeCodexHeadless(input, {
        command: adapter.renderCommand({ prompt: input.prompt }),
        runCommand
      })
    ).resolves.toMatchObject({
      observation: {
        threadId: "thr_demo",
        runCompleted: true,
        lastAgentMessage: "ok",
        errorEventCount: 0
      },
      controlPlane: {
        sessionSnapshot: {
          node: {
            attemptId: "att_child_bridge",
            nodeKind: "child",
            sourceKind: "delegated",
            parentAttemptId: "att_parent_bridge"
          },
          guardrails: {
            maxChildren: 2,
            maxDepth: 3
          },
          sessionRef: {
            runtime: "codex-cli",
            sessionId: "thr_demo"
          }
        }
      }
    });
  });

  it("should not add control-plane output when attempt lineage is omitted", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({ type: "turn.completed" }),
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    const result = await executeCodexHeadless(
      {
        prompt: "Reply with ok"
      },
      {
        command: adapter.renderCommand({ prompt: "Reply with ok" }),
        runCommand
      }
    );

    expect(result).not.toHaveProperty("controlPlane");
  });

  it("should reject contradictory attempt lineage before invoking the runner", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({ type: "turn.completed" }),
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await expect(
      executeCodexHeadless(
        {
          prompt: "Reply with ok",
          attempt: {
            attemptId: "att_invalid",
            sourceKind: "direct",
            parentAttemptId: "att_parent"
          }
        },
        {
          command: adapter.renderCommand({ prompt: "Reply with ok" }),
          runCommand
        }
      )
    ).rejects.toThrow(ValidationError);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("should resolve the execution-time executable from PATH candidates for the default runner", async () => {
    vi.stubEnv("PATH", "/mock/shadow:/mock/real");
    const stdout = await readFixture("success.observed.jsonl");
    const runSubprocess = vi.fn(
      async (executable: string, args: string[]) => {
        if (args.at(1) === "--help" && executable === "/mock/shadow/codex") {
          return {
            exitCode: 0,
            stdout: "Usage: codex exec\n",
            stderr: ""
          };
        }

        if (args.at(1) === "--help" && executable === "/mock/real/codex") {
          return {
            exitCode: 0,
            stdout: "Usage: codex exec\n      --json\n",
            stderr: ""
          };
        }

        if (
          executable === "/mock/real/codex" &&
          args[0] === "exec" &&
          args[1] === "--json"
        ) {
          return {
            exitCode: 0,
            stdout,
            stderr: ""
          };
        }

        throw new Error(
          `Unexpected invocation ${executable} ${args.join(" ")}`
        );
      }
    );
    const { executeCodexHeadless: executeWithDefaultRunner } =
      await loadCodexExecModule({
        accessImpl: createAccessMock([
          "/mock/shadow/codex",
          "/mock/real/codex"
        ]),
        runSubprocess
      });
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    const result = await executeWithDefaultRunner(
      { prompt: "Reply with ok", timeoutMs: 5_000 },
      {
        command: adapter.renderCommand({ prompt: "Reply with ok" })
      }
    );

    expect(result.command.executable).toBe("/mock/real/codex");
    expect(runSubprocess.mock.calls).toEqual([
      ["/mock/shadow/codex", ["exec", "--help"], { timeoutMs: 5_000 }],
      ["/mock/real/codex", ["exec", "--help"], { timeoutMs: 5_000 }],
      [
        "/mock/real/codex",
        ["exec", "--json", "--ephemeral", "Reply with ok"],
        { timeoutMs: 5_000 }
      ]
    ]);
  });

  it("should inject relay-compatible env for the default runner without affecting the custom runner path", async () => {
    vi.stubEnv("PATH", "/mock/real");
    const stdout = await readFixture("success.observed.jsonl");
    const runSubprocess = vi.fn(
      async (executable: string, args: string[]) => {
        if (args.at(1) === "--help") {
          return {
            exitCode: 0,
            stdout: "Usage: codex exec\n      --json\n",
            stderr: ""
          };
        }

        return {
          exitCode: 0,
          stdout,
          stderr: ""
        };
      }
    );
    const { executeCodexHeadless: executeWithDefaultRunner } =
      await loadCodexExecModule({
        accessImpl: createAccessMock(["/mock/real/codex"]),
        runSubprocess,
        resolveCodexCliEnvironment: vi.fn(async () => ({
          PATH: "/usr/bin:/bin",
          OPENAI_API_KEY: "relay-token"
        }))
      });
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await executeWithDefaultRunner(
      { prompt: "Reply with ok", timeoutMs: 5_000 },
      {
        command: adapter.renderCommand({ prompt: "Reply with ok" })
      }
    );

    expect(runSubprocess.mock.calls).toEqual([
      ["/mock/real/codex", ["exec", "--help"], { timeoutMs: 5_000 }],
      [
        "/mock/real/codex",
        ["exec", "--json", "--ephemeral", "Reply with ok"],
        {
          timeoutMs: 5_000,
          env: {
            PATH: "/usr/bin:/bin",
            OPENAI_API_KEY: "relay-token"
          }
        }
      ]
    ]);
  });

  it("should preserve profile ordering when the default runner injects relay-compatible env", async () => {
    vi.stubEnv("PATH", "/mock/real");
    const stdout = await readFixture("success.observed.jsonl");
    const runSubprocess = vi.fn(
      async (executable: string, args: string[]) => {
        if (args.at(1) === "--help") {
          return {
            exitCode: 0,
            stdout: "Usage: codex exec\n      --json\n",
            stderr: ""
          };
        }

        return {
          exitCode: 0,
          stdout,
          stderr: ""
        };
      }
    );
    const { executeCodexHeadless: executeWithDefaultRunner } =
      await loadCodexExecModule({
        accessImpl: createAccessMock(["/mock/real/codex"]),
        runSubprocess,
        resolveCodexCliEnvironment: vi.fn(async () => ({
          PATH: "/usr/bin:/bin",
          OPENAI_API_KEY: "relay-token"
        }))
      });
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await executeWithDefaultRunner(
      {
        prompt: "Reply with ok",
        profile: "project-managed",
        timeoutMs: 5_000
      } as never,
      {
        command: adapter.renderCommand({
          prompt: "Reply with ok",
          profile: "project-managed"
        } as never)
      }
    );

    expect(runSubprocess.mock.calls).toEqual([
      ["/mock/real/codex", ["exec", "--help"], { timeoutMs: 5_000 }],
      [
        "/mock/real/codex",
        [
          "exec",
          "--json",
          "--profile",
          "project-managed",
          "--ephemeral",
          "Reply with ok"
        ],
        {
          timeoutMs: 5_000,
          env: {
            PATH: "/usr/bin:/bin",
            OPENAI_API_KEY: "relay-token"
          }
        }
      ]
    ]);
  });

  it("should not duplicate an existing ephemeral flag", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({ type: "turn.completed" }),
      stderr: ""
    }));

    await executeCodexHeadless(
      {
        prompt: "Reply with ok"
      },
      {
        command: {
          runtime: "codex-cli",
          executable: "codex",
          args: ["exec", "--json", "--ephemeral", "Reply with ok"],
          metadata: {
            executionMode: "headless_event_stream",
            safetyIntent: "workspace_write_with_approval",
            machineReadable: true,
            promptIncluded: true,
            resumeRequested: false
          }
        },
        runCommand
      }
    );

    expect(runCommand).toHaveBeenCalledWith(
      "codex",
      ["exec", "--json", "--ephemeral", "Reply with ok"],
      {}
    );
  });

  it("should append the prompt and ephemeral flag when the rendered command omits the prompt", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({ type: "turn.completed" }),
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await executeCodexHeadless(
      {
        prompt: "Reply with ok"
      },
      {
        command: adapter.renderCommand(),
        runCommand
      }
    );

    expect(runCommand).toHaveBeenCalledWith(
      "codex",
      ["exec", "--json", "--ephemeral", "Reply with ok"],
      {}
    );
  });

  it("should append the prompt after profile and inject ephemeral before the prompt", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({ type: "turn.completed" }),
      stderr: ""
    }));

    await executeCodexHeadless(
      {
        prompt: "Reply with ok",
        profile: "project-managed"
      } as never,
      {
        command: {
          runtime: "codex-cli",
          executable: "codex",
          args: ["exec", "--json", "--profile", "project-managed"],
          metadata: {
            executionMode: "headless_event_stream",
            safetyIntent: "workspace_write_with_approval",
            machineReadable: true,
            promptIncluded: false,
            resumeRequested: false
          }
        },
        runCommand
      }
    );

    expect(runCommand).toHaveBeenCalledWith(
      "codex",
      [
        "exec",
        "--json",
        "--profile",
        "project-managed",
        "--ephemeral",
        "Reply with ok"
      ],
      {}
    );
  });

  it("should inject the ephemeral flag before prompts that look like flags", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({ type: "turn.completed" }),
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await executeCodexHeadless(
      {
        prompt: "-reply"
      },
      {
        command: adapter.renderCommand({ prompt: "-reply" }),
        runCommand
      }
    );

    expect(runCommand).toHaveBeenCalledWith(
      "codex",
      ["exec", "--json", "--ephemeral", "-reply"],
      {}
    );
  });

  it("should preserve profile ordering when the prompt looks like a flag", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({ type: "turn.completed" }),
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await executeCodexHeadless(
      {
        prompt: "-reply",
        profile: "project-managed"
      } as never,
      {
        command: adapter.renderCommand({
          prompt: "-reply",
          profile: "project-managed"
        } as never),
        runCommand
      }
    );

    expect(runCommand).toHaveBeenCalledWith(
      "codex",
      [
        "exec",
        "--json",
        "--profile",
        "project-managed",
        "--ephemeral",
        "-reply"
      ],
      {}
    );
  });

  it("should allow explicit resolveEnvironment for custom runner paths", async () => {
    const stdout = await readFixture("success.observed.jsonl");
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout,
      stderr: ""
    }));
    const resolveEnvironment = vi.fn(async () => ({
      PATH: "/usr/bin:/bin",
      OPENAI_API_KEY: "relay-token"
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await executeCodexHeadless(
      {
        prompt: "Reply with ok",
        profile: "project-managed",
        timeoutMs: 5_000
      } as never,
      {
        command: adapter.renderCommand({
          prompt: "Reply with ok",
          profile: "project-managed"
        } as never),
        runCommand,
        resolveEnvironment
      }
    );

    expect(resolveEnvironment).toHaveBeenCalledTimes(1);
    expect(runCommand).toHaveBeenCalledWith(
      "codex",
      [
        "exec",
        "--json",
        "--profile",
        "project-managed",
        "--ephemeral",
        "Reply with ok"
      ],
      {
        timeoutMs: 5_000,
        env: {
          PATH: "/usr/bin:/bin",
          OPENAI_API_KEY: "relay-token"
        }
      }
    );
  });

  it("should preserve non-zero exit codes instead of throwing", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 17,
      stdout: JSON.stringify({ type: "turn.completed", status: "failed" }),
      stderr: "codex failed"
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await expect(
      executeCodexHeadless(
        { prompt: "Reply with ok", timeoutMs: 5000 },
        {
          command: adapter.renderCommand({ prompt: "Reply with ok" }),
          runCommand
        }
      )
    ).resolves.toMatchObject({
      exitCode: 17,
      stderr: "codex failed",
      observation: {
        runCompleted: true,
        turnStatus: "failed",
        errorEventCount: 0
      },
      events: [
        {
          kind: "run_completed",
          rawType: "turn.completed"
        }
      ]
    });
  });

  it("should derive observation fields from truncated event streams", async () => {
    const stdout = await readFixture("truncated-stream.jsonl");
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout,
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await expect(
      executeCodexHeadless(
        {
          prompt: "Reply with ok",
          timeoutMs: 5000,
          attempt: {
            attemptId: "att_partial"
          }
        },
        {
          command: adapter.renderCommand({ prompt: "Reply with ok" }),
          runCommand
        }
      )
    ).resolves.toMatchObject({
      exitCode: 0,
      observation: {
        threadId: "thr_demo",
        runCompleted: false,
        lastAgentMessage: "partial",
        errorEventCount: 0
      },
      controlPlane: {
        sessionSnapshot: {
          node: {
            attemptId: "att_partial",
            nodeKind: "root",
            sourceKind: "direct"
          },
          lifecycleState: "active",
          sessionRef: {
            runtime: "codex-cli",
            sessionId: "thr_demo"
          }
        }
      }
    });
  });

  it("should derive error observations from canonical error events", async () => {
    const stdout = await readFixture("error-event.jsonl");
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout,
      stderr: "codex failed"
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await expect(
      executeCodexHeadless(
        { prompt: "Reply with ok", timeoutMs: 5000 },
        {
          command: adapter.renderCommand({ prompt: "Reply with ok" }),
          runCommand
        }
      )
    ).resolves.toMatchObject({
      exitCode: 0,
      stderr: "codex failed",
      observation: {
        runCompleted: false,
        errorEventCount: 1,
        lastErrorMessage: "codex failed"
      }
    });
  });

  it("should reject non-headless rendered commands", async () => {
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await expect(
      executeCodexHeadless(
        { prompt: "Reply with ok" },
        {
          command: adapter.renderCommand({
            executionMode: "interactive_terminal",
            prompt: "Reply with ok"
          })
        }
      )
    ).rejects.toThrow(ValidationError);
  });

  it("should surface runner failures together with the command diagnostics", async () => {
    const runCommand = vi.fn(async () => {
      throw new RuntimeError("Command codex timed out after 5000ms.", {
        kind: "timeout",
        diagnostics: {
          executable: "codex",
          args: ["exec", "--json", "--ephemeral", "Reply with ok"],
          stdout: "partial stdout",
          stderr: "partial stderr",
          timeoutMs: 5_000
        }
      });
    });
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await expect(
      executeCodexHeadless(
        { prompt: "Reply with ok", timeoutMs: 5_000 },
        {
          command: adapter.renderCommand({ prompt: "Reply with ok" }),
          runCommand
        }
      )
    ).rejects.toMatchObject({
      message: "Command codex timed out after 5000ms.",
      causeValue: {
        command: {
          executable: "codex",
          args: ["exec", "--json", "--ephemeral", "Reply with ok"]
        },
        kind: "timeout",
        diagnostics: {
          stdout: "partial stdout",
          stderr: "partial stderr"
        }
      }
    });
  });

  it("should fail when stdout cannot be parsed as jsonl", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 0,
      stdout: "{invalid json",
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await expect(
      executeCodexHeadless(
        { prompt: "Reply with ok", timeoutMs: 5000 },
        {
          command: adapter.renderCommand({ prompt: "Reply with ok" }),
          runCommand
        }
      )
    ).rejects.toMatchObject({
      message: "Failed to parse Codex headless event stream.",
      causeValue: {
        command: {
          executable: "codex",
          args: ["exec", "--json", "--ephemeral", "Reply with ok"]
        },
        exitCode: 0,
        stdout: "{invalid json",
        stderr: ""
      }
    });
  });

  it("should reject blank prompts before executing the helper", async () => {
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));
    const runCommand = vi.fn();

    await expect(
      executeCodexHeadless(
        { prompt: "   " },
        {
          command: adapter.renderCommand({ prompt: "Reply with ok" }),
          runCommand
        }
      )
    ).rejects.toThrow(ValidationError);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("should reject blank profiles before adapter.executeHeadless invokes the runner", async () => {
    const runner = vi.fn(async () => ({
        exitCode: 0,
        stdout: JSON.stringify({ type: "turn.completed" }),
        stderr: ""
      }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"), {
      runner
    });

    await expect(
      adapter.executeHeadless({
        prompt: "Reply with ok",
        profile: "   "
      } as never)
    ).rejects.toThrow(ValidationError);
    expect(runner).not.toHaveBeenCalled();
  });
});

async function loadCodexExecModule(options: {
  accessImpl: typeof import("node:fs/promises").access;
  runSubprocess: typeof import("../../src/adapters/headless.js").runSubprocess;
  resolveCodexCliEnvironment?: () => Promise<NodeJS.ProcessEnv | undefined>;
}): Promise<typeof import("../../src/adapters/codex-cli-exec.js")> {
  vi.resetModules();
  vi.doMock("node:fs/promises", async () => {
    const actual = await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises"
    );

    return {
      ...actual,
      access: options.accessImpl
    };
  });
  vi.doMock("../../src/adapters/headless.js", async () => {
    const actual = await vi.importActual<
      typeof import("../../src/adapters/headless.js")
    >("../../src/adapters/headless.js");

    return {
      ...actual,
      runSubprocess: options.runSubprocess
    };
  });
  vi.doMock("../../src/adapters/codex-cli-env.js", async () => ({
    resolveCodexCliEnvironment:
      options.resolveCodexCliEnvironment ?? (async () => undefined)
  }));

  return import("../../src/adapters/codex-cli-exec.js");
}
