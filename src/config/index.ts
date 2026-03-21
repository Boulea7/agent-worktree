export {
  rawProjectConfigSchema as projectConfigSchema,
  parseProjectConfig
} from "./schema.js";
export {
  loadProjectConfig,
  loadProjectConfig as loadConfig,
  resolveProjectConfigPath,
  resolveProjectConfigPath as resolveConfigPath
} from "./load.js";
export {
  builtInProjectConfig as builtInConfigDefaults,
  projectConfigFileName as CONFIG_FILE_NAME
} from "./types.js";
export type {
  ProjectCompatibilityConfig as CompatibilityConfig,
  ProjectDefaultsConfig as DefaultsConfig,
  ProjectInstructionsConfig as InstructionsConfig,
  LoadProjectConfigOptions,
  ProjectConfig,
  ProjectConfig as ProjectConfigShape
} from "./types.js";
