import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface CodexCliEnvironmentInput {
  baseEnv?: NodeJS.ProcessEnv;
  homeDir?: string;
  readTextFile?: (filePath: string) => Promise<string>;
}

export async function resolveCodexCliEnvironment(
  input: CodexCliEnvironmentInput = {}
): Promise<NodeJS.ProcessEnv | undefined> {
  const baseEnv = input.baseEnv ?? process.env;
  const homeDir = input.homeDir ?? os.homedir();
  const readTextFile = input.readTextFile ?? defaultReadTextFile;
  const overlay = new Map<string, string | undefined>();

  const codexEnv = await readOptionalTextFile(
    readTextFile,
    path.join(homeDir, ".ccswitch", "codex.env")
  );

  if (codexEnv !== undefined) {
    for (const [key, value] of parseCodexEnv(codexEnv)) {
      overlay.set(key, value);
    }
  }

  const configText = await readOptionalTextFile(
    readTextFile,
    path.join(homeDir, ".codex", "config.toml")
  );
  const envKey = resolveActiveProviderEnvKey(configText);

  if (envKey !== undefined && !overlay.has(envKey)) {
    const authText = await readOptionalTextFile(
      readTextFile,
      path.join(homeDir, ".codex", "auth.json")
    );
    const authToken = resolveAuthToken(authText, envKey);

    if (authToken !== undefined) {
      overlay.set(envKey, authToken);
    }
  }

  if (overlay.size === 0) {
    return undefined;
  }

  const resolvedEnv: NodeJS.ProcessEnv = {
    ...baseEnv
  };

  for (const [key, value] of overlay) {
    if (value === undefined) {
      delete resolvedEnv[key];
      continue;
    }

    resolvedEnv[key] = value;
  }

  return resolvedEnv;
}

async function defaultReadTextFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

async function readOptionalTextFile(
  readTextFile: (filePath: string) => Promise<string>,
  filePath: string
): Promise<string | undefined> {
  try {
    return await readTextFile(filePath);
  } catch {
    return undefined;
  }
}

function parseCodexEnv(content: string): Map<string, string | undefined> {
  const assignments = new Map<string, string | undefined>();

  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const unsetMatch = trimmed.match(/^unset\s+([A-Za-z_][A-Za-z0-9_]*)$/u);

    if (unsetMatch) {
      const key = unsetMatch[1]!;
      assignments.set(key, undefined);
      continue;
    }

    const exportMatch = trimmed.match(
      /^export\s+([A-Za-z_][A-Za-z0-9_]*)=(.+)$/u
    );

    if (!exportMatch) {
      continue;
    }

    const key = exportMatch[1]!;
    const rawValue = exportMatch[2]!;
    const value = parseShellValue(rawValue);

    if (value !== undefined) {
      assignments.set(key, value);
    }
  }

  return assignments;
}

function parseShellValue(rawValue: string): string | undefined {
  const trimmed = rawValue.trim();

  if (trimmed.length === 0) {
    return "";
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
      .slice(1, -1)
      .replace(/\\n/gu, "\n")
      .replace(/\\r/gu, "\r")
      .replace(/\\t/gu, "\t")
      .replace(/\\"/gu, '"')
      .replace(/\\\\/gu, "\\");
  }

  return trimmed.replace(/\s+#.*$/u, "").trim();
}

function resolveActiveProviderEnvKey(
  configText: string | undefined
): string | undefined {
  if (configText === undefined) {
    return undefined;
  }

  const modelProvider = readRootTomlString(configText, "model_provider");

  if (modelProvider === undefined) {
    return undefined;
  }

  const providerBlock = readTomlTableBlock(
    configText,
    [
      `model_providers.${modelProvider}`,
      `model_providers.${quoteTomlKeySegment(modelProvider)}`
    ]
  );

  if (providerBlock === undefined) {
    return undefined;
  }

  return readTomlString(providerBlock, "env_key");
}

function readRootTomlString(content: string, key: string): string | undefined {
  let inTable = false;

  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      inTable = true;
      continue;
    }

    if (inTable) {
      continue;
    }

    const value = readTomlString(line, key);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function readTomlTableBlock(
  content: string,
  tableNames: string[]
): string | undefined {
  const headers = new Set(tableNames.map((tableName) => `[${tableName}]`));
  const lines = content.split(/\r?\n/u);
  const blockLines: string[] = [];
  let inTargetBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      if (inTargetBlock) {
        break;
      }

      inTargetBlock = headers.has(trimmed);
      continue;
    }

    if (inTargetBlock) {
      blockLines.push(line);
    }
  }

  return inTargetBlock || blockLines.length > 0
    ? blockLines.join("\n")
    : undefined;
}

function readTomlString(content: string, key: string): string | undefined {
  const pattern = new RegExp(
    `^\\s*${escapeForRegExp(key)}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*(?:#.*)?$`,
    "u"
  );

  for (const line of content.split(/\r?\n/u)) {
    const match = line.match(pattern);

    if (!match) {
      continue;
    }

    const value = match[1]!;

    return value
      .replace(/\\n/gu, "\n")
      .replace(/\\r/gu, "\r")
      .replace(/\\t/gu, "\t")
      .replace(/\\"/gu, '"')
      .replace(/\\\\/gu, "\\");
  }

  return undefined;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function quoteTomlKeySegment(value: string): string {
  return `"${value.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"')}"`;
}

function resolveAuthToken(
  authText: string | undefined,
  envKey: string
): string | undefined {
  if (authText === undefined) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(authText) as Record<string, unknown>;
    const value = parsed[envKey];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
