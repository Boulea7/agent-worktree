import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

import { RuntimeError, ValidationError } from "../core/errors.js";
import {
  deriveSessionNodeRef,
  deriveSessionSnapshot
} from "../control-plane/derive.js";
import { deriveCodexExecutionObservation } from "./codex-cli-observation.js";
import {
  runSubprocess,
  type SubprocessFailure,
  type SubprocessRunner
} from "./headless.js";
import { parseCodexCliJsonl } from "./codex-cli-parser.js";
import type {
  CanonicalAdapterEvent,
  HeadlessExecutionInput,
  HeadlessExecutionResult,
  RenderedCommand
} from "./types.js";

const detectTimeoutMs = 5_000;

export interface CodexExecutionOptions {
  parseEventStream?: (output: string) => CanonicalAdapterEvent[];
  runner?: SubprocessRunner;
}

export async function detectCodexCli(
  runner: SubprocessRunner = runSubprocess
): Promise<boolean> {
  try {
    return (await resolveCodexExecutableForExecution(runner)) !== null;
  } catch {
    return false;
  }
}

export async function executeCodexHeadless(
  input: HeadlessExecutionInput,
  options: CodexExecutionOptions & {
    command: RenderedCommand;
    runCommand?: SubprocessRunner;
  }
): Promise<HeadlessExecutionResult> {
  if (input.prompt.trim().length === 0) {
    throw new ValidationError(
      "Codex headless execution requires a non-empty prompt."
    );
  }

  if (input.attempt !== undefined) {
    deriveSessionNodeRef(input.attempt);
  }

  const command = withEphemeralFlag(withHeadlessPrompt(options.command, input.prompt));

  if (command.metadata.executionMode !== "headless_event_stream") {
    throw new ValidationError(
      "Codex headless execution requires a headless_event_stream rendered command."
    );
  }

  const runner = options.runCommand ?? options.runner ?? runSubprocess;
  const executable =
    command.executable === "codex"
      ? (await resolveCodexExecutableForExecution(runner)) ?? command.executable
      : command.executable;
  const executableCommand =
    executable === command.executable
      ? command
      : {
          ...command,
          executable
        };
  const parseEventStream = options.parseEventStream ?? parseCodexCliJsonl;
  const invocation = {
    ...(executableCommand.cwd === undefined ? {} : { cwd: executableCommand.cwd }),
    ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
    ...(input.abortSignal === undefined
      ? {}
          : { abortSignal: input.abortSignal })
  };
  let result: Awaited<ReturnType<SubprocessRunner>>;

  try {
    result = await runner(executableCommand.executable, executableCommand.args, invocation);
  } catch (error) {
    throw createHeadlessExecutionError(executableCommand, error);
  }

  let events: CanonicalAdapterEvent[];

  try {
    events = parseEventStream(result.stdout);
  } catch (error) {
    throw new RuntimeError("Failed to parse Codex headless event stream.", {
      command: executableCommand,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      cause: error
    });
  }

  const observation = deriveCodexExecutionObservation(events);

  return {
    command: executableCommand,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    events,
    observation,
    ...(input.attempt === undefined
      ? {}
      : {
          controlPlane: {
            sessionSnapshot: deriveSessionSnapshot({
              ...input.attempt,
              runtime: executableCommand.runtime,
              observation
            })
          }
        })
  };
}

export const detectCodexCliSupport = detectCodexCli;
export const executeRenderedHeadlessCommand = executeCodexHeadless;

export interface ResolveCodexExecutableOptions {
  pathCandidates?: string[];
  scanPathCandidates?: boolean;
}

/**
 * Internal-only helper for the bounded codex-cli execution slice.
 * This is intentionally scoped to codex executable probing and is not a
 * runtime-generic command resolution framework.
 * Default-runner behavior may scan PATH candidates before falling back to the
 * literal `codex` command name. Injected runners stay narrower unless tests
 * opt into PATH-like candidate scanning explicitly.
 */
export async function resolveCodexExecutableForExecution(
  runner: SubprocessRunner,
  options: ResolveCodexExecutableOptions = {}
): Promise<string | null> {
  const scanPathCandidates = options.scanPathCandidates ?? runner === runSubprocess;

  if (scanPathCandidates) {
    const candidates = options.pathCandidates ?? (await listCodexExecutableCandidates("codex"));

    for (const candidate of candidates) {
      if (await probeCodexExecJsonSupport(runner, candidate)) {
        return candidate;
      }
    }
  }

  return (await probeCodexExecJsonSupport(runner, "codex")) ? "codex" : null;
}

export async function probeCodexExecJsonSupport(
  runner: SubprocessRunner,
  executable: string
): Promise<boolean> {
  try {
    const result = await runner(executable, ["exec", "--help"], {
      timeoutMs: detectTimeoutMs
    });

    if (result.exitCode !== 0) {
      return false;
    }

    return `${result.stdout}\n${result.stderr}`.includes("--json");
  } catch {
    return false;
  }
}

async function listCodexExecutableCandidates(command: string): Promise<string[]> {
  const rawPath = process.env.PATH ?? "";

  if (rawPath.length === 0) {
    return [];
  }

  const suffixes = getExecutableSuffixes(command);
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const entry of rawPath.split(path.delimiter)) {
    if (entry.length === 0) {
      continue;
    }

    for (const suffix of suffixes) {
      const candidate = path.join(entry, `${command}${suffix}`);

      if (seen.has(candidate)) {
        continue;
      }

      seen.add(candidate);

      try {
        await access(candidate, fsConstants.X_OK);
        candidates.push(candidate);
      } catch {
        continue;
      }
    }
  }

  return candidates;
}

function getExecutableSuffixes(command: string): string[] {
  if (process.platform !== "win32" || path.extname(command).length > 0) {
    return [""];
  }

  const pathExt = process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM";
  return pathExt.split(";").map((extension) => extension.toLowerCase());
}

function createHeadlessExecutionError(
  command: RenderedCommand,
  error: unknown
): RuntimeError {
  if (error instanceof RuntimeError) {
    return new RuntimeError(error.message, {
      command,
      ...(isSubprocessFailure(error.causeValue)
        ? error.causeValue
        : { cause: error.causeValue })
    });
  }

  return new RuntimeError(
    "Codex headless execution failed before producing a structured result.",
    {
      command,
      cause: error
    }
  );
}

function isSubprocessFailure(value: unknown): value is SubprocessFailure {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return "kind" in value && "diagnostics" in value;
}

function withEphemeralFlag(command: RenderedCommand): RenderedCommand {
  if (command.args.includes("--ephemeral")) {
    return command;
  }

  const args = command.metadata.promptIncluded
    ? [
        ...command.args.slice(0, -1),
        "--ephemeral",
        command.args.at(-1)!
      ]
    : [...command.args, "--ephemeral"];

  return {
    ...command,
    args
  };
}

function withHeadlessPrompt(
  command: RenderedCommand,
  prompt: string
): RenderedCommand {
  const args = command.metadata.promptIncluded
    ? [...command.args.slice(0, -1), prompt]
    : [...command.args, prompt];

  return {
    ...command,
    args,
    metadata: {
      ...command.metadata,
      promptIncluded: true
    }
  };
}
