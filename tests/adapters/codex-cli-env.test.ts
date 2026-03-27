import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveCodexCliEnvironment } from "../../src/adapters/codex-cli-env.js";

const tempDirectories: string[] = [];

describe("resolveCodexCliEnvironment", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirectories.map((directoryPath) =>
        import("node:fs/promises").then(({ rm }) =>
          rm(directoryPath, { recursive: true, force: true })
        )
      )
    );
    tempDirectories.length = 0;
  });

  it("should return undefined when no relay-compatible codex env sources are available", async () => {
    const homeDir = await createTempHome();

    await expect(
      resolveCodexCliEnvironment({
        homeDir,
        baseEnv: {
          PATH: "/usr/bin:/bin"
        }
      })
    ).resolves.toBeUndefined();
  });

  it("should apply codex.env exports and unsets over the base environment", async () => {
    const homeDir = await createTempHome();
    await mkdir(path.join(homeDir, ".ccswitch"), { recursive: true });
    await writeFile(
      path.join(homeDir, ".ccswitch", "codex.env"),
      "unset OPENAI_BASE_URL\nexport OPENAI_API_KEY='relay-token'\n",
      "utf8"
    );

    await expect(
      resolveCodexCliEnvironment({
        homeDir,
        baseEnv: {
          PATH: "/usr/bin:/bin",
          OPENAI_BASE_URL: "https://stale.example/v1"
        }
      })
    ).resolves.toEqual({
      PATH: "/usr/bin:/bin",
      OPENAI_API_KEY: "relay-token"
    });
  });

  it("should preserve escaped backslashes while still decoding real newline escapes in codex.env", async () => {
    const homeDir = await createTempHome();
    await mkdir(path.join(homeDir, ".ccswitch"), { recursive: true });
    await writeFile(
      path.join(homeDir, ".ccswitch", "codex.env"),
      [
        'export WINDOWS_PATH="C:\\\\new\\\\tools"',
        'export LITERAL_BACKSLASH_N="literal\\\\nvalue"',
        'export MULTILINE_VALUE="line1\\nline2"',
        ""
      ].join("\n"),
      "utf8"
    );

    await expect(
      resolveCodexCliEnvironment({
        homeDir,
        baseEnv: {
          PATH: "/usr/bin:/bin"
        }
      })
    ).resolves.toEqual({
      PATH: "/usr/bin:/bin",
      WINDOWS_PATH: "C:\\new\\tools",
      LITERAL_BACKSLASH_N: "literal\\nvalue",
      MULTILINE_VALUE: "line1\nline2"
    });
  });

  it("should resolve OPENAI_API_KEY from auth.json using the active provider env_key when codex.env is absent", async () => {
    const homeDir = await createTempHome();
    await mkdir(path.join(homeDir, ".codex"), { recursive: true });
    await writeFile(
      path.join(homeDir, ".codex", "config.toml"),
      [
        'model_provider = "ccswitch_active"',
        "",
        "[model_providers.ccswitch_active]",
        'name = "ccswitch: relay"',
        'base_url = "https://relay.example/openai/v1"',
        'env_key = "OPENAI_API_KEY"',
        "supports_websockets = false",
        'wire_api = "responses"',
        ""
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      path.join(homeDir, ".codex", "auth.json"),
      JSON.stringify({ OPENAI_API_KEY: "auth-token" }, null, 2),
      "utf8"
    );

    await expect(
      resolveCodexCliEnvironment({
        homeDir,
        baseEnv: {
          PATH: "/usr/bin:/bin"
        }
      })
    ).resolves.toEqual({
      PATH: "/usr/bin:/bin",
      OPENAI_API_KEY: "auth-token"
    });
  });

  it("should support custom env_key values from the active provider", async () => {
    const homeDir = await createTempHome();
    await mkdir(path.join(homeDir, ".codex"), { recursive: true });
    await writeFile(
      path.join(homeDir, ".codex", "config.toml"),
      [
        'model_provider = "custom-relay"',
        "",
        "[model_providers.custom-relay]",
        'name = "custom relay"',
        'base_url = "https://relay.example/openai/v1"',
        'env_key = "MY_CUSTOM_CODEX_TOKEN"',
        "supports_websockets = false",
        'wire_api = "responses"',
        ""
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      path.join(homeDir, ".codex", "auth.json"),
      JSON.stringify({ MY_CUSTOM_CODEX_TOKEN: "custom-token" }, null, 2),
      "utf8"
    );

    await expect(
      resolveCodexCliEnvironment({
        homeDir,
        baseEnv: {
          PATH: "/usr/bin:/bin"
        }
      })
    ).resolves.toEqual({
      PATH: "/usr/bin:/bin",
      MY_CUSTOM_CODEX_TOKEN: "custom-token"
    });
  });

  it("should prefer active-provider auth fallback over a stale shell token", async () => {
    const homeDir = await createTempHome();
    await mkdir(path.join(homeDir, ".codex"), { recursive: true });
    await writeFile(
      path.join(homeDir, ".codex", "config.toml"),
      [
        'model_provider = "ccswitch_active"',
        "",
        "[model_providers.ccswitch_active]",
        'env_key = "OPENAI_API_KEY"',
        ""
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      path.join(homeDir, ".codex", "auth.json"),
      JSON.stringify({ OPENAI_API_KEY: "auth-token" }, null, 2),
      "utf8"
    );

    await expect(
      resolveCodexCliEnvironment({
        homeDir,
        baseEnv: {
          PATH: "/usr/bin:/bin",
          OPENAI_API_KEY: "already-present"
        }
      })
    ).resolves.toEqual({
      PATH: "/usr/bin:/bin",
      OPENAI_API_KEY: "auth-token"
    });
  });

  it("should resolve env_key from a quoted active provider table name", async () => {
    const homeDir = await createTempHome();
    await mkdir(path.join(homeDir, ".codex"), { recursive: true });
    await writeFile(
      path.join(homeDir, ".codex", "config.toml"),
      [
        'model_provider = "my.provider"',
        "",
        '[model_providers."my.provider"]',
        'env_key = "OPENAI_API_KEY"',
        ""
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      path.join(homeDir, ".codex", "auth.json"),
      JSON.stringify({ OPENAI_API_KEY: "quoted-auth-token" }, null, 2),
      "utf8"
    );

    await expect(
      resolveCodexCliEnvironment({
        homeDir,
        baseEnv: {
          PATH: "/usr/bin:/bin"
        }
      })
    ).resolves.toEqual({
      PATH: "/usr/bin:/bin",
      OPENAI_API_KEY: "quoted-auth-token"
    });
  });

  it("should rethrow non-missing file read errors instead of swallowing them", async () => {
    const homeDir = await createTempHome();

    await expect(
      resolveCodexCliEnvironment({
        homeDir,
        readTextFile: async () => {
          throw createErrnoError("EACCES", "permission denied");
        }
      })
    ).rejects.toMatchObject({
      code: "EACCES",
      message: "permission denied"
    });
  });
});

async function createTempHome(): Promise<string> {
  const homeDir = await mkdtemp(path.join(os.tmpdir(), "agent-worktree-codex-env-"));
  tempDirectories.push(homeDir);
  return homeDir;
}

function createErrnoError(
  code: string,
  message: string
): NodeJS.ErrnoException {
  const error = new Error(message) as NodeJS.ErrnoException;
  error.code = code;
  return error;
}
