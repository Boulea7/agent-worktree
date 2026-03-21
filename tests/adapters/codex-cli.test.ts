import { describe, expect, it, vi } from "vitest";

import { CodexCliAdapter } from "../../src/adapters/codex-cli.js";
import { getAdapterDescriptor } from "../../src/adapters/catalog.js";
import { RuntimeError, ValidationError } from "../../src/core/errors.js";

describe("CodexCliAdapter", () => {
  it("should reject descriptors for other runtimes", () => {
    expect(
      () =>
        new CodexCliAdapter({
          ...getAdapterDescriptor("codex-cli"),
          runtime: "other-cli"
        })
    ).toThrow(ValidationError);
  });

  it("should use an injected detect probe instead of a real runtime check", async () => {
    const detectImpl = vi.fn(() => false);
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"), {
      detectImpl
    });

    expect(await Promise.resolve(adapter.detect())).toBe(false);
    expect(detectImpl).toHaveBeenCalledTimes(1);
  });

  it("should support an asynchronous detect probe", async () => {
    const detectImpl = vi.fn(async () => true);
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"), {
      detectImpl
    });

    await expect(adapter.detect()).resolves.toBe(true);
    expect(detectImpl).toHaveBeenCalledTimes(1);
  });

  it("should surface detect probe failures", async () => {
    const detectImpl = vi.fn(async () => {
      throw new RuntimeError("probe failed");
    });
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"), {
      detectImpl
    });

    await expect(adapter.detect()).rejects.toThrow("probe failed");
  });

  it("should use the injected runner for default detection semantics", async () => {
    const runner = vi.fn(async () => ({
      exitCode: 0,
      stdout: "Usage: codex exec\n  --json\n",
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"), {
      runner
    });

    await expect(adapter.detect()).resolves.toBe(true);
    expect(runner).toHaveBeenCalledWith(
      "codex",
      ["exec", "--help"],
      expect.objectContaining({
        timeoutMs: 5_000
      })
    );
  });

  it("should render a stable headless command structure", () => {
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    expect(
      adapter.renderCommand({
        cwd: "/tmp/codex-demo",
        prompt: "Summarize the diff"
      })
    ).toEqual({
      runtime: "codex-cli",
      executable: "codex",
      args: ["exec", "--json", "Summarize the diff"],
      cwd: "/tmp/codex-demo",
      metadata: {
        executionMode: "headless_event_stream",
        safetyIntent: "workspace_write_with_approval",
        machineReadable: true,
        promptIncluded: true,
        resumeRequested: false
      }
    });
  });

  it("should render headless commands without prompt or cwd when omitted", () => {
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    expect(adapter.renderCommand()).toEqual({
      runtime: "codex-cli",
      executable: "codex",
      args: ["exec", "--json"],
      metadata: {
        executionMode: "headless_event_stream",
        safetyIntent: "workspace_write_with_approval",
        machineReadable: true,
        promptIncluded: false,
        resumeRequested: false
      }
    });
  });

  it("should preserve interactive rendering as non-machine-readable", () => {
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    expect(
      adapter.renderCommand({
        executionMode: "interactive_terminal",
        safetyIntent: "plan_readonly",
        prompt: "Continue the current interactive session."
      })
    ).toEqual({
      runtime: "codex-cli",
      executable: "codex",
      args: ["Continue the current interactive session."],
      metadata: {
        executionMode: "interactive_terminal",
        safetyIntent: "plan_readonly",
        machineReadable: false,
        promptIncluded: true,
        resumeRequested: false
      }
    });
  });

  it("should render interactive commands without prompt when omitted", () => {
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    expect(
      adapter.renderCommand({
        executionMode: "interactive_terminal"
      })
    ).toEqual({
      runtime: "codex-cli",
      executable: "codex",
      args: [],
      metadata: {
        executionMode: "interactive_terminal",
        safetyIntent: "workspace_write_with_approval",
        machineReadable: false,
        promptIncluded: false,
        resumeRequested: false
      }
    });
  });

  it("should reject resume rendering until the adapter supports it", () => {
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    expect(() =>
      adapter.renderCommand({
        executionMode: "interactive_terminal",
        resumeSessionId: "sess_demo"
      })
    ).toThrow(ValidationError);
  });

  it("should report canonical event parsing as supported once the parser lands", () => {
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    expect(adapter.supportsCapability("eventStreamParsing")).toBe(true);
  });

  it("should degrade resume as unsupported in the current thin adapter foundation", () => {
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    expect(adapter.degradeUnsupportedCapability("resume")).toMatchObject({
      ok: false,
      kind: "unsupported_capability",
      runtime: "codex-cli",
      capability: "resume",
      supported: false,
      canProceed: true
    });
  });

  it("should delegate bounded headless execution through the injected runner and parser", async () => {
    const runner = vi.fn(async () => ({
      exitCode: 0,
      stdout: "diagnostic stdout",
      stderr: ""
    }));
    const parseEventStream = vi.fn(() => [
      {
        kind: "unknown" as const,
        rawType: "diagnostic",
        payload: {
          line: "diagnostic stdout"
        },
        index: 0
      }
    ]);
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"), {
      runner,
      parseEventStream
    });
    const abortController = new AbortController();

    await expect(
      adapter.executeHeadless({
        cwd: "/tmp/codex-demo",
        prompt: "Reply with ok",
        attempt: {
          attemptId: "att_demo",
          sourceKind: "fork",
          parentAttemptId: "att_parent"
        },
        timeoutMs: 2_500,
        abortSignal: abortController.signal
      })
    ).resolves.toMatchObject({
      exitCode: 0,
      stdout: "diagnostic stdout",
      observation: {
        runCompleted: false,
        errorEventCount: 0
      },
      controlPlane: {
        sessionSnapshot: {
          node: {
            attemptId: "att_demo",
            nodeKind: "child",
            sourceKind: "fork",
            parentAttemptId: "att_parent"
          },
          lifecycleState: "created",
          runCompleted: false,
          errorEventCount: 0
        }
      },
      events: [
        {
          kind: "unknown",
          rawType: "diagnostic"
        }
      ]
    });
    expect(runner).toHaveBeenCalledWith(
      "codex",
      ["exec", "--json", "--ephemeral", "Reply with ok"],
      {
        cwd: "/tmp/codex-demo",
        timeoutMs: 2_500,
        abortSignal: abortController.signal
      }
    );
    expect(parseEventStream).toHaveBeenCalledWith("diagnostic stdout");
  });

  it("should reject contradictory attempt lineage before delegating to the runner", async () => {
    const runner = vi.fn(async () => ({
      exitCode: 0,
      stdout: "",
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"), {
      runner
    });

    await expect(
      adapter.executeHeadless({
        prompt: "Reply with ok",
        attempt: {
          attemptId: "att_invalid",
          sourceKind: "direct",
          parentAttemptId: "att_parent"
        }
      })
    ).rejects.toThrow(ValidationError);
    expect(runner).not.toHaveBeenCalled();
  });

  it("should reject blank headless prompts", async () => {
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));

    await expect(
      adapter.executeHeadless({
        prompt: "   "
      })
    ).rejects.toThrow(ValidationError);
  });
});
