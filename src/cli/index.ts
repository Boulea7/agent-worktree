#!/usr/bin/env node

import { Command, CommanderError } from "commander";
import { pathToFileURL } from "node:url";

import {
  buildCompatibilityDoctorData,
  getCompatibilityDescriptor,
  listCompatibilityDescriptors,
  type CompatibilityDoctorData
} from "../compat/index.js";
import { NotImplementedError, ValidationError } from "../core/errors.js";
import { cleanupAttempt, type CleanupAttemptResult } from "../worktree/cleanup.js";
import { listAttempts } from "../worktree/list.js";
import { createAttempt } from "../worktree/create.js";
import { formatHumanError, type CliWriter, writeError, writeSuccess } from "./output.js";

interface CliContext {
  cwd: string;
  doctorImpl: () => Promise<CompatibilityDoctorData>;
  exitCode: number;
  stderr: CliWriter;
  stdout: CliWriter;
}

export interface RunCliOptions {
  cwd?: string;
  doctorImpl?: () => Promise<CompatibilityDoctorData>;
  stderr?: CliWriter;
  stdout?: CliWriter;
}

interface JsonFlagOptions {
  json?: boolean;
}

interface AttemptCreateOptions extends JsonFlagOptions {
  adapter?: string;
  baseRef?: string;
  manifestRoot?: string;
  repoRoot?: string;
  runtime?: string;
  taskId?: string;
  worktreeRoot?: string;
}

interface AttemptListOptions extends JsonFlagOptions {
  manifestRoot?: string;
}

interface AttemptCleanupOptions extends JsonFlagOptions {
  attemptId?: string;
  manifestRoot?: string;
  worktreeRoot?: string;
}

export function buildCli(context: CliContext): Command {
  const program = new Command();
  program
    .name("agent-worktree")
    .description("Git-native orchestration for coding agents.")
    .showHelpAfterError()
    .exitOverride()
    .configureOutput({
      writeOut: (output) => {
        context.stdout.write(output);
      },
      writeErr: (output) => {
        context.stderr.write(output);
      }
    });

  program.command("init").option("--json").action((options: JsonFlagOptions) => {
    writeNotImplemented(context, "init", options.json === true);
  });

  program.command("doctor").option("--json").action(async (options: JsonFlagOptions) => {
    await writeCommandResultAsync(context, "doctor", options.json === true, async () =>
      context.doctorImpl()
    );
  });

  const compat = program.command("compat");

  compat.command("list").option("--json").action((options: JsonFlagOptions) => {
    writeCommandResult(context, "compat.list", options.json === true, () => ({
      tools: listCompatibilityDescriptors()
    }));
  });

  compat
    .command("show")
    .argument("<tool>")
    .option("--json")
    .action((tool: string, options: JsonFlagOptions) => {
      writeCommandResult(context, "compat.show", options.json === true, () => ({
        tool: getCompatibilityDescriptor(tool)
      }));
    });

  const attempt = program.command("attempt");

  attempt
    .command("list")
    .option("--manifest-root <path>")
    .option("--json")
    .action(async (options: AttemptListOptions) => {
      const listOptions =
        options.manifestRoot === undefined
          ? {}
          : { manifestRoot: options.manifestRoot };

      await writeCommandResultAsync(
        context,
        "attempt.list",
        options.json === true,
        async () => ({
          attempts: await listAttempts(listOptions)
        })
      );
    });

  attempt
    .command("cleanup")
    .option("--attempt-id <attemptId>")
    .option("--manifest-root <path>")
    .option("--worktree-root <path>")
    .option("--json")
    .action(async (options: AttemptCleanupOptions) => {
      await writeCommandResultAsync(
        context,
        "attempt.cleanup",
        options.json === true,
        async () => {
          if (!options.attemptId) {
            throw new ValidationError(
              "attempt.cleanup requires --attempt-id."
            );
          }

          return cleanupAttempt({
            attemptId: options.attemptId,
            ...(options.manifestRoot === undefined
              ? {}
              : { manifestRoot: options.manifestRoot }),
            ...(options.worktreeRoot === undefined
              ? {}
              : { worktreeRoot: options.worktreeRoot })
          });
        }
      );
    });

  attempt
    .command("create")
    .option("--task-id <taskId>")
    .option("--runtime <runtime>")
    .option("--adapter <adapter>")
    .option("--base-ref <ref>")
    .option("--repo-root <path>")
    .option("--manifest-root <path>")
    .option("--worktree-root <path>")
    .option("--json")
    .action(async (options: AttemptCreateOptions) => {
      if (!options.taskId) {
        await writeCommandResultAsync(
          context,
          "attempt.create",
          options.json === true,
          async () => {
            throw new ValidationError(
              "attempt.create requires --task-id."
            );
          }
        );
        return;
      }

      const createOptions = {
        taskId: options.taskId,
        repoRoot: options.repoRoot ?? context.cwd,
        ...(options.runtime === undefined ? {} : { runtime: options.runtime }),
        ...(options.adapter === undefined ? {} : { adapter: options.adapter }),
        ...(options.baseRef === undefined ? {} : { baseRef: options.baseRef }),
        ...(options.manifestRoot === undefined
          ? {}
          : { manifestRoot: options.manifestRoot }),
        ...(options.worktreeRoot === undefined
          ? {}
          : { worktreeRoot: options.worktreeRoot })
      };

      await writeCommandResultAsync(
        context,
        "attempt.create",
        options.json === true,
        async () => ({
          attempt: await createAttempt(createOptions)
        })
      );
    });

  for (const commandName of [
    "attach",
    "stop",
    "checkpoint",
    "merge"
  ]) {
    attempt.command(commandName).option("--json").action((options: JsonFlagOptions) => {
      writeNotImplemented(
        context,
        `attempt.${commandName}`,
        options.json === true
      );
    });
  }

  return program;
}

