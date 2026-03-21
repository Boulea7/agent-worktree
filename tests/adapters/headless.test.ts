import { EventEmitter } from "node:events";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSubprocessRunner,
  type SpawnProcess
} from "../../src/adapters/headless.js";
import { RuntimeError } from "../../src/core/errors.js";

class FakeStream extends EventEmitter {}

class FakeChildProcess extends EventEmitter {
  public stderr: FakeStream | null = new FakeStream();
  public stdout: FakeStream | null = new FakeStream();
}

describe("createSubprocessRunner", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should reject when spawn throws synchronously", async () => {
    const runner = createSubprocessRunner((() => {
      throw new Error("spawn exploded");
    }) as SpawnProcess);

    await expectRuntimeError(
      runner("codex", ["exec", "--json"]),
      "Failed to start command codex.",
      "spawn_error"
    );
  });

  it("should reject when piped stdio streams are unavailable", async () => {
    const child = new FakeChildProcess();
    child.stdout = null;

    const runner = createSubprocessRunner(
      (() => child) as unknown as SpawnProcess
    );

    await expectRuntimeError(
      runner("codex", ["exec", "--json"]),
      "Command codex did not expose piped stdio streams.",
      "stdio_unavailable"
    );
  });

  it("should reject when the child emits an error before close", async () => {
    const child = new FakeChildProcess();
    const runner = createSubprocessRunner(
      (() => child) as unknown as SpawnProcess
    );
    const execution = runner("codex", ["exec", "--json"], {
      cwd: "/tmp/codex-demo"
    });
    const assertion = expectRuntimeError(
      execution,
      "Failed to start command codex.",
      "spawn_error"
    );

    child.emit("error", new Error("spawn failed"));

    await assertion;
  });

  it("should reject when the command times out", async () => {
    vi.useFakeTimers();

    const child = new FakeChildProcess();
    const runner = createSubprocessRunner(
      ((
        _executable: string,
        _args: string[],
        options: Parameters<SpawnProcess>[2]
      ) => {
        options.signal?.addEventListener("abort", () => {
          child.emit("error", new Error("AbortError"));
          child.emit("close", null, "SIGTERM");
        });
        return child;
      }) as unknown as SpawnProcess
    );
    const execution = runner("codex", ["exec", "--json"], {
      timeoutMs: 250
    });
    const assertion = expectRuntimeError(
      execution,
      "Command codex timed out after 250ms.",
      "timeout"
    );

    await vi.advanceTimersByTimeAsync(250);

    await assertion;
  });

  it("should reject when the external abort signal fires before spawn", async () => {
    const controller = new AbortController();
    controller.abort();
    const runner = createSubprocessRunner(
      vi.fn((() => new FakeChildProcess()) as unknown as SpawnProcess)
    );

    await expectRuntimeError(
      runner("codex", ["exec", "--json"], {
        abortSignal: controller.signal
      }),
      "Command codex was aborted before start.",
      "aborted"
    );
  });

  it("should reject when the external abort signal fires after spawn", async () => {
    const child = new FakeChildProcess();
    const controller = new AbortController();
    const runner = createSubprocessRunner(
      ((
        _executable: string,
        _args: string[],
        options: Parameters<SpawnProcess>[2]
      ) => {
        options.signal?.addEventListener("abort", () => {
          child.emit("error", new Error("AbortError"));
          child.emit("close", null, "SIGTERM");
        });
        return child;
      }) as unknown as SpawnProcess
    );
    const execution = runner("codex", ["exec", "--json"], {
      abortSignal: controller.signal,
      cwd: "/tmp/codex-demo"
    });
    const assertion = expectRuntimeError(
      execution,
      "Command codex was aborted.",
      "aborted"
    );

    controller.abort();

    await assertion;
  });

  it("should reject when the command closes with a signal", async () => {
    const child = new FakeChildProcess();
    const runner = createSubprocessRunner(
      (() => child) as unknown as SpawnProcess
    );
    const execution = runner("codex", ["exec", "--json"]);
    const assertion = expectRuntimeError(
      execution,
      "Command codex terminated with signal SIGTERM.",
      "signal_terminated"
    );

    child.emit("close", null, "SIGTERM");

    await assertion;
  });

  it("should collect stdout and stderr chunks on success", async () => {
    const child = new FakeChildProcess();
    const runner = createSubprocessRunner(
      (() => child) as unknown as SpawnProcess
    );
    const execution = runner("codex", ["exec", "--json"], {
      cwd: "/tmp/codex-demo"
    });

    child.stdout?.emit("data", "out-1");
    child.stdout?.emit("data", "out-2");
    child.stderr?.emit("data", "err-1");
    child.stderr?.emit("data", "err-2");
    child.emit("close", 0, null);

    await expect(execution).resolves.toEqual({
      exitCode: 0,
      stdout: "out-1out-2",
      stderr: "err-1err-2"
    });
  });
});

async function expectRuntimeError(
  promise: Promise<unknown>,
  message: string,
  kind: string
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(RuntimeError);
    expect((error as RuntimeError).message).toBe(message);
    expect((error as RuntimeError).causeValue).toMatchObject({
      kind,
      diagnostics: {
        executable: "codex",
        args: ["exec", "--json"]
      }
    });
    return;
  }

  throw new Error(`Expected RuntimeError with kind ${kind}.`);
}
