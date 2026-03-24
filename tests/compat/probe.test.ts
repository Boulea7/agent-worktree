import { describe, expect, it, vi } from "vitest";

import { NotFoundError, NotImplementedError } from "../../src/core/errors.js";
import {
  buildCompatibilityProbeData,
  compatibilityProbeDiagnosisCodes,
  compatibilityProbeStatuses,
  type CompatibilityProbeData
} from "../../src/compat/probe.js";

describe("buildCompatibilityProbeData", () => {
  it("should lock the public probe vocabularies", () => {
    expect(compatibilityProbeStatuses).toEqual([
      "supported",
      "unsupported",
      "not_probed",
      "error"
    ]);
    expect(compatibilityProbeDiagnosisCodes).toEqual([
      "exec_json_supported",
      "exec_json_unavailable",
      "descriptor_only",
      "probe_error"
    ]);
  });

  it("should report codex-cli probe success for the implemented runtime", async () => {
    await expect(
      buildCompatibilityProbeData("codex-cli", {
        getAdapterDescriptorImpl: () => createCodexDescriptor(),
        getRuntimeAdapterImpl: () => createFakeAdapter(),
        probeCodexCliCompatibilityImpl: async () => ({
          supported: true,
          diagnosisCode: "exec_json_supported",
          summary: "A local codex executable with `exec --json` support was confirmed."
        })
      })
    ).resolves.toEqual({
      probe: {
        ...createCodexDescriptor(),
        adapterStatus: "implemented",
        probeStatus: "supported",
        diagnosis: {
          code: "exec_json_supported",
          summary: "A local codex executable with `exec --json` support was confirmed."
        }
      }
    } satisfies CompatibilityProbeData);
  });

  it("should report codex-cli probe failure without leaking execution internals", async () => {
    await expect(
      buildCompatibilityProbeData("codex-cli", {
        getAdapterDescriptorImpl: () => createCodexDescriptor(),
        getRuntimeAdapterImpl: () => createFakeAdapter(),
        probeCodexCliCompatibilityImpl: async () => ({
          supported: false,
          diagnosisCode: "exec_json_unavailable",
          summary: "No local codex executable with `exec --json` support was confirmed."
        })
      })
    ).resolves.toEqual({
      probe: {
        ...createCodexDescriptor(),
        adapterStatus: "implemented",
        probeStatus: "unsupported",
        diagnosis: {
          code: "exec_json_unavailable",
          summary: "No local codex executable with `exec --json` support was confirmed."
        }
      }
    } satisfies CompatibilityProbeData);
  });

  it("should report probe errors as a bounded public error state", async () => {
    await expect(
      buildCompatibilityProbeData("codex-cli", {
        getAdapterDescriptorImpl: () => createCodexDescriptor(),
        getRuntimeAdapterImpl: () => createFakeAdapter(),
        probeCodexCliCompatibilityImpl: async () => {
          throw new Error("runner exploded");
        }
      })
    ).resolves.toEqual({
      probe: {
        ...createCodexDescriptor(),
        adapterStatus: "implemented",
        probeStatus: "error",
        diagnosis: {
          code: "probe_error",
          summary: "The local codex-cli compatibility probe did not complete successfully."
        }
      }
    } satisfies CompatibilityProbeData);
  });

  it("should keep descriptor-only runtimes unprobed", async () => {
    await expect(
      buildCompatibilityProbeData("claude-code", {
        getAdapterDescriptorImpl: () => ({
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
          }
        }),
        getRuntimeAdapterImpl: (runtime) => {
          throw new NotImplementedError(
            `Runtime adapter for ${runtime} is not implemented in the current phase.`
          );
        }
      })
    ).resolves.toEqual({
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
    } satisfies CompatibilityProbeData);
  });

  it("should fail loudly for unknown compatibility targets", async () => {
    await expect(
      buildCompatibilityProbeData("missing-tool", {
        getAdapterDescriptorImpl: () => {
          throw new NotFoundError("Unknown compatibility target: missing-tool.");
        }
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Unknown compatibility target: missing-tool."
    });
  });
});

function createCodexDescriptor() {
  return {
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
  };
}

function createFakeAdapter() {
  return {
    descriptor: createCodexDescriptor(),
    detect: vi.fn(async () => true),
    renderCommand: vi.fn(),
    degradeUnsupportedCapability: vi.fn(),
    supportsCapability: vi.fn()
  };
}
