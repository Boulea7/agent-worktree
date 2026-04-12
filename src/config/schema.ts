import { z } from "zod";

import {
  executionModes,
  runtimeKinds,
  safetyIntents
} from "../core/capabilities.js";
import { ValidationError } from "../core/errors.js";
import {
  builtInProjectConfig,
  createBuiltInProjectConfig,
  type ProjectConfig,
  type ProjectCompatibilityConfig,
  type ProjectDefaultsConfig,
  type ProjectInstructionsConfig
} from "./types.js";

const compatibilitySchema = z
  .object({
    tier1: z.array(z.enum(runtimeKinds)).optional(),
    experimental: z.array(z.string()).optional()
  })
  .strict();

const defaultsSchema = z
  .object({
    execution_mode: z.enum(executionModes).optional(),
    safety_intent: z.enum(safetyIntents).optional()
  })
  .strict();

const instructionsSchema = z
  .object({
    canonical_file: z.string().optional(),
    tool_adapters: z.record(z.string(), z.string()).optional()
  })
  .strict();

const reservedEmptyNamespaceSchema = z.object({}).strict();

export const rawProjectConfigSchema = z
  .object({
    version: z.string(),
    compatibility: compatibilitySchema.optional(),
    defaults: defaultsSchema.optional(),
    instructions: instructionsSchema.optional(),
    runtimes: reservedEmptyNamespaceSchema.optional(),
    bootstrap: reservedEmptyNamespaceSchema.optional(),
    verify: reservedEmptyNamespaceSchema.optional(),
    policies: reservedEmptyNamespaceSchema.optional(),
    extensions: z.record(z.string(), z.unknown()).optional()
  })
  .strict();

function mergeCompatibility(
  value: z.infer<typeof compatibilitySchema> | undefined
): ProjectCompatibilityConfig {
  const builtInConfig = createBuiltInProjectConfig();

  return {
    tier1: [...(value?.tier1 ?? builtInConfig.compatibility.tier1)],
    experimental: [
      ...(value?.experimental ?? builtInConfig.compatibility.experimental)
    ]
  };
}

function mergeDefaults(
  value: z.infer<typeof defaultsSchema> | undefined
): ProjectDefaultsConfig {
  return {
    execution_mode:
      value?.execution_mode ?? builtInProjectConfig.defaults.execution_mode,
    safety_intent:
      value?.safety_intent ?? builtInProjectConfig.defaults.safety_intent
  };
}

function mergeInstructions(
  value: z.infer<typeof instructionsSchema> | undefined
): ProjectInstructionsConfig {
  const builtInConfig = createBuiltInProjectConfig();

  return {
    canonical_file:
      value?.canonical_file ??
      builtInConfig.instructions.canonical_file,
    tool_adapters: {
      ...builtInConfig.instructions.tool_adapters,
      ...(value?.tool_adapters ?? {})
    }
  };
}

export function parseProjectConfig(input: unknown): ProjectConfig {
  const result = rawProjectConfigSchema.safeParse(input);
  const builtInConfig = createBuiltInProjectConfig();

  if (!result.success) {
    throw new ValidationError("Invalid project config.", result.error);
  }

  return {
    version: result.data.version,
    compatibility: mergeCompatibility(result.data.compatibility),
    defaults: mergeDefaults(result.data.defaults),
    instructions: mergeInstructions(result.data.instructions),
    runtimes: { ...(result.data.runtimes ?? builtInConfig.runtimes) },
    bootstrap: { ...(result.data.bootstrap ?? builtInConfig.bootstrap) },
    verify: { ...(result.data.verify ?? builtInConfig.verify) },
    policies: { ...(result.data.policies ?? builtInConfig.policies) },
    extensions: { ...(result.data.extensions ?? builtInConfig.extensions) }
  };
}
