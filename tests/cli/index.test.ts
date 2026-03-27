import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  CompatibilityDoctorData,
  CompatibilityProbeData,
  CompatibilitySmokeData
} from "../../src/compat/index.js";
import { buildCompatibilitySmokeData } from "../../src/compat/smoke.js";
import { runCli } from "../../src/cli/index.js";
import { readManifest, writeManifest } from "../../src/manifest/store.js";
import { runGit } from "../../src/worktree/git.js";
import { createTestRepository } from "../worktree/helpers.js";

class MemoryWriter {
  public output = "";

  public write(chunk: string): void {
    this.output += chunk;
  }
}

type CompatibilityIndexModule = typeof import("../../src/compat/index.js");

async function loadCliModuleWithCompatCatalogOverrides(overrides: {
  getCompatibilityDescriptor?: CompatibilityIndexModule["getCompatibilityDescriptor"];
  listCompatibilityDescriptors?: CompatibilityIndexModule["listCompatibilityDescriptors"];
}): Promise<typeof import("../../src/cli/index.js")> {
  vi.resetModules();
  vi.doMock("../../src/compat/index.js", async () => {
    const actual = await vi.importActual<CompatibilityIndexModule>(
      "../../src/compat/index.js"
    );

    return {
      ...actual,
      ...(overrides.listCompatibilityDescriptors === undefined
        ? {}
        : {
            listCompatibilityDescriptors:
              overrides.listCompatibilityDescriptors
          }),
      ...(overrides.getCompatibilityDescriptor === undefined
        ? {}
        : {
            getCompatibilityDescriptor: overrides.getCompatibilityDescriptor
          })
    };
  });

  return import("../../src/cli/index.js");
}

function assertNoInternalRuntimeMetadata(value: Record<string, unknown>): void {
  expect(value).not.toHaveProperty("controlPlane");
  expect(value).not.toHaveProperty("runtimeState");
  expect(value).not.toHaveProperty("observation");
  expect(value).not.toHaveProperty("closeCandidate");
  expect(value).not.toHaveProperty("closeConsume");
  expect(value).not.toHaveProperty("closeConsumeBatch");
  expect(value).not.toHaveProperty("closeConsumer");
  expect(value).not.toHaveProperty("closeConsumerReadiness");
  expect(value).not.toHaveProperty("closeRecordedEvent");
  expect(value).not.toHaveProperty("closeRequestedEvent");
  expect(value).not.toHaveProperty("closeRequest");
  expect(value).not.toHaveProperty("closeReadiness");
  expect(value).not.toHaveProperty("closeTarget");
  expect(value).not.toHaveProperty("closePreflight");
  expect(value).not.toHaveProperty("lifecycleDisposition");
  expect(value).not.toHaveProperty("spawnCandidate");
  expect(value).not.toHaveProperty("spawnLineage");
  expect(value).not.toHaveProperty("spawnConsume");
  expect(value).not.toHaveProperty("spawnConsumeBatch");
  expect(value).not.toHaveProperty("spawnEffects");
  expect(value).not.toHaveProperty("spawnEffectsBatch");
  expect(value).not.toHaveProperty("spawnApply");
  expect(value).not.toHaveProperty("spawnApplyBatch");
  expect(value).not.toHaveProperty("spawnHeadlessApply");
  expect(value).not.toHaveProperty("spawnHeadlessApplyBatch");
  expect(value).not.toHaveProperty("spawnHeadlessExecute");
  expect(value).not.toHaveProperty("spawnHeadlessExecuteBatch");
  expect(value).not.toHaveProperty("spawnHeadlessRecord");
  expect(value).not.toHaveProperty("spawnHeadlessRecordBatch");
  expect(value).not.toHaveProperty("spawnHeadlessView");
  expect(value).not.toHaveProperty("spawnHeadlessViewBatch");
  expect(value).not.toHaveProperty("spawnHeadlessContext");
  expect(value).not.toHaveProperty("spawnHeadlessContextBatch");
  expect(value).not.toHaveProperty("spawnHeadlessWaitCandidate");
  expect(value).not.toHaveProperty("spawnHeadlessWaitCandidateBatch");
  expect(value).not.toHaveProperty("spawnHeadlessWaitTarget");
  expect(value).not.toHaveProperty("spawnHeadlessWaitTargetBatch");
  expect(value).not.toHaveProperty("spawnHeadlessCloseCandidate");
  expect(value).not.toHaveProperty("spawnHeadlessCloseCandidateBatch");
  expect(value).not.toHaveProperty("spawnHeadlessCloseTarget");
  expect(value).not.toHaveProperty("spawnHeadlessCloseTargetBatch");
  expect(value).not.toHaveProperty("prompt");
  expect(value).not.toHaveProperty("cwd");
  expect(value).not.toHaveProperty("timeoutMs");
  expect(value).not.toHaveProperty("abortSignal");
  expect(value).not.toHaveProperty("execution");
  expect(value).not.toHaveProperty("stdout");
  expect(value).not.toHaveProperty("stderr");
  expect(value).not.toHaveProperty("exitCode");
  expect(value).not.toHaveProperty("events");
  expect(value).not.toHaveProperty("resolvedExecutable");
  expect(value).not.toHaveProperty("pathCandidates");
  expect(value).not.toHaveProperty("executable");
  expect(value).not.toHaveProperty("args");
  expect(value).not.toHaveProperty("env");
  expect(value).not.toHaveProperty("spawnHeadlessInput");
  expect(value).not.toHaveProperty("spawnHeadlessInputBatch");
  expect(value).not.toHaveProperty("spawnRecordedEvent");
  expect(value).not.toHaveProperty("spawnRequest");
  expect(value).not.toHaveProperty("spawnRequestedEvent");
  expect(value).not.toHaveProperty("spawnTarget");
  expect(value).not.toHaveProperty("waitCandidate");
  expect(value).not.toHaveProperty("waitConsume");
  expect(value).not.toHaveProperty("waitConsumeBatch");
  expect(value).not.toHaveProperty("waitConsumer");
  expect(value).not.toHaveProperty("waitConsumerReadiness");
  expect(value).not.toHaveProperty("waitRequest");
  expect(value).not.toHaveProperty("waitTarget");
  expect(value).not.toHaveProperty("runtimeContext");
  expect(value).not.toHaveProperty("waitReadiness");
  expect(value).not.toHaveProperty("spawnReadiness");
  expect(value).not.toHaveProperty("guardrails");
  expect(value).not.toHaveProperty("profile");
}

function sortedKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value).sort();
}

function createFakeRuntimeAdapter() {
  return {
    descriptor: {
      runtime: "codex-cli" as const,
      supportTier: "tier1" as const,
      guidanceFile: "AGENTS.md",
      projectConfig: ".codex/config.toml",
      note: "Concrete runtime.",
      capabilities: {
        machineReadableMode: "strong" as const,
        resume: "unsupported" as const,
        mcp: "unsupported" as const,
        sessionLifecycle: "unsupported" as const,
        eventStreamParsing: "partial" as const
      }
    },
    detect: vi.fn(async () => true),
    renderCommand: vi.fn(),
    degradeUnsupportedCapability: vi.fn(),
    supportsCapability: vi.fn()
  };
}

