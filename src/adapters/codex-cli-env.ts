import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface CodexCliEnvironmentInput {
  baseEnv?: NodeJS.ProcessEnv;
  homeDir?: string;
  profile?: string;
  readTextFile?: (filePath: string) => Promise<string>;
}

const allowedBaseEnvKeys = new Set([
  "HOME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "LOGNAME",
  "PATH",
  "PATHEXT",
  "SHELL",
  "SystemRoot",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "USER",
  "WINDIR"
]);

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
  const envKey = resolveActiveProviderEnvKey(configText, input.profile);

  if (envKey !== undefined && !overlay.has(envKey)) {
    const authText = await readOptionalTextFile(
      readTextFile,
      path.join(homeDir, ".codex", "auth.json")
    );
    const authToken = resolveAuthToken(authText, envKey);

    if (authToken !== undefined) {
      overlay.set(envKey, authToken);
    } else {
      const shellToken = baseEnv[envKey];

      if (typeof shellToken === "string" && shellToken.length > 0) {
        overlay.set(envKey, shellToken);
      }
    }
  }

  if (overlay.size === 0) {
    return undefined;
  }

  const resolvedEnv = deriveAllowedBaseEnvironment(baseEnv);

  for (const [key, value] of overlay) {
    if (value === undefined) {
      delete resolvedEnv[key];
      continue;
    }

    resolvedEnv[key] = value;
  }

  return resolvedEnv;
}

function deriveAllowedBaseEnvironment(
  baseEnv: NodeJS.ProcessEnv
): NodeJS.ProcessEnv {
  const resolvedEnv: NodeJS.ProcessEnv = {};

  for (const [key, value] of Object.entries(baseEnv)) {
    if (!allowedBaseEnvKeys.has(key) || value === undefined) {
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
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined;
    }

    throw error;
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
    return decodeDoubleQuotedValue(trimmed.slice(1, -1));
  }

  return trimmed.replace(/\s+#.*$/u, "").trim();
}

function resolveActiveProviderEnvKey(
  configText: string | undefined,
  profile: string | undefined
): string | undefined {
  if (configText === undefined) {
    return undefined;
  }

  const modelProvider =
    resolveProfileModelProvider(configText, profile) ??
    readRootTomlString(configText, "model_provider");

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

function resolveProfileModelProvider(
  configText: string,
  profile: string | undefined
): string | undefined {
  if (profile === undefined) {
    return undefined;
  }

  const normalizedProfile = profile.trim();

  if (normalizedProfile.length === 0) {
    return undefined;
  }

  const profileBlock = readTomlTableBlock(
    configText,
    [
      `profiles.${normalizedProfile}`,
      `profiles.${quoteTomlKeySegment(normalizedProfile)}`
    ]
  );

  if (profileBlock === undefined) {
    return undefined;
  }

  return readTomlString(profileBlock, "model_provider");
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

    return decodeDoubleQuotedValue(value);
  }

  return undefined;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function decodeDoubleQuotedValue(value: string): string {
  let decoded = "";

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;

    if (character !== "\\") {
      decoded += character;
      continue;
    }

    const nextCharacter = value[index + 1];

    if (nextCharacter === undefined) {
      decoded += "\\";
      continue;
    }

    switch (nextCharacter) {
      case "n":
        decoded += "\n";
        break;
      case "r":
        decoded += "\r";
        break;
      case "t":
        decoded += "\t";
        break;
      case '"':
        decoded += '"';
        break;
      case "\\":
        decoded += "\\";
        break;
      default:
        decoded += `\\${nextCharacter}`;
        break;
    }

    index += 1;
  }

  return decoded;
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