export async function runCli(
  argv: string[],
  options: RunCliOptions = {}
): Promise<number> {
  const context: CliContext = {
    cwd: options.cwd ?? process.cwd(),
    doctorImpl: options.doctorImpl ?? buildCompatibilityDoctorData,
    stdout: options.stdout ?? process.stdout,
    stderr: options.stderr ?? process.stderr,
    exitCode: 0
  };

  const program = buildCli(context);

  try {
    await program.parseAsync(argv, { from: "user" });
    return context.exitCode;
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === "commander.helpDisplayed") {
        return 0;
      }

      return error.exitCode;
    }

    throw error;
  }
}

function writeNotImplemented(
  context: CliContext,
  command: string,
  json: boolean
): void {
  writeCommandResult(context, command, json, () => {
    throw new NotImplementedError(
      `${command} is not implemented in the current phase.`
    );
  });
}

function writeCommandResult<TData>(
  context: CliContext,
  command: string,
  json: boolean,
  getData: () => TData
): void {
  try {
    const data = getData();
    if (json) {
      writeSuccess(context.stdout, command, data);
    } else {
      context.stdout.write(formatHumanSuccess(command, data));
    }
    context.exitCode = 0;
  } catch (error) {
    writeHandledError(context, command, json, error);
  }
}

async function writeCommandResultAsync<TData>(
  context: CliContext,
  command: string,
  json: boolean,
  getData: () => Promise<TData>
): Promise<void> {
  try {
    const data = await getData();
    if (json) {
      writeSuccess(context.stdout, command, data);
    } else {
      context.stdout.write(formatHumanSuccess(command, data));
    }
    context.exitCode = 0;
  } catch (error) {
    writeHandledError(context, command, json, error);
  }
}

function writeHandledError(
  context: CliContext,
  command: string,
  json: boolean,
  error: unknown
): void {
  if (json) {
    writeError(context.stdout, command, error);
  } else {
    context.stderr.write(`${formatHumanError(error)}\n`);
  }
  context.exitCode = 1;
}

function formatHumanSuccess(command: string, data: unknown): string {
  switch (command) {
    case "compat.list": {
      const tools = (data as { tools: Array<{ tool: string; tier: string }> }).tools;
      return `${tools.map((tool) => `${tool.tool} (${tool.tier})`).join("\n")}\n`;
    }
    case "compat.show": {
      const tool = (data as {
        tool: { tool: string; tier: string; note: string };
      }).tool;
      return `${tool.tool} (${tool.tier})\n${tool.note}\n`;
    }
    case "doctor": {
      const runtimes = (data as CompatibilityDoctorData).runtimes;
      if (runtimes.length === 0) {
        return "No runtime diagnostics available.\n";
      }
      return `${runtimes
        .map((runtime) =>
          `${runtime.runtime}: ${runtime.adapterStatus}, ${formatDetectionState(
            runtime.detected
          )}`
        )
        .join("\n")}\n`;
    }
    case "attempt.list": {
      const attempts = (data as { attempts: Array<{ attemptId: string; status: string }> }).attempts;
      if (attempts.length === 0) {
        return "No attempts found.\n";
      }
      return `${attempts
        .map((attempt) => `${attempt.attemptId} (${attempt.status})`)
        .join("\n")}\n`;
    }
    case "attempt.create": {
      const attempt = (data as {
        attempt: { attemptId: string; worktreePath?: string };
      }).attempt;
      return `Created ${attempt.attemptId}${
        attempt.worktreePath ? ` at ${attempt.worktreePath}` : ""
      }\n`;
    }
    case "attempt.cleanup": {
      const cleanupResult = data as CleanupAttemptResult;
      return `${formatCleanupResult(cleanupResult)}\n`;
    }
    default:
      return `${JSON.stringify(data, null, 2)}\n`;
  }
}

function formatCleanupResult(result: CleanupAttemptResult): string {
  const details = result.cleanup.worktreeRemoved
    ? "worktree removed, manifest retained"
    : "manifest retained";

  return `${result.cleanup.outcome} ${result.attempt.attemptId} (${details})`;
}

function formatDetectionState(detected: boolean | null): string {
  if (detected === null) {
    return "not probed";
  }

  return detected ? "detected" : "not detected";
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}
