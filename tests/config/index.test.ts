import { describe, expect, expectTypeOf, it } from "vitest";

import * as config from "../../src/config/index.js";
import type {
  CompatibilityConfig,
  DefaultsConfig,
  InstructionsConfig,
  LoadProjectConfigOptions,
  ProjectConfig,
  ProjectConfigShape
} from "../../src/config/index.js";

describe("config index exports", () => {
  it("should keep the default config barrel aligned with the current public contract", () => {
    type ConfigIndexExports = {
      compatibilityConfig: CompatibilityConfig;
      defaultsConfig: DefaultsConfig;
      instructionsConfig: InstructionsConfig;
      loadProjectConfigOptions: LoadProjectConfigOptions;
      projectConfig: ProjectConfig;
      projectConfigShape: ProjectConfigShape;
    };

    expectTypeOf<ConfigIndexExports>().not.toBeAny();
    expect(Object.keys(config).sort()).toEqual(
      [
        "CONFIG_FILE_NAME",
        "builtInConfigDefaults",
        "loadConfig",
        "loadProjectConfig",
        "parseProjectConfig",
        "projectConfigSchema",
        "resolveConfigPath",
        "resolveProjectConfigPath"
      ].sort()
    );
  });
});

// @ts-expect-error config index must not export raw schema internals
type ConfigIndexShouldNotExportRawProjectConfigSchema = typeof import("../../src/config/index.js").rawProjectConfigSchema;

// @ts-expect-error config index must not export the mutable config factory
type ConfigIndexShouldNotExportCreateBuiltInProjectConfig = typeof import("../../src/config/index.js").createBuiltInProjectConfig;

