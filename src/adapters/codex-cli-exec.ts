import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

import { RuntimeError, ValidationError } from "../core/errors.js";
import {
  deriveSessionNodeRef,
  deriveSessionSnapshot
} from "../control-plane/derive.js";
import { deriveCodexExecutionObservation } from "./codex-cli-observation.js";
import { resolveCodexCliEnvironment } from "./codex-cli-env.js";
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

export const codexCliCompatibilityDiagnosisCodes = [
  "exec_json_supported",
  "exec_json_unavailable"
] as const;

export type CodexCliCompatibilityDiagnosisCode =
  (typeof codexCliCompatibilityDiagnosisCodes)[number];

export interface CodexCliCompatibilityProbe {
  diagnosisCode: CodexCliCompatibilityDiagnosisCode;
  summary: string;
  supported: boolean;
}

export const codexCliCompatibilitySmokeStatuses = [
  "passed",
  "failed",
  "skipped",
  "error"
] as const;

export type CodexCliCompatibilitySmokeStatus =
  (typeof codexCliCompatibilitySmokeStatuses)[number];

export const codexCliCompatibilitySmokeDiagnosisCodes = [
  "smoke_passed",
  "gate_disabled",
  "detect_unavailable",
  "execution_failed",
  "unexpected_error"
] as const;

export type CodexCliCompatibilitySmokeDiagnosisCode =
  (typeof codexCliCompatibilitySmokeDiagnosisCodes)[number];

export interface CodexCliCompatibilitySmoke {
  diagnosisCode: CodexCliCompatibilitySmokeDiagnosisCode;
  smokeStatus: CodexCliCompatibilitySmokeStatus;
  summary: string;
}

export interface CodexCliCompatibilitySmokeOptions extends CodexExecutionOptions {
  cwd?: string;
  detectImpl?: () => boolean | Promise<boolean>;
  env?: NodeJS.ProcessEnv;
  executeHeadlessImpl?: (
    input: HeadlessExecutionInput,
    options: CodexExecutionOptions & {
      command: RenderedCommand;
      runCommand?: SubprocessRunner;
    }
  ) => Promise<HeadlessExecutionResult>;
  runCommand?: SubprocessRunner;
}

export const codexCliCompatibilitySmokePrompt = "Reply with exactly: ok";
export const codexCliCompatibilitySmokeTimeoutMs = 60_000;

export interface CodexExecutionOptions {
  parseEventStream?: (output: string) => CanonicalAdapterEvent[];
  resolveEnvironment?: () => Promise<NodeJS.ProcessEnv | undefined>;
  runner?: SubprocessRunner;
}

