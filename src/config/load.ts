import { access, readFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

import { ConfigError } from "../core/errors.js";
import { builtInProjectConfig, type LoadProjectConfigOptions, projectConfigFileName, type ProjectConfig } from "./types.js";
import { parseProjectConfig } from "./schema.js";

export async function resolveProjectConfigPath(
  startDirectory: string
): Promise<string | null> {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    const candidatePath = path.join(currentDirectory, projectConfigFileName);

    try {
      await access(candidatePath);
      return candidatePath;
    } catch {
      const parentDirectory = path.dirname(currentDirectory);

      if (parentDirectory === currentDirectory) {
        return null;
      }

      currentDirectory = parentDirectory;
    }
  }
}

export async function loadProjectConfig(
  options: LoadProjectConfigOptions = {}
): Promise<ProjectConfig> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const filePath =
    options.filePath !== undefined
      ? path.resolve(options.filePath)
      : await resolveProjectConfigPath(cwd);

  if (filePath === null) {
    if (options.requireConfig) {
      throw new ConfigError(
        `Could not find ${projectConfigFileName} from ${cwd}.`
      );
    }

    return { ...builtInProjectConfig };
  }

  const fileContents = await readConfigFile(filePath);
  const parsedYaml = parseConfigYaml(fileContents, filePath);
  const config = parseProjectConfig(parsedYaml);

  return config;
}

async function readConfigFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    throw new ConfigError(`Failed to read config file at ${filePath}.`, error);
  }
}

function parseConfigYaml(fileContents: string, filePath: string): unknown {
  if (fileContents.trim().length === 0) {
    throw new ConfigError(`Config file at ${filePath} is empty.`);
  }

  try {
    return YAML.parse(fileContents);
  } catch (error) {
    throw new ConfigError(`Config file at ${filePath} is not valid YAML.`, error);
  }
}