describe("runCli", () => {
  const tempDirectories: string[] = [];

  afterEach(async () => {
    vi.doUnmock("../../src/compat/index.js");
    vi.resetModules();
    await Promise.all(
      tempDirectories.map((directoryPath) =>
        rm(directoryPath, { recursive: true, force: true })
      )
    );
    tempDirectories.length = 0;
  });

  async function createTempDirectory(prefix: string): Promise<string> {
    const directoryPath = await mkdtemp(path.join(os.tmpdir(), prefix));
    tempDirectories.push(directoryPath);
    return directoryPath;
  }

  it("should print help for the root command", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["--help"], { stdout, stderr });

    expect(exitCode).toBe(0);
    expect(stdout.output).toContain("Usage: agent-worktree");
    expect(stderr.output).toBe("");
  });

  it("should return compat list as json", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "list", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.list",
      data: {
        tools: expect.any(Array)
      }
    });
    const payload = JSON.parse(stdout.output) as {
      data: { tools: Array<Record<string, unknown>> };
    };
    expect(sortedKeys(payload.data)).toEqual(["tools"]);
    expect(sortedKeys(payload.data.tools[0]!)).toEqual(
      [
        "guidanceFile",
        "machineReadableMode",
        "mcp",
        "note",
        "projectConfig",
        "resume",
        "tier",
        "tool"
      ].sort()
    );
    expect(stderr.output).toBe("");
  });

  it("should return compat show for codex-cli as json", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "show", "codex-cli", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.show",
      data: {
        tool: {
          tool: "codex-cli"
        }
      }
    });
    const payload = JSON.parse(stdout.output) as {
      data: { tool: Record<string, unknown> };
    };
    expect(sortedKeys(payload.data)).toEqual(["tool"]);
    expect(sortedKeys(payload.data.tool)).toEqual(
      [
        "guidanceFile",
        "machineReadableMode",
        "mcp",
        "note",
        "projectConfig",
        "resume",
        "tier",
        "tool"
      ].sort()
    );
    expect(stderr.output).toBe("");
  });

  it("should serialize compat list json output through the public allow-list", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const { runCli: runMockedCli } =
      await loadCliModuleWithCompatCatalogOverrides({
        listCompatibilityDescriptors: () =>
          [
            {
              tool: "codex-cli",
              tier: "tier1",
              guidanceFile: "AGENTS.md",
              projectConfig: ".codex/config.toml",
              machineReadableMode: "strong",
              resume: "unsupported",
              mcp: "unsupported",
              note: "Catalog entry.",
              hiddenField: "internal"
            }
          ] as never
      });

    const exitCode = await runMockedCli(["compat", "list", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.list",
      data: {
        tools: [
            {
              tool: "codex-cli",
              tier: "tier1",
              guidanceFile: "AGENTS.md",
              projectConfig: ".codex/config.toml",
              machineReadableMode: "strong",
              resume: "unsupported",
              mcp: "unsupported",
              note: "Catalog entry."
            }
          ]
      }
    });
    const payload = JSON.parse(stdout.output) as {
      data: { tools: Array<Record<string, unknown>> };
    };
    expect(payload.data.tools[0]).not.toHaveProperty("hiddenField");
    expect(sortedKeys(payload.data.tools[0]!)).toEqual(
      [
        "guidanceFile",
        "machineReadableMode",
        "mcp",
        "note",
        "projectConfig",
        "resume",
        "tier",
        "tool"
      ].sort()
    );
    expect(stderr.output).toBe("");
  });

  it("should return a structured validation error when compat list json serialization fails", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const { runCli: runMockedCli } =
      await loadCliModuleWithCompatCatalogOverrides({
        listCompatibilityDescriptors: () =>
          [
            {
              tool: "codex-cli",
              tier: "tier1",
              guidanceFile: "AGENTS.md",
              projectConfig: ".codex/config.toml",
              machineReadableMode: "future-mode",
              resume: "strong",
              mcp: "strong",
              note: "Catalog entry."
            }
          ] as never
      });

    const exitCode = await runMockedCli(["compat", "list", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "compat.list",
      error: {
        code: "VALIDATION_ERROR"
      }
    });
    const payload = JSON.parse(stdout.output) as {
      error: { message: string };
    };
    expect(typeof payload.error.message).toBe("string");
    expect(payload.error.message.trim().length).toBeGreaterThan(0);
    expect(stderr.output).toBe("");
  });

  it("should serialize compat show json output through the public allow-list", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const { runCli: runMockedCli } =
      await loadCliModuleWithCompatCatalogOverrides({
        getCompatibilityDescriptor: () =>
          ({
            tool: "codex-cli",
            tier: "tier1",
            guidanceFile: "AGENTS.md",
            projectConfig: ".codex/config.toml",
            machineReadableMode: "strong",
            resume: "unsupported",
            mcp: "unsupported",
            note: "Catalog entry.",
            hiddenField: "internal"
          }) as never
      });

    const exitCode = await runMockedCli(["compat", "show", "codex-cli", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.show",
      data: {
          tool: {
            tool: "codex-cli",
            tier: "tier1",
            guidanceFile: "AGENTS.md",
            projectConfig: ".codex/config.toml",
            machineReadableMode: "strong",
            resume: "unsupported",
            mcp: "unsupported",
            note: "Catalog entry."
          }
        }
    });
    const payload = JSON.parse(stdout.output) as {
      data: { tool: Record<string, unknown> };
    };
    expect(payload.data.tool).not.toHaveProperty("hiddenField");
    expect(sortedKeys(payload.data.tool)).toEqual(
      [
        "guidanceFile",
        "machineReadableMode",
        "mcp",
        "note",
        "projectConfig",
        "resume",
        "tier",
        "tool"
      ].sort()
    );
    expect(stderr.output).toBe("");
  });

  it("should return a structured validation error when compat show json serialization fails", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const { runCli: runMockedCli } =
      await loadCliModuleWithCompatCatalogOverrides({
        getCompatibilityDescriptor: () =>
          ({
            tool: "codex-cli",
            tier: "tier1",
            guidanceFile: "AGENTS.md",
            projectConfig: ".codex/config.toml",
            machineReadableMode: "future-mode",
            resume: "strong",
            mcp: "strong",
            note: "Catalog entry."
          }) as never
      });

    const exitCode = await runMockedCli(["compat", "show", "codex-cli", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "compat.show",
      error: {
        code: "VALIDATION_ERROR"
      }
    });
    const payload = JSON.parse(stdout.output) as {
      error: { message: string };
    };
    expect(typeof payload.error.message).toBe("string");
    expect(payload.error.message.trim().length).toBeGreaterThan(0);
    expect(stderr.output).toBe("");
  });

  it("should return compat probe for codex-cli as json without leaking probe internals", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "probe", "codex-cli", "--json"], {
      stdout,
      stderr,
      compatProbeImpl: async () =>
        ({
        probe: {
          runtime: "codex-cli",
          supportTier: "tier1",
          guidanceFile: "AGENTS.md",
          projectConfig: ".codex/config.toml",
          note: "Concrete runtime.",
          capabilities: {
            machineReadableMode: "strong",
            resume: "unsupported",
            mcp: "unsupported",
            sessionLifecycle: "unsupported",
            eventStreamParsing: "partial",
            hiddenCapability: "internal"
          },
          adapterStatus: "implemented",
          probeStatus: "supported",
          diagnosis: {
            code: "exec_json_supported",
            summary:
              "A local codex executable with `exec --json` support was confirmed.",
            resolvedExecutable: "/Users/example/.bun/bin/codex"
          },
          runtimeState: {
            sessionId: "thr_hidden"
          }
        }
      }) as unknown as CompatibilityProbeData
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.probe",
      data: {
        probe: {
          runtime: "codex-cli",
          adapterStatus: "implemented",
          probeStatus: "supported",
          diagnosis: {
            code: "exec_json_supported"
          }
        }
      }
    });
    const payload = JSON.parse(stdout.output) as {
      data: { probe: Record<string, unknown> };
    };
    expect(sortedKeys(payload.data)).toEqual(["probe"]);
    expect(sortedKeys(payload.data.probe)).toEqual(
      [
        "adapterStatus",
        "capabilities",
        "diagnosis",
        "guidanceFile",
        "note",
        "probeStatus",
        "projectConfig",
        "runtime",
        "supportTier"
      ].sort()
    );
    expect(
      sortedKeys(payload.data.probe.capabilities as Record<string, unknown>)
    ).toEqual(
      [
        "eventStreamParsing",
        "machineReadableMode",
        "mcp",
        "resume",
        "sessionLifecycle"
      ].sort()
    );
    expect(
      sortedKeys(payload.data.probe.diagnosis as Record<string, unknown>)
    ).toEqual(["code", "summary"]);
    assertNoInternalRuntimeMetadata(payload.data as Record<string, unknown>);
    assertNoInternalRuntimeMetadata(payload.data.probe);
    assertNoInternalRuntimeMetadata(
      payload.data.probe.diagnosis as Record<string, unknown>
    );
    expect(stderr.output).toBe("");
  });

  it("should return compat probe for descriptor-only runtimes as not_probed", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "probe", "claude-code", "--json"], {
      stdout,
      stderr,
      compatProbeImpl: async () => ({
        probe: {
          runtime: "claude-code",
          supportTier: "tier1",
          guidanceFile: "CLAUDE.md",
          projectConfig: ".claude/settings.json",
          note: "Descriptor-only runtime.",
          capabilities: {
            machineReadableMode: "unsupported",
            resume: "unsupported",
            mcp: "unsupported",
            sessionLifecycle: "unsupported",
            eventStreamParsing: "unsupported"
          },
          adapterStatus: "descriptor_only",
          probeStatus: "not_probed",
          diagnosis: {
            code: "descriptor_only",
            summary:
              "This runtime remains descriptor-only in the current phase and is not runtime-probed."
          }
        }
      })
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.probe",
      data: {
        probe: {
          runtime: "claude-code",
          adapterStatus: "descriptor_only",
          probeStatus: "not_probed",
          diagnosis: {
            code: "descriptor_only"
          }
        }
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should return compat probe for codex-cli as unsupported in json mode", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "probe", "codex-cli", "--json"], {
      stdout,
      stderr,
      compatProbeImpl: async () => ({
        probe: {
          runtime: "codex-cli",
          supportTier: "tier1",
          guidanceFile: "AGENTS.md",
          projectConfig: ".codex/config.toml",
          note: "Concrete runtime.",
          capabilities: {
            machineReadableMode: "strong",
            resume: "unsupported",
            mcp: "unsupported",
            sessionLifecycle: "unsupported",
            eventStreamParsing: "partial"
          },
          adapterStatus: "implemented",
          probeStatus: "unsupported",
          diagnosis: {
            code: "exec_json_unavailable",
            summary:
              "No local codex executable with `exec --json` support was confirmed."
          }
        }
      })
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.probe",
      data: {
        probe: {
          runtime: "codex-cli",
          adapterStatus: "implemented",
          probeStatus: "unsupported",
          diagnosis: {
            code: "exec_json_unavailable"
          }
        }
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should return compat smoke for codex-cli as json without leaking smoke internals", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "smoke", "codex-cli", "--json"], {
      stdout,
      stderr,
      compatSmokeImpl: async () =>
        ({
        smoke: {
          runtime: "codex-cli",
          supportTier: "tier1",
          guidanceFile: "AGENTS.md",
          projectConfig: ".codex/config.toml",
          note: "Concrete runtime.",
          capabilities: {
            machineReadableMode: "strong",
            resume: "unsupported",
            mcp: "unsupported",
            sessionLifecycle: "unsupported",
            eventStreamParsing: "partial",
            hiddenCapability: "internal"
          },
          adapterStatus: "implemented",
          smokeStatus: "passed",
          diagnosis: {
            code: "smoke_passed",
            summary:
              "The bounded codex-cli smoke path completed the public compatibility checks.",
            runtimeState: {
              sessionId: "thr_hidden"
            }
          },
          env: {
            OPENAI_API_KEY: "secret"
          }
        }
      }) as unknown as CompatibilitySmokeData
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.smoke",
      data: {
        smoke: {
          runtime: "codex-cli",
          adapterStatus: "implemented",
          smokeStatus: "passed",
          diagnosis: {
            code: "smoke_passed"
          }
        }
      }
    });
    const payload = JSON.parse(stdout.output) as {
      data: { smoke: Record<string, unknown> };
    };
    expect(sortedKeys(payload.data)).toEqual(["smoke"]);
    expect(sortedKeys(payload.data.smoke)).toEqual(
      [
        "adapterStatus",
        "capabilities",
        "diagnosis",
        "guidanceFile",
        "note",
        "projectConfig",
        "runtime",
        "smokeStatus",
        "supportTier"
      ].sort()
    );
    expect(
      sortedKeys(payload.data.smoke.capabilities as Record<string, unknown>)
    ).toEqual(
      [
        "eventStreamParsing",
        "machineReadableMode",
        "mcp",
        "resume",
        "sessionLifecycle"
      ].sort()
    );
    expect(
      sortedKeys(payload.data.smoke.diagnosis as Record<string, unknown>)
    ).toEqual(["code", "summary"]);
    assertNoInternalRuntimeMetadata(payload.data as Record<string, unknown>);
    assertNoInternalRuntimeMetadata(payload.data.smoke);
    assertNoInternalRuntimeMetadata(
      payload.data.smoke.diagnosis as Record<string, unknown>
    );
    expect(stderr.output).toBe("");
  });

  it("should return compat smoke for codex-cli as skipped when the gate is disabled", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "smoke", "codex-cli", "--json"], {
      stdout,
      stderr,
      compatSmokeImpl: async () => ({
        smoke: {
          runtime: "codex-cli",
          supportTier: "tier1",
          guidanceFile: "AGENTS.md",
          projectConfig: ".codex/config.toml",
          note: "Concrete runtime.",
          capabilities: {
            machineReadableMode: "strong",
            resume: "unsupported",
            mcp: "unsupported",
            sessionLifecycle: "unsupported",
            eventStreamParsing: "partial"
          },
          adapterStatus: "implemented",
          smokeStatus: "skipped",
          diagnosis: {
            code: "gate_disabled",
            summary:
              "Compatibility smoke is skipped unless `RUN_CODEX_SMOKE=1` is set."
          }
        }
      })
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.smoke",
      data: {
        smoke: {
          runtime: "codex-cli",
          smokeStatus: "skipped",
          diagnosis: {
            code: "gate_disabled"
          }
        }
      }
    });
    const payload = JSON.parse(stdout.output) as {
      data: { smoke: Record<string, unknown> };
    };
    expect(sortedKeys(payload.data)).toEqual(["smoke"]);
    expect(sortedKeys(payload.data.smoke)).toEqual(
      [
        "adapterStatus",
        "capabilities",
        "diagnosis",
        "guidanceFile",
        "note",
        "projectConfig",
        "runtime",
        "smokeStatus",
        "supportTier"
      ].sort()
    );
    expect(
      sortedKeys(payload.data.smoke.capabilities as Record<string, unknown>)
    ).toEqual(
      [
        "eventStreamParsing",
        "machineReadableMode",
        "mcp",
        "resume",
        "sessionLifecycle"
      ].sort()
    );
    expect(
      sortedKeys(payload.data.smoke.diagnosis as Record<string, unknown>)
    ).toEqual(["code", "summary"]);
    assertNoInternalRuntimeMetadata(payload.data as Record<string, unknown>);
    assertNoInternalRuntimeMetadata(payload.data.smoke);
    assertNoInternalRuntimeMetadata(
      payload.data.smoke.diagnosis as Record<string, unknown>
    );
    expect(stderr.output).toBe("");
  });

  it("should return compat smoke for codex-cli as an error in json mode", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "smoke", "codex-cli", "--json"], {
      stdout,
      stderr,
      compatSmokeImpl: async () => ({
        smoke: {
          runtime: "codex-cli",
          supportTier: "tier1",
          guidanceFile: "AGENTS.md",
          projectConfig: ".codex/config.toml",
          note: "Concrete runtime.",
          capabilities: {
            machineReadableMode: "strong",
            resume: "unsupported",
            mcp: "unsupported",
            sessionLifecycle: "unsupported",
            eventStreamParsing: "partial"
          },
          adapterStatus: "implemented",
          smokeStatus: "error",
          diagnosis: {
            code: "unexpected_error",
            summary:
              "The bounded codex-cli smoke path did not complete successfully."
          }
        }
      })
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.smoke",
      data: {
        smoke: {
          runtime: "codex-cli",
          adapterStatus: "implemented",
          smokeStatus: "error",
          diagnosis: {
            code: "unexpected_error"
          }
        }
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should return compat smoke for codex-cli as failed when the bounded checks fail", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "smoke", "codex-cli", "--json"], {
      stdout,
      stderr,
      compatSmokeImpl: async () => ({
        smoke: {
          runtime: "codex-cli",
          supportTier: "tier1",
          guidanceFile: "AGENTS.md",
          projectConfig: ".codex/config.toml",
          note: "Concrete runtime.",
          capabilities: {
            machineReadableMode: "strong",
            resume: "unsupported",
            mcp: "unsupported",
            sessionLifecycle: "unsupported",
            eventStreamParsing: "partial"
          },
          adapterStatus: "implemented",
          smokeStatus: "failed",
          diagnosis: {
            code: "execution_failed",
            summary:
              "The bounded codex-cli smoke path did not satisfy the public compatibility checks."
          }
        }
      })
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.smoke",
      data: {
        smoke: {
          runtime: "codex-cli",
          smokeStatus: "failed",
          diagnosis: {
            code: "execution_failed"
          }
        }
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should return compat smoke for descriptor-only runtimes as not_supported", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "smoke", "claude-code", "--json"], {
      stdout,
      stderr,
      compatSmokeImpl: async () => ({
        smoke: {
          runtime: "claude-code",
          supportTier: "tier1",
          guidanceFile: "CLAUDE.md",
          projectConfig: ".claude/settings.json",
          note: "Descriptor-only runtime.",
          capabilities: {
            machineReadableMode: "unsupported",
            resume: "unsupported",
            mcp: "unsupported",
            sessionLifecycle: "unsupported",
            eventStreamParsing: "unsupported"
          },
          adapterStatus: "descriptor_only",
          smokeStatus: "not_supported",
          diagnosis: {
            code: "descriptor_only",
            summary:
              "This runtime remains descriptor-only in the current phase and does not support public compatibility smoke."
          }
        }
      })
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.smoke",
      data: {
        smoke: {
          runtime: "claude-code",
          adapterStatus: "descriptor_only",
          smokeStatus: "not_supported",
          diagnosis: {
            code: "descriptor_only"
          }
        }
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should keep probe errors bounded to a success envelope with public error status", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "probe", "codex-cli", "--json"], {
      stdout,
      stderr,
      compatProbeImpl: async () => ({
        probe: {
          runtime: "codex-cli",
          supportTier: "tier1",
          guidanceFile: "AGENTS.md",
          projectConfig: ".codex/config.toml",
          note: "Concrete runtime.",
          capabilities: {
            machineReadableMode: "strong",
            resume: "unsupported",
            mcp: "unsupported",
            sessionLifecycle: "unsupported",
            eventStreamParsing: "partial"
          },
          adapterStatus: "implemented",
          probeStatus: "error",
          diagnosis: {
            code: "probe_error",
            summary:
              "The local codex-cli compatibility probe did not complete successfully."
          }
        }
      })
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.probe",
      data: {
        probe: {
          runtime: "codex-cli",
          probeStatus: "error",
          diagnosis: {
            code: "probe_error"
          }
        }
      }
    });
    const payload = JSON.parse(stdout.output) as {
      data: { probe: Record<string, unknown> };
    };
    expect(sortedKeys(payload.data)).toEqual(["probe"]);
    expect(sortedKeys(payload.data.probe)).toEqual(
      [
        "adapterStatus",
        "capabilities",
        "diagnosis",
        "guidanceFile",
        "note",
        "probeStatus",
        "projectConfig",
        "runtime",
        "supportTier"
      ].sort()
    );
    expect(
      sortedKeys(payload.data.probe.capabilities as Record<string, unknown>)
    ).toEqual(
      [
        "eventStreamParsing",
        "machineReadableMode",
        "mcp",
        "resume",
        "sessionLifecycle"
      ].sort()
    );
    expect(
      sortedKeys(payload.data.probe.diagnosis as Record<string, unknown>)
    ).toEqual(["code", "summary"]);
    assertNoInternalRuntimeMetadata(payload.data as Record<string, unknown>);
    assertNoInternalRuntimeMetadata(payload.data.probe);
    assertNoInternalRuntimeMetadata(
      payload.data.probe.diagnosis as Record<string, unknown>
    );
    expect(stderr.output).toBe("");
  });

  it("should keep thrown smoke failures bounded to a success envelope with public error status", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "smoke", "codex-cli", "--json"], {
      stdout,
      stderr,
      compatSmokeImpl: async () =>
        buildCompatibilitySmokeData("codex-cli", {
          getAdapterDescriptorImpl: () => ({
            runtime: "codex-cli",
            supportTier: "tier1",
            guidanceFile: "AGENTS.md",
            projectConfig: ".codex/config.toml",
            note: "Concrete runtime.",
            capabilities: {
              machineReadableMode: "strong",
              resume: "unsupported",
              mcp: "unsupported",
              sessionLifecycle: "unsupported",
              eventStreamParsing: "partial"
            }
          }),
          getRuntimeAdapterImpl: () => createFakeRuntimeAdapter(),
          smokeCodexCliCompatibilityImpl: async () => {
            throw new Error("runner exploded");
          }
        })
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "compat.smoke",
      data: {
        smoke: {
          runtime: "codex-cli",
          smokeStatus: "error",
          diagnosis: {
            code: "unexpected_error",
            summary:
              "The bounded codex-cli smoke path did not complete successfully."
          }
        }
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should normalize unexpected compat probe failures to the shared runtime error envelope", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "probe", "codex-cli", "--json"], {
      stdout,
      stderr,
      compatProbeImpl: async () => {
        throw new Error("boom");
      }
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toEqual({
      ok: false,
      command: "compat.probe",
      error: {
        code: "RUNTIME_ERROR",
        message: "boom"
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should return doctor diagnostics as json without leaking internal metadata", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["doctor", "--json"], {
      stdout,
      stderr,
      doctorImpl: async () =>
        ({
        runtimes: [
          {
            runtime: "codex-cli",
            supportTier: "tier1",
            guidanceFile: "AGENTS.md",
            projectConfig: ".codex/config.toml",
            note: "Concrete runtime.",
            capabilities: {
              machineReadableMode: "strong",
              resume: "unsupported",
              mcp: "unsupported",
              sessionLifecycle: "unsupported",
              eventStreamParsing: "partial",
              hiddenCapability: "internal"
            },
            adapterStatus: "implemented",
            detected: true,
            controlPlane: {
              sessionId: "thr_hidden"
            }
          },
          {
            runtime: "claude-code",
            supportTier: "tier1",
            guidanceFile: "CLAUDE.md",
            projectConfig: ".claude/settings.json",
            note: "Descriptor-only runtime.",
            capabilities: {
              machineReadableMode: "unsupported",
              resume: "unsupported",
              mcp: "unsupported",
              sessionLifecycle: "unsupported",
              eventStreamParsing: "unsupported",
              hiddenCapability: "internal"
            },
            adapterStatus: "descriptor_only",
            detected: null,
            runtimeState: {
              status: "internal"
            }
          }
        ]
      }) as unknown as CompatibilityDoctorData
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "doctor",
      data: {
        runtimes: [
          {
            runtime: "codex-cli",
            adapterStatus: "implemented",
            detected: true
          },
          {
            runtime: "claude-code",
            adapterStatus: "descriptor_only",
            detected: null
          }
        ]
      }
    });
    const payload = JSON.parse(stdout.output) as {
      data: { runtimes: Array<Record<string, unknown>> };
    };
    expect(sortedKeys(payload.data)).toEqual(["runtimes"]);
    assertNoInternalRuntimeMetadata(payload.data as Record<string, unknown>);
    payload.data.runtimes.forEach((runtime) => {
      expect(sortedKeys(runtime)).toEqual(
        [
          "adapterStatus",
          "capabilities",
          "detected",
          "guidanceFile",
          "note",
          "projectConfig",
          "runtime",
          "supportTier"
        ].sort()
      );
      expect(sortedKeys(runtime.capabilities as Record<string, unknown>)).toEqual(
        [
          "eventStreamParsing",
          "machineReadableMode",
          "mcp",
          "resume",
          "sessionLifecycle"
        ].sort()
      );
      assertNoInternalRuntimeMetadata(runtime);
    });
    expect(stderr.output).toBe("");
  });

  it("should return doctor diagnostics with detected=false for implemented runtimes", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["doctor", "--json"], {
      stdout,
      stderr,
      doctorImpl: async () => ({
        runtimes: [
          {
            runtime: "codex-cli",
            supportTier: "tier1",
            guidanceFile: "AGENTS.md",
            projectConfig: ".codex/config.toml",
            note: "Concrete runtime.",
            capabilities: {
              machineReadableMode: "strong",
              resume: "unsupported",
              mcp: "unsupported",
              sessionLifecycle: "unsupported",
              eventStreamParsing: "partial"
            },
            adapterStatus: "implemented",
            detected: false
          }
        ]
      })
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "doctor",
      data: {
        runtimes: [
          {
            runtime: "codex-cli",
            adapterStatus: "implemented",
            detected: false
          }
        ]
      }
    });
    const payload = JSON.parse(stdout.output) as {
      data: { runtimes: Array<Record<string, unknown>> };
    };
    expect(sortedKeys(payload.data)).toEqual(["runtimes"]);
    expect(sortedKeys(payload.data.runtimes[0]!)).toEqual(
      [
        "adapterStatus",
        "capabilities",
        "detected",
        "guidanceFile",
        "note",
        "projectConfig",
        "runtime",
        "supportTier"
      ].sort()
    );
    expect(
      sortedKeys(payload.data.runtimes[0]!.capabilities as Record<string, unknown>)
    ).toEqual(
      [
        "eventStreamParsing",
        "machineReadableMode",
        "mcp",
        "resume",
        "sessionLifecycle"
      ].sort()
    );
    assertNoInternalRuntimeMetadata(payload.data as Record<string, unknown>);
    assertNoInternalRuntimeMetadata(payload.data.runtimes[0]!);
    expect(stderr.output).toBe("");
  });

  it("should return a structured error for unknown compatibility targets", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "show", "missing-tool", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "compat.show",
      error: {
        code: "NOT_FOUND"
      }
    });
    const payload = JSON.parse(stdout.output) as {
      command: string;
      error: Record<string, unknown>;
      ok: boolean;
    };
    expect(sortedKeys(payload)).toEqual(["command", "error", "ok"]);
    expect(sortedKeys(payload.error)).toEqual(["code", "message"]);
    expect(payload.error.message).toBe(
      "Unknown compatibility target: missing-tool."
    );
    expect(stderr.output).toBe("");
  });

  it("should return a structured error for unknown compatibility probe targets", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "probe", "missing-tool", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "compat.probe",
      error: {
        code: "NOT_FOUND"
      }
    });
    const payload = JSON.parse(stdout.output) as {
      error: { message: string };
    };
    expect(payload.error.message).toBe(
      "Unknown compatibility target: missing-tool."
    );
    expect(stderr.output).toBe("");
  });

  it("should return a structured error for unknown compatibility smoke targets", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["compat", "smoke", "missing-tool", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "compat.smoke",
      error: {
        code: "NOT_FOUND"
      }
    });
    const payload = JSON.parse(stdout.output) as {
      error: { message: string };
    };
    expect(payload.error.message).toBe(
      "Unknown compatibility target: missing-tool."
    );
    expect(stderr.output).toBe("");
  });

  it("should return a non-zero exit code for unknown commands", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["unknown-command"], { stdout, stderr });

    expect(exitCode).toBeGreaterThan(0);
    expect(stderr.output).toContain("unknown command");
  });

  it("should keep attempt close outside the public cli surface", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["attempt", "close"], { stdout, stderr });

    expect(exitCode).toBeGreaterThan(0);
    expect(stdout.output).toBe("");
    expect(stderr.output).toContain("unknown command");
  });

  it("should keep attempt spawn outside the public cli surface", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["attempt", "spawn"], { stdout, stderr });

    expect(exitCode).toBeGreaterThan(0);
    expect(stdout.output).toBe("");
    expect(stderr.output).toContain("unknown command");
  });

  it("should keep attempt wait outside the public cli surface", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["attempt", "wait"], { stdout, stderr });

    expect(exitCode).toBeGreaterThan(0);
    expect(stdout.output).toBe("");
    expect(stderr.output).toContain("unknown command");
  });

  it("should keep attempt create profile selection outside the public cli surface", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(
      ["attempt", "create", "--profile", "project-managed"],
      {
        stdout,
        stderr
      }
    );

    expect(exitCode).toBeGreaterThan(0);
    expect(stdout.output).toBe("");
    expect(stderr.output).toContain("unknown option '--profile'");
  });

  it("should keep attempt create provenance flags outside the public cli surface", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(
      ["attempt", "create", "--source-kind", "fork", "--parent-attempt-id", "att_parent"],
      {
        stdout,
        stderr
      }
    );

    expect(exitCode).toBeGreaterThan(0);
    expect(stdout.output).toBe("");
    expect(stderr.output).toContain("unknown option '--source-kind'");
  });

  it("should keep positional attempt cleanup selectors outside the public cli surface", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["attempt", "cleanup", "att_positional", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBeGreaterThan(0);
    expect(stdout.output).toBe("");
    expect(stderr.output).toContain("too many arguments");
  });

  it("should return a structured success envelope for attempt cleanup in json mode", async () => {
    const stdoutCreate = new MemoryWriter();
    const stderrCreate = new MemoryWriter();
    const stdoutCleanup = new MemoryWriter();
    const stderrCleanup = new MemoryWriter();
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const worktreeRoot = await createTempDirectory("agent-worktree-cli-worktree-");

    const createExitCode = await runCli(
      [
        "attempt",
        "create",
        "--task-id",
        "Cleanup CLI contract",
        "--repo-root",
        repoRoot,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutCreate,
        stderr: stderrCreate
      }
    );

    expect(createExitCode).toBe(0);
    const createPayload = JSON.parse(stdoutCreate.output) as {
      data: { attempt: { attemptId: string } };
      ok: boolean;
    };

    const cleanupExitCode = await runCli(
      [
        "attempt",
        "cleanup",
        "--attempt-id",
        createPayload.data.attempt.attemptId,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutCleanup,
        stderr: stderrCleanup
      }
    );

    expect(cleanupExitCode).toBe(0);
    expect(JSON.parse(stdoutCleanup.output)).toMatchObject({
      ok: true,
      command: "attempt.cleanup",
      data: {
        attempt: {
          attemptId: createPayload.data.attempt.attemptId,
          status: "cleaned",
          sourceKind: "direct"
        },
        cleanup: {
          outcome: "removed",
          worktreeRemoved: true
        }
      }
    });
    const cleanupPayload = JSON.parse(stdoutCleanup.output) as {
      data: Record<string, unknown>;
    };
    expect(sortedKeys(cleanupPayload.data)).toEqual(["attempt", "cleanup"]);
    expect(
      sortedKeys(cleanupPayload.data.attempt as Record<string, unknown>)
    ).toEqual(
      [
        "adapter",
        "attemptId",
        "branch",
        "repoRoot",
        "runtime",
        "sourceKind",
        "status",
        "supportTier",
        "taskId",
        "worktreePath"
      ].sort()
    );
    expect(
      sortedKeys(cleanupPayload.data.cleanup as Record<string, unknown>)
    ).toEqual(["outcome", "worktreeRemoved"]);
    assertNoInternalRuntimeMetadata(cleanupPayload.data);
    assertNoInternalRuntimeMetadata(
      cleanupPayload.data.attempt as Record<string, unknown>
    );
    expect(stderrCleanup.output).toBe("");

    const stdoutList = new MemoryWriter();
    const stderrList = new MemoryWriter();
    const listExitCode = await runCli(
      ["attempt", "list", "--manifest-root", manifestRoot, "--json"],
      {
        stdout: stdoutList,
        stderr: stderrList
      }
    );

    expect(listExitCode).toBe(0);
    expect(JSON.parse(stdoutList.output)).toMatchObject({
      ok: true,
      command: "attempt.list",
      data: {
        attempts: [
          {
            attemptId: createPayload.data.attempt.attemptId,
            status: "cleaned",
            sourceKind: "direct"
          }
        ]
      }
    });
    const listPayload = JSON.parse(stdoutList.output) as {
      data: { attempts: Array<Record<string, unknown>> };
    };
    assertNoInternalRuntimeMetadata(listPayload.data.attempts[0]!);
    expect(stderrList.output).toBe("");
  }, 10000);

  it("should return a structured failure envelope for attempt cleanup in json mode", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const worktreeRoot = await createTempDirectory("agent-worktree-cli-worktree-");

    const exitCode = await runCli(
      [
        "attempt",
        "cleanup",
        "--attempt-id",
        "att_missing",
        "--manifest-root",
        manifestRoot,
        "--json"
      ],
      {
        stdout,
        stderr
      }
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "attempt.cleanup",
      error: {
        code: "NOT_FOUND"
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should return a structured validation error when cleanup is missing --attempt-id", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["attempt", "cleanup", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "attempt.cleanup",
      error: {
        code: "VALIDATION_ERROR"
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should return a structured validation error when cleanup uses an unsafe attempt-id selector", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");

    const exitCode = await runCli(
      [
        "attempt",
        "cleanup",
        "--attempt-id",
        "../att_escape",
        "--manifest-root",
        manifestRoot,
        "--json"
      ],
      {
        stdout,
        stderr
      }
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "attempt.cleanup",
      error: {
        code: "VALIDATION_ERROR"
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should keep attempt attach unimplemented in json mode", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["attempt", "attach", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "attempt.attach",
      error: {
        code: "NOT_IMPLEMENTED"
      }
    });
    const payload = JSON.parse(stdout.output) as {
      command: string;
      error: Record<string, unknown>;
      ok: boolean;
    };
    expect(sortedKeys(payload)).toEqual(["command", "error", "ok"]);
    expect(sortedKeys(payload.error)).toEqual(["code", "message"]);
    expect(payload.error.message).toBe(
      "attempt.attach is not implemented in the current phase."
    );
    expect(stderr.output).toBe("");
  });

  it("should keep attempt stop unimplemented in json mode", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["attempt", "stop", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "attempt.stop",
      error: {
        code: "NOT_IMPLEMENTED"
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should report already_cleaned when cleanup is repeated", async () => {
    const stdoutCreate = new MemoryWriter();
    const stderrCreate = new MemoryWriter();
    const stdoutFirstCleanup = new MemoryWriter();
    const stderrFirstCleanup = new MemoryWriter();
    const stdoutSecondCleanup = new MemoryWriter();
    const stderrSecondCleanup = new MemoryWriter();
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const worktreeRoot = await createTempDirectory("agent-worktree-cli-worktree-");

    await runCli(
      [
        "attempt",
        "create",
        "--task-id",
        "Repeat cleanup CLI",
        "--repo-root",
        repoRoot,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutCreate,
        stderr: stderrCreate
      }
    );

    const attemptId = JSON.parse(stdoutCreate.output).data.attempt.attemptId as string;

    await runCli(
      [
        "attempt",
        "cleanup",
        "--attempt-id",
        attemptId,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutFirstCleanup,
        stderr: stderrFirstCleanup
      }
    );

    const secondExitCode = await runCli(
      [
        "attempt",
        "cleanup",
        "--attempt-id",
        attemptId,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutSecondCleanup,
        stderr: stderrSecondCleanup
      }
    );

    expect(secondExitCode).toBe(0);
    expect(JSON.parse(stdoutSecondCleanup.output)).toMatchObject({
      ok: true,
      command: "attempt.cleanup",
      data: {
        cleanup: {
          outcome: "already_cleaned",
          worktreeRemoved: false
        }
      }
    });
    expect(stderrSecondCleanup.output).toBe("");
  }, 10000);

  it("should return missing_worktree_converged for cleanup when the worktree is already gone safely", async () => {
    const stdoutCreate = new MemoryWriter();
    const stderrCreate = new MemoryWriter();
    const stdoutCleanup = new MemoryWriter();
    const stderrCleanup = new MemoryWriter();
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const worktreeRoot = await createTempDirectory("agent-worktree-cli-worktree-");

    const createExitCode = await runCli(
      [
        "attempt",
        "create",
        "--task-id",
        "Converged cleanup CLI",
        "--repo-root",
        repoRoot,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutCreate,
        stderr: stderrCreate
      }
    );

    expect(createExitCode).toBe(0);
    const attemptId = JSON.parse(stdoutCreate.output).data.attempt.attemptId as string;
    const manifest = await readManifest(attemptId, { rootDir: manifestRoot });

    await runGit(["worktree", "remove", manifest.worktreePath!], {
      cwd: repoRoot
    });

    const cleanupExitCode = await runCli(
      [
        "attempt",
        "cleanup",
        "--attempt-id",
        attemptId,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutCleanup,
        stderr: stderrCleanup
      }
    );

    expect(cleanupExitCode).toBe(0);
    expect(JSON.parse(stdoutCleanup.output)).toMatchObject({
      ok: true,
      command: "attempt.cleanup",
      data: {
        attempt: {
          attemptId,
          status: "cleaned",
          sourceKind: "direct"
        },
        cleanup: {
          outcome: "missing_worktree_converged",
          worktreeRemoved: false
        }
      }
    });
    const cleanupPayload = JSON.parse(stdoutCleanup.output) as {
      data: {
        attempt: Record<string, unknown>;
        cleanup: Record<string, unknown>;
      };
    };
    expect(sortedKeys(cleanupPayload.data.attempt)).toEqual(
      [
        "adapter",
        "attemptId",
        "branch",
        "repoRoot",
        "runtime",
        "sourceKind",
        "status",
        "supportTier",
        "taskId",
        "worktreePath"
      ].sort()
    );
    expect(sortedKeys(cleanupPayload.data.cleanup)).toEqual([
      "outcome",
      "worktreeRemoved"
    ]);
    expect(stderrCleanup.output).toBe("");
  }, 10000);

  it("should return a structured validation error when create is missing --task-id", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();

    const exitCode = await runCli(["attempt", "create", "--json"], {
      stdout,
      stderr
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "attempt.create",
      error: {
        code: "VALIDATION_ERROR"
      }
    });
    const payload = JSON.parse(stdout.output) as {
      command: string;
      error: Record<string, unknown>;
      ok: boolean;
    };
    expect(sortedKeys(payload)).toEqual(["command", "error", "ok"]);
    expect(sortedKeys(payload.error)).toEqual(["code", "message"]);
    expect(payload.error.message).toBe("attempt.create requires --task-id.");
    expect(stderr.output).toBe("");
  });

  it("should return an empty attempt list as json", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");

    const exitCode = await runCli(
      ["attempt", "list", "--manifest-root", manifestRoot, "--json"],
      {
        stdout,
        stderr
      }
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "attempt.list",
      data: {
        attempts: []
      }
    });
  });

  it("should fail attempt list when a manifest is invalid", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const invalidAttemptDirectory = path.join(manifestRoot, "att_invalid");

    await mkdir(invalidAttemptDirectory, { recursive: true });
    await writeFile(
      path.join(invalidAttemptDirectory, "manifest.json"),
      JSON.stringify({ attemptId: "att_invalid" }),
      "utf8"
    );

    const exitCode = await runCli(
      ["attempt", "list", "--manifest-root", manifestRoot, "--json"],
      {
        stdout,
        stderr
      }
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "attempt.list",
      error: {
        code: "VALIDATION_ERROR"
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should fail attempt list when an attempt directory is missing manifest.json", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");

    await mkdir(path.join(manifestRoot, "att_empty"), { recursive: true });

    const exitCode = await runCli(
      ["attempt", "list", "--manifest-root", manifestRoot, "--json"],
      {
        stdout,
        stderr
      }
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "attempt.list",
      error: {
        code: "VALIDATION_ERROR"
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should fail cleanup when the targeted manifest is invalid", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const invalidAttemptDirectory = path.join(manifestRoot, "att_invalid_cleanup");

    await mkdir(invalidAttemptDirectory, { recursive: true });
    await writeFile(
      path.join(invalidAttemptDirectory, "manifest.json"),
      JSON.stringify({ attemptId: "att_invalid_cleanup" }),
      "utf8"
    );

    const exitCode = await runCli(
      [
        "attempt",
        "cleanup",
        "--attempt-id",
        "att_invalid_cleanup",
        "--manifest-root",
        manifestRoot,
        "--json"
      ],
      {
        stdout,
        stderr
      }
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "attempt.cleanup",
      error: {
        code: "VALIDATION_ERROR"
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should fail attempt list when provenance metadata is invalid", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const invalidAttemptDirectory = path.join(manifestRoot, "att_invalid_source");

    await mkdir(invalidAttemptDirectory, { recursive: true });
    await writeFile(
      path.join(invalidAttemptDirectory, "manifest.json"),
      JSON.stringify({
        schemaVersion: "0.x",
        attemptId: "att_invalid_source",
        taskId: "task_docs",
        runtime: "codex-cli",
        adapter: "subprocess",
        sourceKind: "direct",
        parentAttemptId: "att_parent",
        status: "created",
        verification: {
          state: "pending",
          checks: []
        }
      }),
      "utf8"
    );

    const exitCode = await runCli(
      ["attempt", "list", "--manifest-root", manifestRoot, "--json"],
      {
        stdout,
        stderr
      }
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "attempt.list",
      error: {
        code: "VALIDATION_ERROR"
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should fail cleanup when provenance metadata is invalid", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const invalidAttemptDirectory = path.join(
      manifestRoot,
      "att_invalid_cleanup_source"
    );

    await mkdir(invalidAttemptDirectory, { recursive: true });
    await writeFile(
      path.join(invalidAttemptDirectory, "manifest.json"),
      JSON.stringify({
        schemaVersion: "0.x",
        attemptId: "att_invalid_cleanup_source",
        taskId: "task_docs",
        runtime: "codex-cli",
        adapter: "subprocess",
        sourceKind: "direct",
        parentAttemptId: "att_parent",
        status: "created",
        verification: {
          state: "pending",
          checks: []
        }
      }),
      "utf8"
    );

    const exitCode = await runCli(
      [
        "attempt",
        "cleanup",
        "--attempt-id",
        "att_invalid_cleanup_source",
        "--manifest-root",
        manifestRoot,
        "--json"
      ],
      {
        stdout,
        stderr
      }
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: false,
      command: "attempt.cleanup",
      error: {
        code: "VALIDATION_ERROR"
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should list attempts with opaque parentAttemptId provenance without requiring the parent manifest", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const worktreeRoot = await createTempDirectory("agent-worktree-cli-worktree-");

    const stdoutCreate = new MemoryWriter();
    const stderrCreate = new MemoryWriter();
    const createExitCode = await runCli(
      [
        "attempt",
        "create",
        "--task-id",
        "Opaque parent list",
        "--repo-root",
        repoRoot,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutCreate,
        stderr: stderrCreate
      }
    );

    expect(createExitCode).toBe(0);
    const createdAttemptId = JSON.parse(stdoutCreate.output).data.attempt
      .attemptId as string;

    const manifest = await readManifest(createdAttemptId, { rootDir: manifestRoot });
    await writeManifest(
      {
        ...manifest,
        sourceKind: "fork",
        parentAttemptId: "att_missing_parent"
      },
      { rootDir: manifestRoot }
    );

    const exitCode = await runCli(
      ["attempt", "list", "--manifest-root", manifestRoot, "--json"],
      {
        stdout,
        stderr
      }
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "attempt.list",
      data: {
        attempts: [
          {
            attemptId: createdAttemptId,
            sourceKind: "fork",
            parentAttemptId: "att_missing_parent"
          }
        ]
      }
    });
    const listPayload = JSON.parse(stdout.output) as {
      data: { attempts: Array<Record<string, unknown>> };
    };
    expect(sortedKeys(listPayload.data.attempts[0]!)).toEqual(
      [
        "adapter",
        "attemptId",
        "parentAttemptId",
        "runtime",
        "sourceKind",
        "status",
        "supportTier",
        "taskId"
      ].sort()
    );
    expect(stderr.output).toBe("");
  }, 10000);

  it("should clean attempts with opaque parentAttemptId provenance without requiring the parent manifest", async () => {
    const stdoutCreate = new MemoryWriter();
    const stderrCreate = new MemoryWriter();
    const stdoutCleanup = new MemoryWriter();
    const stderrCleanup = new MemoryWriter();
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const worktreeRoot = await createTempDirectory("agent-worktree-cli-worktree-");

    const createExitCode = await runCli(
      [
        "attempt",
        "create",
        "--task-id",
        "Opaque parent cleanup",
        "--repo-root",
        repoRoot,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutCreate,
        stderr: stderrCreate
      }
    );

    expect(createExitCode).toBe(0);
    const attemptId = JSON.parse(stdoutCreate.output).data.attempt.attemptId as string;
    const manifest = await readManifest(attemptId, { rootDir: manifestRoot });
    await writeManifest(
      {
        ...manifest,
        sourceKind: "delegated",
        parentAttemptId: "att_missing_parent"
      },
      { rootDir: manifestRoot }
    );

    const cleanupExitCode = await runCli(
      [
        "attempt",
        "cleanup",
        "--attempt-id",
        attemptId,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutCleanup,
        stderr: stderrCleanup
      }
    );

    expect(cleanupExitCode).toBe(0);
    expect(JSON.parse(stdoutCleanup.output)).toMatchObject({
      ok: true,
      command: "attempt.cleanup",
      data: {
        attempt: {
          attemptId,
          status: "cleaned",
          sourceKind: "delegated",
          parentAttemptId: "att_missing_parent"
        },
        cleanup: {
          outcome: "removed",
          worktreeRemoved: true
        }
      }
    });
    expect(stderrCleanup.output).toBe("");
  }, 10000);

  it("should list legacy manifests that omit lineage metadata", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const legacyAttemptDirectory = path.join(manifestRoot, "att_legacy_list");

    await mkdir(legacyAttemptDirectory, { recursive: true });
    await writeFile(
      path.join(legacyAttemptDirectory, "manifest.json"),
      JSON.stringify({
        schemaVersion: "0.x",
        attemptId: "att_legacy_list",
        taskId: "task_legacy",
        runtime: "codex-cli",
        adapter: "subprocess",
        status: "created",
        verification: {
          state: "pending",
          checks: []
        }
      }),
      "utf8"
    );

    const exitCode = await runCli(
      ["attempt", "list", "--manifest-root", manifestRoot, "--json"],
      {
        stdout,
        stderr
      }
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.output)).toMatchObject({
      ok: true,
      command: "attempt.list",
      data: {
        attempts: [
          {
            attemptId: "att_legacy_list",
            status: "created"
          }
        ]
      }
    });
    expect(stderr.output).toBe("");
  });

  it("should clean legacy manifests that omit lineage metadata", async () => {
    const stdoutCreate = new MemoryWriter();
    const stderrCreate = new MemoryWriter();
    const stdoutCleanup = new MemoryWriter();
    const stderrCleanup = new MemoryWriter();
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const worktreeRoot = await createTempDirectory("agent-worktree-cli-worktree-");

    const createExitCode = await runCli(
      [
        "attempt",
        "create",
        "--task-id",
        "Legacy cleanup",
        "--repo-root",
        repoRoot,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutCreate,
        stderr: stderrCreate
      }
    );

    expect(createExitCode).toBe(0);
    const attemptId = JSON.parse(stdoutCreate.output).data.attempt.attemptId as string;
    const manifest = await readManifest(attemptId, { rootDir: manifestRoot });
    const { sourceKind: _sourceKind, parentAttemptId: _parentAttemptId, ...legacyManifest } =
      manifest;
    await writeManifest(legacyManifest, { rootDir: manifestRoot });

    const cleanupExitCode = await runCli(
      [
        "attempt",
        "cleanup",
        "--attempt-id",
        attemptId,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutCleanup,
        stderr: stderrCleanup
      }
    );

    expect(cleanupExitCode).toBe(0);
    expect(JSON.parse(stdoutCleanup.output)).toMatchObject({
      ok: true,
      command: "attempt.cleanup",
      data: {
        attempt: {
          attemptId,
          status: "cleaned"
        },
        cleanup: {
          outcome: "removed",
          worktreeRemoved: true
        }
      }
    });
    expect(stderrCleanup.output).toBe("");
  }, 10000);

  it("should create an attempt and list it through the cli", async () => {
    const stdoutCreate = new MemoryWriter();
    const stderrCreate = new MemoryWriter();
    const stdoutList = new MemoryWriter();
    const stderrList = new MemoryWriter();
    const { repoRoot } = await createTestRepository();
    tempDirectories.push(repoRoot);
    const manifestRoot = await createTempDirectory("agent-worktree-cli-manifest-");
    const worktreeRoot = await createTempDirectory("agent-worktree-cli-worktree-");

    const createExitCode = await runCli(
      [
        "attempt",
        "create",
        "--task-id",
        "Integrate CLI",
        "--repo-root",
        repoRoot,
        "--manifest-root",
        manifestRoot,
        "--worktree-root",
        worktreeRoot,
        "--json"
      ],
      {
        stdout: stdoutCreate,
        stderr: stderrCreate
      }
    );

    expect(createExitCode).toBe(0);
    const createPayload = JSON.parse(stdoutCreate.output) as {
      data: {
        attempt: {
          attemptId: string;
          status: string;
          sourceKind: string;
          parentAttemptId?: string;
        };
      };
      ok: boolean;
    };
    expect(createPayload.ok).toBe(true);
    expect(createPayload.data.attempt.status).toBe("created");
    expect(createPayload.data.attempt.sourceKind).toBe("direct");
    expect(createPayload.data.attempt.parentAttemptId).toBeUndefined();
    expect(
      sortedKeys(createPayload.data.attempt as Record<string, unknown>)
    ).toEqual(
      [
        "adapter",
        "attemptId",
        "baseRef",
        "branch",
        "repoRoot",
        "runtime",
        "sourceKind",
        "status",
        "supportTier",
        "taskId",
        "worktreePath"
      ].sort()
    );
    assertNoInternalRuntimeMetadata(createPayload.data.attempt);

    const listExitCode = await runCli(
      ["attempt", "list", "--manifest-root", manifestRoot, "--json"],
      {
        stdout: stdoutList,
        stderr: stderrList
      }
    );

    expect(listExitCode).toBe(0);
    expect(JSON.parse(stdoutList.output)).toMatchObject({
      ok: true,
      command: "attempt.list",
      data: {
        attempts: [
          {
            attemptId: createPayload.data.attempt.attemptId,
            status: "created",
            sourceKind: "direct"
          }
        ]
      }
    });
    const listPayload = JSON.parse(stdoutList.output) as {
      data: { attempts: Array<Record<string, unknown>> };
    };
    expect(sortedKeys(listPayload.data)).toEqual(["attempts"]);
    expect(sortedKeys(listPayload.data.attempts[0]!)).toEqual(
      [
        "adapter",
        "attemptId",
        "runtime",
        "sourceKind",
        "status",
        "supportTier",
        "taskId"
      ].sort()
    );
    assertNoInternalRuntimeMetadata(listPayload.data.attempts[0]!);
  }, 10000);
});
