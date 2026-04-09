import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ConfigError, ValidationError } from "../../src/core/errors.js";
import {
  loadProjectConfig,
  resolveProjectConfigPath
} from "../../src/config/load.js";
import { builtInProjectConfig } from "../../src/config/types.js";
import { parseProjectConfig } from "../../src/config/schema.js";

describe("parseProjectConfig", () => {
  it("should parse the minimal documented config", () => {
    const config = parseProjectConfig({
      version: "0.x",
      compatibility: {
        tier1: ["claude-code", "codex-cli", "gemini-cli", "opencode"],
        experimental: ["openclaw"]
      },
      instructions: {
        canonical_file: "AGENTS.md",
        tool_adapters: {
          claude_code: "CLAUDE.md",
          gemini_cli: "GEMINI.md"
        }
      }
    });

    expect(config.version).toBe("0.x");
    expect(config.defaults.execution_mode).toBe("headless_event_stream");
    expect(config.extensions).toEqual({});
  });

  it("should reject config without version", () => {
    expect(() =>
      parseProjectConfig({
        defaults: {
          execution_mode: "headless_event_stream"
        }
      })
    ).toThrow(ValidationError);
  });

  it("should reject unknown top-level keys", () => {
    expect(() =>
      parseProjectConfig({
        version: "0.x",
        unknown: true
      })
    ).toThrow(ValidationError);
  });

  it("should allow unknown keys inside extensions", () => {
    const config = parseProjectConfig({
      version: "0.x",
      extensions: {
        custom_namespace: {
          enabled: true
        }
      }
    });

    expect(config.extensions).toEqual({
      custom_namespace: {
        enabled: true
      }
    });
  });

  it("should return fresh mutable containers on each parse", () => {
    const first = parseProjectConfig({ version: "0.x" });
    first.compatibility.experimental.push("custom-runtime");
    first.runtimes.example = { enabled: true };
    first.instructions.tool_adapters.example = "EXAMPLE.md";

    const second = parseProjectConfig({ version: "0.x" });

    expect(second.compatibility.experimental).toEqual(
      builtInProjectConfig.compatibility.experimental
    );
    expect(second.runtimes).toEqual({});
    expect(second.instructions.tool_adapters).toEqual({
      claude_code: "CLAUDE.md",
      gemini_cli: "GEMINI.md"
    });
  });

  it("should keep built-in defaults immutable to external callers", () => {
    expect(() => {
      builtInProjectConfig.extensions.example = { enabled: true };
    }).toThrow(TypeError);

    const fresh = parseProjectConfig({ version: "0.x" });

    expect(fresh.extensions).toEqual({});
  });
});

describe("loadProjectConfig", () => {
  const tempDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirectories.map(async (directoryPath) => {
        const { rm } = await import("node:fs/promises");
        await rm(directoryPath, { recursive: true, force: true });
      })
    );
    tempDirectories.length = 0;
  });

  async function createTempDirectory(): Promise<string> {
    const { mkdtemp } = await import("node:fs/promises");
    const directoryPath = await mkdtemp(
      path.join(os.tmpdir(), "agent-worktree-config-")
    );
    tempDirectories.push(directoryPath);
    return directoryPath;
  }

  it("should return built-in defaults when no config file exists", async () => {
    const cwd = await createTempDirectory();
    const config = await loadProjectConfig({ cwd });

    expect(config.version).toBe("0.x");
    expect(config.instructions.canonical_file).toBe("AGENTS.md");
  });

  it("should return fresh mutable containers when no config file exists", async () => {
    const cwd = await createTempDirectory();
    const first = await loadProjectConfig({ cwd });

    first.compatibility.experimental.push("custom-runtime");
    first.extensions.example = { enabled: true };
    first.instructions.tool_adapters.example = "EXAMPLE.md";

    const second = await loadProjectConfig({ cwd });

    expect(second.compatibility.experimental).toEqual(
      builtInProjectConfig.compatibility.experimental
    );
    expect(second.extensions).toEqual({});
    expect(second.instructions.tool_adapters).toEqual({
      claude_code: "CLAUDE.md",
      gemini_cli: "GEMINI.md"
    });
  });

  it("should require the config file when requireConfig is true", async () => {
    const cwd = await createTempDirectory();

    await expect(loadProjectConfig({ cwd, requireConfig: true })).rejects.toThrow(
      ConfigError
    );
  });

  it("should resolve the config file by walking up parent directories", async () => {
    const rootDirectory = await createTempDirectory();
    const nestedDirectory = path.join(rootDirectory, "nested", "leaf");

    await mkdir(nestedDirectory, { recursive: true });
    await writeFile(
      path.join(rootDirectory, "agent-worktree.yaml"),
      'version: "0.x"\n',
      "utf8"
    );

    await expect(resolveProjectConfigPath(nestedDirectory)).resolves.toBe(
      path.join(rootDirectory, "agent-worktree.yaml")
    );
  });

  it("should parse a config file from disk", async () => {
    const cwd = await createTempDirectory();
    await writeFile(
      path.join(cwd, "agent-worktree.yaml"),
      [
        'version: "0.x"',
        "defaults:",
        "  execution_mode: interactive_terminal",
        "extensions:",
        "  custom_namespace:",
        "    enabled: true"
      ].join("\n"),
      "utf8"
    );

    const config = await loadProjectConfig({ cwd });

    expect(config.defaults.execution_mode).toBe("interactive_terminal");
    expect(config.extensions.custom_namespace).toEqual({ enabled: true });
  });

  it("should reject invalid yaml", async () => {
    const cwd = await createTempDirectory();
    await writeFile(
      path.join(cwd, "agent-worktree.yaml"),
      "version: [",
      "utf8"
    );

    await expect(loadProjectConfig({ cwd })).rejects.toThrow(ConfigError);
  });

  it("should reject empty config files", async () => {
    const cwd = await createTempDirectory();
    await writeFile(path.join(cwd, "agent-worktree.yaml"), "   \n", "utf8");

    await expect(loadProjectConfig({ cwd })).rejects.toThrow(ConfigError);
  });
});
