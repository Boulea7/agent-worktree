import { describe, expect, it, vi } from "vitest";

import { NotImplementedError } from "../../src/core/errors.js";
import {
  buildCompatibilityDoctorData,
  type CompatibilityDoctorData
} from "../../src/compat/doctor.js";

describe("buildCompatibilityDoctorData", () => {
  it("should report implemented and descriptor-only runtimes in input order", async () => {
    const detect = vi.fn(async () => true);

    await expect(
      buildCompatibilityDoctorData({
        listAdapterDescriptorsImpl: () => [
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
              eventStreamParsing: "unsupported"
            }
          }
        ],
        getRuntimeAdapterImpl: (runtime) => {
          if (runtime === "codex-cli") {
            return {
              descriptor: {
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
              },
              detect,
              renderCommand: vi.fn(),
              degradeUnsupportedCapability: vi.fn(),
              supportsCapability: vi.fn()
            };
          }

          throw new NotImplementedError(
            `Runtime adapter for ${runtime} is not implemented in the current phase.`
          );
        }
      })
    ).resolves.toEqual({
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
          detected: true
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
            eventStreamParsing: "unsupported"
          },
          adapterStatus: "descriptor_only",
          detected: null
        }
      ]
    } satisfies CompatibilityDoctorData);

    expect(detect).toHaveBeenCalledTimes(1);
  });

  it("should report detection failures as false for implemented runtimes", async () => {
    const detect = vi.fn(async () => {
      throw new Error("probe failed");
    });

    await expect(
      buildCompatibilityDoctorData({
        listAdapterDescriptorsImpl: () => [
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
            }
          }
        ],
        getRuntimeAdapterImpl: () => ({
          descriptor: {
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
          },
          detect,
          renderCommand: vi.fn(),
          degradeUnsupportedCapability: vi.fn(),
          supportsCapability: vi.fn()
        })
      })
    ).resolves.toMatchObject({
      runtimes: [
        {
          runtime: "codex-cli",
          adapterStatus: "implemented",
          detected: false
        }
      ]
    });
  });
});
