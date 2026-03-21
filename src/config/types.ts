import {
  defaultExecutionMode,
  defaultSafetyIntent,
  type ExecutionMode,
  type RuntimeKind,
  type SafetyIntent
} from "../core/capabilities.js";

export const projectConfigFileName = "agent-worktree.yaml";
export const defaultProjectConfigVersion = "0.x";

export interface ProjectCompatibilityConfig {
  experimental: string[];
  tier1: RuntimeKind[];
}

export interface ProjectDefaultsConfig {
  execution_mode: ExecutionMode | string;
  safety_intent: SafetyIntent | string;
}

export interface ProjectInstructionsConfig {
  canonical_file: string;
  tool_adapters: Record<string, string>;
}

export interface ProjectConfig {
  bootstrap: Record<string, unknown>;
  compatibility: ProjectCompatibilityConfig;
  defaults: ProjectDefaultsConfig;
  extensions: Record<string, unknown>;
  instructions: ProjectInstructionsConfig;
  policies: Record<string, unknown>;
  runtimes: Record<string, unknown>;
  verify: Record<string, unknown>;
  version: string;
}

export interface LoadProjectConfigOptions {
  cwd?: string;
  filePath?: string;
  requireConfig?: boolean;
}

export const builtInProjectConfig: ProjectConfig = {
  version: defaultProjectConfigVersion,
  compatibility: {
    tier1: ["claude-code", "codex-cli", "gemini-cli", "opencode"],
    experimental: ["openclaw"]
  },
  defaults: {
    execution_mode: defaultExecutionMode,
    safety_intent: defaultSafetyIntent
  },
  instructions: {
    canonical_file: "AGENTS.md",
    tool_adapters: {
      claude_code: "CLAUDE.md",
      gemini_cli: "GEMINI.md"
    }
  },
  runtimes: {},
  bootstrap: {},
  verify: {},
  policies: {},
  extensions: {}
};
