import { z } from "zod";

import { runtimeKinds } from "../core/capabilities.js";
import { ValidationError } from "../core/errors.js";
import {
  builtInProjectConfig,
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
    execution_mode: z.string().optional(),
    safety_intent: z.string().optional()
  })
  .strict();

const instructionsSchema = z
  .object({
    canonical_file: z.string().optional(),
    tool_adapters: z.record(z.string(), z.string()).optional()
  })
  .strict();

export const rawProjectConfigSchema = z
  .object({
    version: z.string(),
    compatibility: compatibilitySchema.optional(),
    defaults: defaultsSchema.optional(),
    instructions: instructionsSchema.optional(),
    runtimes: z.record(z.string(), z.unknown()).optional(),
    bootstrap: z.record(z.string(), z.unknown()).optional(),
    verify: z.record(z.string(), z.unknown()).optional(),
    policies: z.record(z.string(), z.unknown()).optional(),
    extensions: z.record(z.string(), z.unknown()).optional()
  })
  .strict();

function mergeCompatibility(
  value: z.infer<typeof compatibilitySchema> | undefined
): ProjectCompatibilityConfig {
  return {
    tier1: value?.tier1 ?? builtInProjectConfig.compatibility.tier1,
    experimental:
      value?.experimental ?? builtInProjectConfig.compatibility.experimental
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
  return {
    canonical_file:
      value?.canonical_file ??
      builtInProjectConfig.instructions.canonical_file,
    tool_adapters: {
      ...builtInProjectConfig.instructions.tool_adapters,
      ...(value?.tool_adapters ?? {})
    }
  };
}

export function parseProjectConfig(input: unknown): ProjectConfig {
  const result = rawProjectConfigSchema.safeParse(input);

  if (!result.success) {
    throw new ValidationError("Invalid project config.", result.error);
  }

  return {
    version: result.data.version,
    compatibility: mergeCompatibility(result.data.compatibility),
    defaults: mergeDefaults(result.data.defaults),
    instructions: mergeInstructions(result.data.instructions),
    runtimes: result.data.runtimes ?? builtInProjectConfig.runtimes,
    bootstrap: result.data.bootstrap ?? builtInProjectConfig.bootstrap,
    verify: result.data.verify ?? builtInProjectConfig.verify,
    policies: result.data.policies ?? builtInProjectConfig.policies,
    extensions: result.data.extensions ?? builtInProjectConfig.extensions
  };
}
