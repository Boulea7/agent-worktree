import { ValidationError } from "../core/errors.js";
import { BaseRuntimeAdapter } from "./base.js";
import {
  detectCodexCli,
  executeCodexHeadless,
  normalizeCodexCliProfile,
  type CodexExecutionOptions
} from "./codex-cli-exec.js";
import type {
  AdapterDescriptor,
  HeadlessExecutionAdapter,
  HeadlessExecutionInput,
  HeadlessExecutionResult,
  RenderCommandInput,
  RenderedCommand
} from "./types.js";

export interface CodexCliAdapterOptions extends CodexExecutionOptions {
  detectImpl?: () => boolean | Promise<boolean>;
}

export interface CodexCliRenderCommandInput extends RenderCommandInput {
  profile?: string;
}

export interface CodexCliHeadlessExecutionInput extends HeadlessExecutionInput {
  profile?: string;
}

export class CodexCliAdapter
  extends BaseRuntimeAdapter
  implements HeadlessExecutionAdapter
{
  private readonly options: CodexCliAdapterOptions;

  public constructor(
    descriptor: AdapterDescriptor,
    options: CodexCliAdapterOptions = {}
  ) {
    if (descriptor.runtime !== "codex-cli") {
      throw new ValidationError(
        `CodexCliAdapter requires a codex-cli descriptor, received ${descriptor.runtime}.`
      );
    }

    super(
      descriptor,
      options.detectImpl ?? (() => detectCodexCli(options.runner))
    );
    this.options = options;
  }

  public renderCommand(input?: RenderCommandInput): RenderedCommand;
  public renderCommand(input?: CodexCliRenderCommandInput): RenderedCommand;
  public renderCommand(
    input: RenderCommandInput | CodexCliRenderCommandInput = {}
  ): RenderedCommand {
    const executionMode = this.getDefaultExecutionMode(input);
    const safetyIntent = this.getDefaultSafetyIntent(input);
    const resumeRequested = input.resumeSessionId !== undefined;
    const profile = normalizeCodexCliProfile(
      (input as CodexCliRenderCommandInput).profile
    );

    if (resumeRequested) {
      throw new ValidationError(
        "codex-cli resume rendering is not implemented in the current adapter foundation."
      );
    }

    return {
      runtime: this.descriptor.runtime,
      executable: "codex",
      ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
      args:
        executionMode === "headless_event_stream"
          ? buildHeadlessArgs(input, profile)
          : buildInteractiveArgs(input, profile),
      metadata: {
        executionMode,
        machineReadable: executionMode === "headless_event_stream",
        promptIncluded: input.prompt !== undefined,
        resumeRequested,
        safetyIntent
      }
    };
  }

  public async executeHeadless(
    input: HeadlessExecutionInput
  ): Promise<HeadlessExecutionResult>;
  public async executeHeadless(
    input: CodexCliHeadlessExecutionInput
  ): Promise<HeadlessExecutionResult>;
  public async executeHeadless(
    input: HeadlessExecutionInput | CodexCliHeadlessExecutionInput
  ): Promise<HeadlessExecutionResult> {
    if (input.prompt.trim().length === 0) {
      throw new ValidationError(
        "codex-cli headless execution requires a non-empty prompt."
      );
    }

    const profile = normalizeCodexCliProfile(
      (input as CodexCliHeadlessExecutionInput).profile
    );
    const command = this.renderCommand({
      executionMode: "headless_event_stream",
      prompt: input.prompt,
      ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
      ...(profile === undefined ? {} : { profile })
    });

    return executeCodexHeadless(input, {
      command,
      ...(this.options.parseEventStream === undefined
        ? {}
        : { parseEventStream: this.options.parseEventStream }),
      ...(this.options.resolveEnvironment === undefined
        ? {}
        : { resolveEnvironment: this.options.resolveEnvironment }),
      ...(this.options.runner === undefined
        ? {}
        : { runCommand: this.options.runner })
    });
  }
}

export function createCodexCliAdapter(
  descriptor: AdapterDescriptor,
  options: CodexCliAdapterOptions = {}
): CodexCliAdapter {
  return new CodexCliAdapter(descriptor, options);
}

function buildHeadlessArgs(
  input: RenderCommandInput,
  profile: string | undefined
): string[] {
  return [
    "exec",
    "--json",
    ...(profile === undefined ? [] : ["--profile", profile]),
    ...(input.prompt === undefined ? [] : [input.prompt])
  ];
}

function buildInteractiveArgs(
  input: RenderCommandInput,
  profile: string | undefined
): string[] {
  return [
    ...(profile === undefined ? [] : ["--profile", profile]),
    ...(input.prompt === undefined ? [] : [input.prompt])
  ];
}
