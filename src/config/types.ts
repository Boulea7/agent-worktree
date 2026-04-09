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

const builtInProjectConfigTemplate: ProjectConfig = {
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

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);

    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue);
    }
  }

  return value;
}

export function createBuiltInProjectConfig(): ProjectConfig {
  return {
    version: builtInProjectConfigTemplate.version,
    compatibility: {
      tier1: [...builtInProjectConfigTemplate.compatibility.tier1],
      experimental: [...builtInProjectConfigTemplate.compatibility.experimental]
    },
    defaults: {
      execution_mode: builtInProjectConfigTemplate.defaults.execution_mode,
      safety_intent: builtInProjectConfigTemplate.defaults.safety_intent
    },
    instructions: {
      canonical_file: builtInProjectConfigTemplate.instructions.canonical_file,
      tool_adapters: {
        ...builtInProjectConfigTemplate.instructions.tool_adapters
      }
    },
    runtimes: {
      ...builtInProjectConfigTemplate.runtimes
    },
    bootstrap: {
      ...builtInProjectConfigTemplate.bootstrap
    },
    verify: {
      ...builtInProjectConfigTemplate.verify
    },
    policies: {
      ...builtInProjectConfigTemplate.policies
    },
    extensions: {
      ...builtInProjectConfigTemplate.extensions
    }
  };
}

export const builtInProjectConfig: ProjectConfig = deepFreeze(
  createBuiltInProjectConfig()
);
