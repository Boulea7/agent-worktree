import { AgentWorktreeError } from "../core/errors.js";

export interface CliWriter {
  write(chunk: string): void;
}

export interface CommandSuccessEnvelope<TData> {
  command: string;
  data: TData;
  ok: true;
}

export interface CommandErrorEnvelope {
  command: string;
  error: {
    code: string;
    message: string;
  };
  ok: false;
}

export function writeSuccess<TData>(
  writer: CliWriter,
  command: string,
  data: TData
): void {
  const payload: CommandSuccessEnvelope<TData> = {
    ok: true,
    command,
    data
  };

  writer.write(`${JSON.stringify(payload, null, 2)}\n`);
}

export function writeError(
  writer: CliWriter,
  command: string,
  error: unknown
): void {
  const payload: CommandErrorEnvelope = {
    ok: false,
    command,
    error: normalizeError(error)
  };

  writer.write(`${JSON.stringify(payload, null, 2)}\n`);
}

export function formatHumanError(error: unknown): string {
  const normalized = normalizeError(error);
  return `${normalized.code}: ${normalized.message}`;
}

function normalizeError(error: unknown): { code: string; message: string } {
  if (error instanceof AgentWorktreeError) {
    return {
      code: error.code,
      message: error.message
    };
  }

  if (error instanceof Error) {
    return {
      code: "RUNTIME_ERROR",
      message: error.message
    };
  }

  return {
    code: "RUNTIME_ERROR",
    message: "Unknown error."
  };
}
