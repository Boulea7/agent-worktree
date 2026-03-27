import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  CompatibilityDoctorData,
  CompatibilityProbeData,
  CompatibilitySmokeData
} from "../../src/compat/index.js";
import {
  serializeAttemptCleanupResult,
  serializeAttemptCreateData,
  serializeAttemptListData,
  serializeCompatibilityListData,
  serializeCompatibilityShowData,
  serializeCompatibilityDoctorData,
  serializeCompatibilityProbeData,
  serializeCompatibilitySmokeData
} from "../../src/cli/public-serialize.js";
import type { AttemptManifest } from "../../src/manifest/types.js";
import type { CleanupAttemptResult } from "../../src/worktree/cleanup.js";

describe("public cli serializers", () => {
  it("should serialize compatibility list data through an explicit allow-list", () => {
    const result = serializeCompatibilityListData({
      tools: [
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
      ]
    } as never);

    expect(result).toEqual({
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
    });
  });

  it("should serialize compatibility show data through an explicit allow-list", () => {
    const result = serializeCompatibilityShowData({
      tool: {
        tool: "gemini-cli",
        tier: "tier1",
        guidanceFile: "GEMINI.md",
        projectConfig: ".gemini/settings.json",
        machineReadableMode: "strong",
        resume: "unsupported",
        mcp: "unsupported",
        note: "Catalog entry.",
        hiddenField: "internal"
      }
    } as never);

    expect(result).toEqual({
      tool: {
        tool: "gemini-cli",
        tier: "tier1",
        guidanceFile: "GEMINI.md",
        projectConfig: ".gemini/settings.json",
        machineReadableMode: "strong",
        resume: "unsupported",
        mcp: "unsupported",
        note: "Catalog entry."
      }
    });
  });

  it("should fail loudly when compatibility catalog data uses values outside the public vocabulary", () => {
    expect(() =>
      serializeCompatibilityShowData({
        tool: {
          tool: "codex-cli",
          tier: "tier1",
          guidanceFile: "AGENTS.md",
          projectConfig: ".codex/config.toml",
          machineReadableMode: "future-mode",
          resume: "strong",
          mcp: "strong",
          note: "Catalog entry."
        }
      } as never)
    ).toThrow(ValidationError);
  });

  it("should serialize doctor data through an explicit allow-list", () => {
    const result = serializeCompatibilityDoctorData({
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
        }
      ]
    } as unknown as CompatibilityDoctorData);

    expect(result).toEqual({
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
        }
      ]
    });
  });

  it("should fail loudly when doctor data uses detected values outside the public boolean contract", () => {
    expect(() =>
      serializeCompatibilityDoctorData({
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
            detected: "invalid"
          }
        ]
      } as unknown as CompatibilityDoctorData)
    ).toThrow(ValidationError);
  });

  it.each([
    { detected: false },
    { detected: null }
  ])(
    "should serialize doctor data for detected=$detected through the same explicit allow-list",
    ({ detected }) => {
      const result = serializeCompatibilityDoctorData({
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
            detected,
            runtimeState: {
              status: "hidden"
            }
          }
        ]
      } as unknown as CompatibilityDoctorData);

      expect(result).toEqual({
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
            detected
          }
        ]
      });
    }
  );

  it("should serialize compatibility probe data through an explicit allow-list", () => {
    const result = serializeCompatibilityProbeData({
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
          summary: "Compatible.",
          resolvedExecutable: "/Users/example/.bun/bin/codex"
        },
        profile: "hidden"
      }
    } as unknown as CompatibilityProbeData);

    expect(result).toEqual({
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
        probeStatus: "supported",
        diagnosis: {
          code: "exec_json_supported",
          summary: "Compatible."
        }
      }
    });
  });

  it("should fail loudly when a probe payload uses values outside the public vocabulary", () => {
    expect(() =>
      serializeCompatibilityProbeData({
        probe: {
          runtime: "codex-cli",
          supportTier: "tier1",
          guidanceFile: "AGENTS.md",
          projectConfig: ".codex/config.toml",
          note: "Concrete runtime.",
          capabilities: {
            machineReadableMode: "future-mode",
            resume: "unsupported",
            mcp: "unsupported",
            sessionLifecycle: "unsupported",
            eventStreamParsing: "partial"
          },
          adapterStatus: "implemented",
          probeStatus: "supported",
          diagnosis: {
            code: "exec_json_supported",
            summary: "Compatible."
          }
        }
      } as unknown as CompatibilityProbeData)
    ).toThrow(ValidationError);
  });

  it.each([
    {
      probeStatus: "not_probed",
      diagnosisCode: "descriptor_only",
      summary: "Descriptor-only runtime."
    },
    {
      probeStatus: "unsupported",
      diagnosisCode: "exec_json_unavailable",
      summary: "exec --json is unavailable."
    },
    {
      probeStatus: "error",
      diagnosisCode: "probe_error",
      summary: "Probe failed."
    }
  ])(
    "should serialize compatibility probe status $probeStatus through the same explicit allow-list",
    ({ probeStatus, diagnosisCode, summary }) => {
      const result = serializeCompatibilityProbeData({
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
          probeStatus,
          diagnosis: {
            code: diagnosisCode,
            summary,
            resolvedExecutable: "/Users/example/.bun/bin/codex"
          },
          runtimeState: {
            sessionId: "thr_hidden"
          }
        }
      } as unknown as CompatibilityProbeData);

      expect(result).toEqual({
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
          probeStatus,
          diagnosis: {
            code: diagnosisCode,
            summary
          }
        }
      });
    }
  );

  it("should serialize compatibility smoke data through an explicit allow-list", () => {
    const result = serializeCompatibilitySmokeData({
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
          summary: "Passed.",
          runtimeState: {
            sessionId: "thr_hidden"
          }
        },
        env: {
          OPENAI_API_KEY: "secret"
        }
      }
    } as unknown as CompatibilitySmokeData);

    expect(result).toEqual({
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
        smokeStatus: "passed",
        diagnosis: {
          code: "smoke_passed",
          summary: "Passed."
        }
      }
    });
  });

  it.each([
    {
      smokeStatus: "skipped",
      diagnosisCode: "gate_disabled",
      summary: "Smoke skipped."
    },
    {
      smokeStatus: "not_supported",
      diagnosisCode: "descriptor_only",
      summary: "Descriptor-only runtime."
    },
    {
      smokeStatus: "error",
      diagnosisCode: "unexpected_error",
      summary: "Smoke failed unexpectedly."
    }
  ])(
    "should serialize compatibility smoke status $smokeStatus through the same explicit allow-list",
    ({ smokeStatus, diagnosisCode, summary }) => {
      const result = serializeCompatibilitySmokeData({
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
          smokeStatus,
          diagnosis: {
            code: diagnosisCode,
            summary,
            runtimeState: {
              sessionId: "thr_hidden"
            }
          },
          env: {
            OPENAI_API_KEY: "secret"
          }
        }
      } as unknown as CompatibilitySmokeData);

      expect(result).toEqual({
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
          smokeStatus,
          diagnosis: {
            code: diagnosisCode,
            summary
          }
        }
      });
    }
  );

  it("should fail loudly when a smoke payload uses values outside the public vocabulary", () => {
    expect(() =>
      serializeCompatibilitySmokeData({
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
          smokeStatus: "future-status",
          diagnosis: {
            code: "unexpected_error",
            summary: "Smoke failed."
          }
        }
      } as unknown as CompatibilitySmokeData)
    ).toThrow(ValidationError);
  });

  it("should serialize attempt create data through an explicit allow-list", () => {
    const result = serializeAttemptCreateData({
      attempt: createManifest({
        sourceKind: "direct"
      })
    });

    expect(result).toEqual({
      attempt: {
        attemptId: "att_demo",
        taskId: "task_demo",
        runtime: "codex-cli",
        adapter: "subprocess",
        supportTier: "tier1",
        status: "created",
        sourceKind: "direct",
        baseRef: "HEAD",
        branch: "attempt/task-demo/att_demo",
        repoRoot: "/repo",
        worktreePath: "/worktrees/att_demo"
      }
    });
  });

  it("should serialize attempt list data through an explicit allow-list", () => {
    const result = serializeAttemptListData({
      attempts: [
        createManifest({
          sourceKind: "fork",
          parentAttemptId: "att_parent"
        })
      ]
    });

    expect(result).toEqual({
      attempts: [
        {
          attemptId: "att_demo",
          taskId: "task_demo",
          runtime: "codex-cli",
          adapter: "subprocess",
          supportTier: "tier1",
          status: "created",
          sourceKind: "fork",
          parentAttemptId: "att_parent"
        }
      ]
    });
  });

  it("should serialize attempt cleanup results through an explicit allow-list", () => {
    const result = serializeAttemptCleanupResult({
      attempt: createManifest({
        status: "cleaned",
        sourceKind: "delegated",
        parentAttemptId: "att_parent"
      }),
      cleanup: {
        outcome: "removed",
        worktreeRemoved: true
      }
    } as CleanupAttemptResult);

    expect(result).toEqual({
      attempt: {
        attemptId: "att_demo",
        taskId: "task_demo",
        runtime: "codex-cli",
        adapter: "subprocess",
        supportTier: "tier1",
        status: "cleaned",
        sourceKind: "delegated",
        parentAttemptId: "att_parent",
        branch: "attempt/task-demo/att_demo",
        repoRoot: "/repo",
        worktreePath: "/worktrees/att_demo"
      },
      cleanup: {
        outcome: "removed",
        worktreeRemoved: true
      }
    });
  });

  it("should fail loudly when cleanup worktreeRemoved uses values outside the public boolean contract", () => {
    expect(() =>
      serializeAttemptCleanupResult({
        attempt: createManifest({
          status: "cleaned"
        }),
        cleanup: {
          outcome: "removed",
          worktreeRemoved: "invalid"
        }
      } as unknown as CleanupAttemptResult)
    ).toThrow(ValidationError);
  });

  it("should fail loudly when cleanup outcome uses values outside the public vocabulary", () => {
    expect(() =>
      serializeAttemptCleanupResult({
        attempt: createManifest({
          status: "cleaned"
        }),
        cleanup: {
          outcome: "future_cleanup_mode" as CleanupAttemptResult["cleanup"]["outcome"],
          worktreeRemoved: false
        }
      } as CleanupAttemptResult)
    ).toThrow(ValidationError);
  });

  it("should fail loudly when attempt data uses values outside the public vocabulary", () => {
    expect(() =>
      serializeAttemptListData({
        attempts: [
          createManifest({
            status: "queued" as unknown as AttemptManifest["status"]
          })
        ]
      })
    ).toThrow(ValidationError);
  });
});

function createManifest(
  overrides: Partial<AttemptManifest> = {}
): AttemptManifest {
  return {
    schemaVersion: "0.x",
    attemptId: "att_demo",
    taskId: "task_demo",
    runtime: "codex-cli",
    adapter: "subprocess",
    status: "created",
    sourceKind: "direct",
    repoRoot: "/repo",
    supportTier: "tier1",
    baseRef: "HEAD",
    branch: "attempt/task-demo/att_demo",
    worktreePath: "/worktrees/att_demo",
    verification: {
      state: "pending",
      checks: []
    },
    timestamps: {
      createdAt: "2026-03-26T00:00:00.000Z",
      updatedAt: "2026-03-26T00:00:00.000Z",
      internalClock: "hidden"
    },
    artifacts: [
      {
        path: "hidden.log"
      }
    ],
    session: {
      backend: "codex-cli",
      sessionId: "thr_hidden",
      profile: "hidden"
    },
    futureMetadata: {
      hidden: true
    },
    ...overrides
  };
}
