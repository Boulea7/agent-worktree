import { describe, expect, it, vi } from "vitest";

import { NotFoundError, NotImplementedError } from "../../src/core/errors.js";
import {
  buildCompatibilitySmokeData,
  compatibilitySmokeDiagnosisCodes,
  compatibilitySmokeStatuses,
  type CompatibilitySmokeData
} from "../../src/compat/smoke.js";

describe("buildCompatibilitySmokeData", () => {
  it("should lock the public smoke vocabularies", () => {
    expect(compatibilitySmokeStatuses).toEqual([
      "passed",
      "failed",
      "skipped",
      "not_supported",
      "error"
    ]);
    expect(compatibilitySmokeDiagnosisCodes).toEqual([
      "smoke_passed",
      "gate_disabled",
      "descriptor_only",
      "detect_unavailable",
      "execution_failed",
      "unexpected_error"
    ]);
  });

  it("should report codex-cli smoke success for the implemented runtime", async () => {
    await expect(
      buildCompatibilitySmokeData("codex-cli", {
        getAdapterDescriptorImpl: () => createCodexDescriptor(),
        getRuntimeAdapterImpl: () => createFakeAdapter(),
        smokeCodexCliCompatibilityImpl: async () => ({
          smokeStatus: "passed",
          diagnosisCode: "smoke_passed",
          summary:
            "The bounded codex-cli smoke path completed the public compatibility checks."
        })
      })
    ).resolves.toEqual({
      smoke: {
        ...createCodexDescriptor(),
        adapterStatus: "implemented",
        smokeStatus: "passed",
        diagnosis: {
          code: "smoke_passed",
          summary:
            "The bounded codex-cli smoke path completed the public compatibility checks."
        }
      }
    } satisfies CompatibilitySmokeData);
  });

  it("should report codex-cli smoke failures as a bounded public failure state", async () => {
    await expect(
      buildCompatibilitySmokeData("codex-cli", {
        getAdapterDescriptorImpl: () => createCodexDescriptor(),
        getRuntimeAdapterImpl: () => createFakeAdapter(),
        smokeCodexCliCompatibilityImpl: async () => ({
          smokeStatus: "failed",
          diagnosisCode: "execution_failed",
          summary:
            "The bounded codex-cli smoke path did not satisfy the public compatibility checks."
        })
      })
    ).resolves.toEqual({
      smoke: {
        ...createCodexDescriptor(),
        adapterStatus: "implemented",
        smokeStatus: "failed",
        diagnosis: {
          code: "execution_failed",
          summary:
            "The bounded codex-cli smoke path did not satisfy the public compatibility checks."
        }
      }
    } satisfies CompatibilitySmokeData);
  });

  it("should report detect-unavailable smoke failures as a bounded public failure state", async () => {
    await expect(
      buildCompatibilitySmokeData("codex-cli", {
        getAdapterDescriptorImpl: () => createCodexDescriptor(),
        getRuntimeAdapterImpl: () => createFakeAdapter(),
        smokeCodexCliCompatibilityImpl: async () => ({
          smokeStatus: "failed",
          diagnosisCode: "detect_unavailable",
          summary:
            "The local codex executable could not be detected for the bounded compatibility smoke path."
        })
      })
    ).resolves.toEqual({
      smoke: {
        ...createCodexDescriptor(),
        adapterStatus: "implemented",
        smokeStatus: "failed",
        diagnosis: {
          code: "detect_unavailable",
          summary:
            "The local codex executable could not be detected for the bounded compatibility smoke path."
        }
      }
    } satisfies CompatibilitySmokeData);
  });

  it("should report gate-disabled smoke runs as skipped", async () => {
    await expect(
      buildCompatibilitySmokeData("codex-cli", {
        getAdapterDescriptorImpl: () => createCodexDescriptor(),
        getRuntimeAdapterImpl: () => createFakeAdapter(),
        smokeCodexCliCompatibilityImpl: async () => ({
          smokeStatus: "skipped",
          diagnosisCode: "gate_disabled",
          summary:
            "Compatibility smoke is skipped unless `RUN_CODEX_SMOKE=1` is set."
        })
      })
    ).resolves.toEqual({
      smoke: {
        ...createCodexDescriptor(),
        adapterStatus: "implemented",
        smokeStatus: "skipped",
        diagnosis: {
          code: "gate_disabled",
          summary:
            "Compatibility smoke is skipped unless `RUN_CODEX_SMOKE=1` is set."
        }
      }
    } satisfies CompatibilitySmokeData);
  });

  it("should report unexpected smoke errors as a bounded public error state", async () => {
    await expect(
      buildCompatibilitySmokeData("codex-cli", {
        getAdapterDescriptorImpl: () => createCodexDescriptor(),
        getRuntimeAdapterImpl: () => createFakeAdapter(),
        smokeCodexCliCompatibilityImpl: async () => ({
          smokeStatus: "error",
          diagnosisCode: "unexpected_error",
          summary:
            "The bounded codex-cli smoke path did not complete successfully."
        })
      })
    ).resolves.toEqual({
      smoke: {
        ...createCodexDescriptor(),
        adapterStatus: "implemented",
        smokeStatus: "error",
        diagnosis: {
          code: "unexpected_error",
          summary:
            "The bounded codex-cli smoke path did not complete successfully."
        }
      }
    } satisfies CompatibilitySmokeData);
  });

  it("should map thrown smoke failures into the bounded public error state", async () => {
    await expect(
      buildCompatibilitySmokeData("codex-cli", {
        getAdapterDescriptorImpl: () => createCodexDescriptor(),
        getRuntimeAdapterImpl: () => createFakeAdapter(),
        smokeCodexCliCompatibilityImpl: async () => {
          throw new Error("runner exploded");
        }
      })
    ).resolves.toEqual({
      smoke: {
        ...createCodexDescriptor(),
        adapterStatus: "implemented",
        smokeStatus: "error",
        diagnosis: {
          code: "unexpected_error",
          summary:
            "The bounded codex-cli smoke path did not complete successfully."
        }
      }
    } satisfies CompatibilitySmokeData);
  });

  it("should keep descriptor-only runtimes outside public smoke support", async () => {
    await expect(
      buildCompatibilitySmokeData("claude-code", {
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
    } satisfies CompatibilitySmokeData);
  });

  it("should fail loudly for unknown compatibility smoke targets", async () => {
    await expect(
      buildCompatibilitySmokeData("missing-tool", {
        getAdapterDescriptorImpl: () => {
          throw new NotFoundError("Unknown adapter target: missing-tool.");
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
