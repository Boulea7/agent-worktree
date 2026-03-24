import { spawn, type SpawnOptions } from "node:child_process";

import { RuntimeError } from "../core/errors.js";

export interface SubprocessInvocation {
  abortSignal?: AbortSignal;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export interface SubprocessResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

export const subprocessFailureKinds = [
  "aborted",
  "spawn_error",
  "signal_terminated",
  "stdio_unavailable",
  "timeout"
] as const;

export type SubprocessFailureKind = (typeof subprocessFailureKinds)[number];

export interface SubprocessFailureDiagnostics {
  args: string[];
  cwd?: string;
  executable: string;
  exitCode?: number;
  signal?: NodeJS.Signals | null;
  stderr: string;
  stdout: string;
  timeoutMs: number;
}

export interface SubprocessFailure {
  cause?: unknown;
  diagnostics: SubprocessFailureDiagnostics;
  kind: SubprocessFailureKind;
}

export type SubprocessRunner = (
  executable: string,
  args: string[],
  options?: SubprocessInvocation
) => Promise<SubprocessResult>;

export type SpawnProcess = (
  executable: string,
  args: string[],
  options: SpawnOptions
) => ReturnType<typeof spawn>;

const defaultTimeoutMs = 30_000;

export function createSubprocessRunner(
  spawnProcess: SpawnProcess = spawn
): SubprocessRunner {
  return (executable, args, options = {}) =>
    new Promise<SubprocessResult>((resolve, reject) => {
      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];
      const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
      const timeoutController = new AbortController();
      const externalAbortSignal = options.abortSignal;
      let settled = false;
      let interruptionKind: "aborted" | "timeout" | undefined;

      const handleExternalAbort = () => {
        interruptionKind = "aborted";
        timeoutController.abort();
      };

      if (externalAbortSignal) {
        if (externalAbortSignal.aborted) {
          reject(
            new RuntimeError(`Command ${executable} was aborted before start.`, {
              diagnostics: createFailureDiagnostics({
                executable,
                args,
                cwd: options.cwd,
                timeoutMs,
                stdoutChunks,
                stderrChunks
              }),
              kind: "aborted"
            } satisfies SubprocessFailure)
          );
          return;
        }

        externalAbortSignal.addEventListener("abort", handleExternalAbort, {
          once: true
        });
      }

      const timer = setTimeout(() => {
        interruptionKind = "timeout";
        timeoutController.abort();
      }, timeoutMs);
      timer.unref?.();

      const cleanup = (): void => {
        clearTimeout(timer);
        if (externalAbortSignal) {
          externalAbortSignal.removeEventListener("abort", handleExternalAbort);
        }
      };

      const settleWithError = (
        message: string,
        failure: SubprocessFailure
      ): void => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(new RuntimeError(message, failure));
      };

      const settleWithResult = (result: SubprocessResult): void => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve(result);
      };

      let child: ReturnType<typeof spawn>;

      try {
        child = spawnProcess(executable, args, {
          cwd: options.cwd,
          env: options.env,
          signal: timeoutController.signal,
          stdio: ["ignore", "pipe", "pipe"]
        });
      } catch (error) {
        settleWithError(`Failed to start command ${executable}.`, {
          kind: "spawn_error",
          diagnostics: createFailureDiagnostics({
            executable,
            args,
            cwd: options.cwd,
            timeoutMs,
            stdoutChunks,
            stderrChunks
          }),
          cause: error
        });
        return;
      }

      if (!child.stdout || !child.stderr) {
        settleWithError(
          `Command ${executable} did not expose piped stdio streams.`,
          {
            kind: "stdio_unavailable",
            diagnostics: createFailureDiagnostics({
              executable,
              args,
              cwd: options.cwd,
              timeoutMs,
              stdoutChunks,
              stderrChunks
            })
          }
        );
        return;
      }

      child.stdout.on("data", (chunk: Buffer | string) => {
        stdoutChunks.push(chunk.toString());
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderrChunks.push(chunk.toString());
      });

      child.once("error", (error) => {
        if (interruptionKind) {
          settleWithError(
            interruptionKind === "timeout"
              ? `Command ${executable} timed out after ${timeoutMs}ms.`
              : `Command ${executable} was aborted.`,
            {
              kind: interruptionKind,
              diagnostics: createFailureDiagnostics({
                executable,
                args,
                cwd: options.cwd,
                timeoutMs,
                stdoutChunks,
                stderrChunks
              }),
              cause: error
            }
          );
          return;
        }

        settleWithError(`Failed to start command ${executable}.`, {
          kind: "spawn_error",
          diagnostics: createFailureDiagnostics({
            executable,
            args,
            cwd: options.cwd,
            timeoutMs,
            stdoutChunks,
            stderrChunks
          }),
          cause: error
        });
      });

      child.once("close", (code, signal) => {
        if (interruptionKind) {
          settleWithError(
            interruptionKind === "timeout"
              ? `Command ${executable} timed out after ${timeoutMs}ms.`
              : `Command ${executable} was aborted.`,
            {
              kind: interruptionKind,
              diagnostics: createFailureDiagnostics({
                executable,
                args,
                cwd: options.cwd,
                timeoutMs,
                stdoutChunks,
                stderrChunks,
                ...(code === null ? {} : { exitCode: code }),
                signal
              })
            }
          );
          return;
        }

        if (signal !== null) {
          settleWithError(
            `Command ${executable} terminated with signal ${signal}.`,
            {
              kind: "signal_terminated",
              diagnostics: createFailureDiagnostics({
                executable,
                args,
                cwd: options.cwd,
                timeoutMs,
                stdoutChunks,
                stderrChunks,
                ...(code === null ? {} : { exitCode: code }),
                signal
              })
            }
          );
          return;
        }

        settleWithResult({
          exitCode: code ?? 1,
          stdout: stdoutChunks.join(""),
          stderr: stderrChunks.join("")
        });
      });
    });
}

export const runSubprocess: SubprocessRunner = createSubprocessRunner();

interface FailureDiagnosticsInput {
  args: string[];
  cwd?: string | undefined;
  executable: string;
  exitCode?: number | undefined;
  signal?: NodeJS.Signals | null | undefined;
  stderrChunks: string[];
  stdoutChunks: string[];
  timeoutMs: number;
}

function createFailureDiagnostics(
  input: FailureDiagnosticsInput
): SubprocessFailureDiagnostics {
  return {
    executable: input.executable,
    args: [...input.args],
    ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
    ...(input.exitCode === undefined ? {} : { exitCode: input.exitCode }),
    ...(input.signal === undefined ? {} : { signal: input.signal }),
    stdout: input.stdoutChunks.join(""),
    stderr: input.stderrChunks.join(""),
    timeoutMs: input.timeoutMs
  };
}