export function normalizeCodexCliProfile(
  profile: string | undefined
): string | undefined {
  if (profile === undefined) {
    return undefined;
  }

  const normalizedProfile = profile.trim();

  if (normalizedProfile.length === 0) {
    throw new ValidationError(
      "codex-cli profile must not be blank when provided."
    );
  }

  return normalizedProfile;
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

export async function probeCodexCliCompatibility(
  runner: SubprocessRunner = runSubprocess
): Promise<CodexCliCompatibilityProbe> {
  const executable = await resolveCodexExecutableForExecution(runner);

  if (executable === null) {
    return {
      supported: false,
      diagnosisCode: "exec_json_unavailable",
      summary: "No local codex executable with `exec --json` support was confirmed."
    };
  }

  return {
    supported: true,
    diagnosisCode: "exec_json_supported",
    summary: "A local codex executable with `exec --json` support was confirmed."
  };
}

export async function smokeCodexCliCompatibility(
  options: CodexCliCompatibilitySmokeOptions = {}
): Promise<CodexCliCompatibilitySmoke> {
  if (!isCodexCliSmokeEnabled(options.env ?? process.env)) {
    return {
      smokeStatus: "skipped",
      diagnosisCode: "gate_disabled",
      summary: "Compatibility smoke is skipped unless `RUN_CODEX_SMOKE=1` is set."
    };
  }

  const runner = options.runCommand ?? options.runner ?? runSubprocess;
  const detectImpl = options.detectImpl ?? (() => detectCodexCli(runner));
  const executeHeadlessImpl =
    options.executeHeadlessImpl ?? executeCodexHeadless;

  let detected = false;

  try {
    detected = await detectImpl();
  } catch {
    detected = false;
  }

  if (!detected) {
    return {
      smokeStatus: "failed",
      diagnosisCode: "detect_unavailable",
      summary:
        "No local codex executable with `exec --json` support was confirmed before smoke execution."
    };
  }

  try {
    const result = await executeHeadlessImpl(
      {
        cwd: options.cwd ?? process.cwd(),
        prompt: codexCliCompatibilitySmokePrompt,
        timeoutMs: codexCliCompatibilitySmokeTimeoutMs
      },
      {
        command: createCodexCliSmokeCommand(options.cwd ?? process.cwd()),
        ...(options.parseEventStream === undefined
          ? {}
          : { parseEventStream: options.parseEventStream }),
        ...(options.resolveEnvironment === undefined
          ? {}
          : { resolveEnvironment: options.resolveEnvironment }),
        runCommand: runner
      }
    );

    if (!satisfiesCodexCliCompatibilitySmoke(result)) {
      return {
        smokeStatus: "failed",
        diagnosisCode: "execution_failed",
        summary:
          "The bounded codex-cli smoke path did not satisfy the public compatibility checks."
      };
    }

    return {
      smokeStatus: "passed",
      diagnosisCode: "smoke_passed",
      summary:
        "The bounded codex-cli smoke path completed the public compatibility checks."
    };
  } catch (error) {
    if (error instanceof RuntimeError || error instanceof ValidationError) {
      return {
        smokeStatus: "failed",
        diagnosisCode: "execution_failed",
        summary:
          "The bounded codex-cli smoke path did not satisfy the public compatibility checks."
      };
    }

    return {
      smokeStatus: "error",
      diagnosisCode: "unexpected_error",
      summary:
        "The bounded codex-cli smoke path did not complete successfully."
    };
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

  validateExplicitCodexProfile(input);

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
  const resolveEnvironment =
    options.resolveEnvironment ??
    (options.runCommand === undefined && options.runner === undefined
      ? resolveCodexCliEnvironment
      : undefined);
  const resolvedEnv =
    resolveEnvironment === undefined ? undefined : await resolveEnvironment();
  const invocation = {
    ...(executableCommand.cwd === undefined ? {} : { cwd: executableCommand.cwd }),
    ...(resolvedEnv === undefined ? {} : { env: resolvedEnv }),
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

function isCodexCliSmokeEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.RUN_CODEX_SMOKE === "1";
}

function createCodexCliSmokeCommand(cwd: string): RenderedCommand {
  return {
    runtime: "codex-cli",
    executable: "codex",
    cwd,
    args: ["exec", "--json"],
    metadata: {
      executionMode: "headless_event_stream",
      machineReadable: true,
      promptIncluded: false,
      resumeRequested: false,
      safetyIntent: "workspace_write_with_approval"
    }
  };
}

function satisfiesCodexCliCompatibilitySmoke(
  result: HeadlessExecutionResult
): boolean {
  return (
    result.exitCode === 0 &&
    result.command.args.filter((arg) => arg === "--ephemeral").length === 1 &&
    result.command.args.includes("--ephemeral") &&
    result.command.args.at(-1) === codexCliCompatibilitySmokePrompt &&
    /(^codex$|[\\/]codex(?:\.(?:exe|cmd|bat|com))?$)/iu.test(
      result.command.executable
    ) &&
    result.observation.runCompleted === true &&
    result.observation.errorEventCount === 0 &&
    hasCodexCliSmokeEvidence(result)
  );
}

function hasCodexCliSmokeEvidence(result: HeadlessExecutionResult): boolean {
  return (
    result.stdout.trim().length > 0 ||
    result.stderr.trim().length > 0 ||
    result.events.length > 0
  );
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

function validateExplicitCodexProfile(input: HeadlessExecutionInput): void {
  if (!("profile" in input)) {
    return;
  }

  const explicitProfile = (input as HeadlessExecutionInput & { profile?: unknown })
    .profile;

  if (explicitProfile === undefined) {
    return;
  }

  if (typeof explicitProfile !== "string") {
    throw new ValidationError("codex-cli profile must be a string when provided.");
  }

  normalizeCodexCliProfile(explicitProfile);
}
