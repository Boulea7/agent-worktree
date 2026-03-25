import { describe, expect, it, vi } from "vitest";

import { RuntimeError, ValidationError } from "../../src/core/errors.js";
import {
  executeAttemptVerification
} from "../../src/verification/internal.js";
import type { AttemptManifest } from "../../src/manifest/types.js";
import { deriveAttemptSelectionResult } from "../../src/selection/internal.js";
import type {
  AttemptVerificationCommandCheck,
  AttemptVerificationExecutionInput
} from "../../src/verification/internal.js";
import type { SubprocessRunner } from "../../src/adapters/headless.js";

describe("verification execution helpers", () => {
  it("should mark zero-exit checks as passed and derive a ready summary", async () => {
    const runner = vi.fn<SubprocessRunner>(async () => ({
      exitCode: 0,
      stdout: "ok",
      stderr: ""
    }));

    const result = await executeAttemptVerification({
      checks: [
        {
          name: "lint",
          executable: "npm",
          args: ["run", "lint"],
          required: true
        }
      ],
      runner
    });

    expect(result.verification).toEqual({
      state: "passed",
      checks: [
        {
          name: "lint",
          status: "passed",
          required: true
        }
      ]
    });
    expect(result.checks).toEqual([
      {
        name: "lint",
        required: true,
        status: "passed",
        exitCode: 0
      }
    ]);
    expect(result.summary.isSelectionReady).toBe(true);
    expect(result.summary.requiredOutcome).toBe("satisfied");
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it("should mark non-zero exits as failed and keep optional failures from breaking required outcome", async () => {
    const runner = vi
      .fn<SubprocessRunner>()
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: "",
        stderr: ""
      })
      .mockResolvedValueOnce({
        exitCode: 2,
        stdout: "",
        stderr: "failed"
      });

    const result = await executeAttemptVerification({
      checks: [
        {
          name: "unit",
          executable: "npm",
          args: ["test"],
          required: true
        },
        {
          name: "docs",
          executable: "npm",
          args: ["run", "docs:check"]
        }
      ],
      runner
    });

    expect(result.verification).toEqual({
      state: "failed",
      checks: [
        {
          name: "unit",
          status: "passed",
          required: true
        },
        {
          name: "docs",
          status: "failed",
          required: false
        }
      ]
    });
    expect(result.summary.overallOutcome).toBe("failed");
    expect(result.summary.requiredOutcome).toBe("satisfied");
    expect(result.summary.isSelectionReady).toBe(false);
  });

  it("should map subprocess runtime failures to error checks and continue later checks", async () => {
    const runner = vi
      .fn<SubprocessRunner>()
      .mockRejectedValueOnce(
        new RuntimeError("Command npm timed out after 5000ms.", {
          kind: "timeout",
          diagnostics: {
            executable: "npm",
            args: ["run", "lint"],
            stderr: "",
            stdout: "",
            timeoutMs: 5000
          }
        })
      )
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: "",
        stderr: ""
      });

    const result = await executeAttemptVerification({
      checks: [
        {
          name: "lint",
          executable: "npm",
          args: ["run", "lint"],
          required: true
        },
        {
          name: "unit",
          executable: "npm",
          args: ["test"]
        }
      ],
      runner
    });

    expect(result.verification).toEqual({
      state: "failed",
      checks: [
        {
          name: "lint",
          status: "error",
          required: true
        },
        {
          name: "unit",
          status: "passed",
          required: false
        }
      ]
    });
    expect(result.checks).toEqual([
      {
        name: "lint",
        required: true,
        status: "error",
        failureKind: "timeout"
      },
      {
        name: "unit",
        required: false,
        status: "passed",
        exitCode: 0
      }
    ]);
    expect(result.summary.requiredOutcome).toBe("failed");
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it("should preserve known subprocess failure kinds on error checks", async () => {
    for (const kind of [
      "timeout",
      "spawn_error",
      "signal_terminated",
      "stdio_unavailable"
    ] as const) {
      const runner = vi.fn<SubprocessRunner>().mockRejectedValueOnce(
        new RuntimeError(`runner failed: ${kind}`, {
          kind,
          diagnostics: {
            executable: "npm",
            args: ["run", "lint"],
            stderr: "",
            stdout: "",
            timeoutMs: 5000
          }
        })
      );

      const result = await executeAttemptVerification({
        checks: [
          {
            name: `lint_${kind}`,
            executable: "npm",
            args: ["run", "lint"],
            required: true
          }
        ],
        runner
      });

      expect(result.checks).toEqual([
        {
          name: `lint_${kind}`,
          required: true,
          status: "error",
          failureKind: kind
        }
      ]);
      expect(result.summary.requiredOutcome).toBe("failed");
    }
  });

  it("should rethrow unexpected runner errors instead of downgrading them to verification status", async () => {
    const runner = vi.fn<SubprocessRunner>(async () => {
      throw new Error("boom");
    });

    await expect(
      executeAttemptVerification({
        checks: [
          {
            name: "lint",
            executable: "npm",
            args: ["run", "lint"]
          }
        ],
        runner
      })
    ).rejects.toThrow("boom");
  });

  it("should fail loudly when the runner returns undefined instead of a subprocess result", async () => {
    const runner = vi.fn<SubprocessRunner>(async () => {
      return undefined as unknown as Awaited<ReturnType<SubprocessRunner>>;
    });

    await expect(
      executeAttemptVerification({
        checks: [
          {
            name: "lint",
            executable: "npm",
            args: ["run", "lint"]
          }
        ],
        runner
      })
    ).rejects.toThrow(ValidationError);
  });

  it("should fail loudly when the runner returns a malformed subprocess result", async () => {
    const malformedResults = [
      "invalid",
      {
        stdout: "",
        stderr: ""
      },
      {
        exitCode: "0",
        stdout: "",
        stderr: ""
      },
      {
        exitCode: 0,
        stdout: 1,
        stderr: ""
      },
      {
        exitCode: 0,
        stdout: "",
        stderr: null
      }
    ] as unknown[];

    for (const malformedResult of malformedResults) {
      const runner = vi.fn<SubprocessRunner>(async () => {
        return malformedResult as Awaited<ReturnType<SubprocessRunner>>;
      });

      await expect(
        executeAttemptVerification({
          checks: [
            {
              name: "lint",
              executable: "npm",
              args: ["run", "lint"]
            }
          ],
          runner
        })
      ).rejects.toThrow(ValidationError);
    }
  });

  it("should validate check definitions before invoking the runner", async () => {
    const runner = vi.fn<SubprocessRunner>(async () => ({
      exitCode: 0,
      stdout: "",
      stderr: ""
    }));

    await expect(
      executeAttemptVerification({
        checks: [
          {
            name: "lint",
            executable: "   "
          }
        ] as unknown as AttemptVerificationCommandCheck[],
        runner
      })
    ).rejects.toThrow(ValidationError);
    expect(runner).not.toHaveBeenCalled();
  });

  it("should reject malformed args, cwd, env, and timeout definitions before execution", async () => {
    const runner = vi.fn<SubprocessRunner>(async () => ({
      exitCode: 0,
      stdout: "",
      stderr: ""
    }));

    for (const checks of [
      [
        {
          name: "lint",
          executable: "npm",
          args: ["run", 1]
        }
      ],
      [
        {
          name: "lint",
          executable: "npm",
          cwd: "   "
        }
      ],
      [
        {
          name: "lint",
          executable: "npm",
          env: {
            CI: 1
          }
        }
      ],
      [
        {
          name: "lint",
          executable: "npm",
          timeoutMs: 0
        }
      ]
    ]) {
      await expect(
        executeAttemptVerification({
          checks: checks as unknown as AttemptVerificationCommandCheck[],
          runner
        })
      ).rejects.toThrow(ValidationError);
    }

    expect(runner).not.toHaveBeenCalled();
  });

  it("should preserve per-check execution options when invoking the runner", async () => {
    const runner = vi.fn<SubprocessRunner>(async () => ({
      exitCode: 0,
      stdout: "",
      stderr: ""
    }));
    const env = Object.freeze({
      CI: "1"
    });

    await executeAttemptVerification({
      checks: [
        {
          name: "lint",
          executable: "npm",
          args: ["run", "lint"],
          cwd: "/tmp/demo",
          env,
          timeoutMs: 1200
        }
      ],
      runner
    });

    expect(runner).toHaveBeenCalledWith("npm", ["run", "lint"], {
      cwd: "/tmp/demo",
      env,
      timeoutMs: 1200
    });
  });

  it("should return a stable pending payload for an empty check list", async () => {
    const runner = vi.fn<SubprocessRunner>(async () => ({
      exitCode: 0,
      stdout: "",
      stderr: ""
    }));

    const result = await executeAttemptVerification({
      checks: [],
      runner
    });

    expect(result.verification).toEqual({
      state: "pending",
      checks: []
    });
    expect(result.summary.overallOutcome).toBe("pending");
    expect(result.summary.requiredOutcome).toBe("pending");
    expect(result.summary.hasComparablePayload).toBe(true);
    expect(runner).not.toHaveBeenCalled();
  });

  it("should keep the verification payload free of execution internals", async () => {
    const runner = vi.fn<SubprocessRunner>(async () => ({
      exitCode: 0,
      stdout: "ok",
      stderr: ""
    }));

    const result = await executeAttemptVerification({
      checks: [
        {
          name: "lint",
          executable: "npm"
        }
      ],
      runner
    });

    expect(result.verification).not.toHaveProperty("stdout");
    expect(result.verification).not.toHaveProperty("stderr");
    expect(result.verification).not.toHaveProperty("events");
    expect(result.verification).not.toHaveProperty("controlPlane");
  });

  it("should produce payloads that remain directly consumable by selection helpers", async () => {
    const runner = vi
      .fn<SubprocessRunner>()
      .mockResolvedValueOnce({
        exitCode: 2,
        stdout: "",
        stderr: "failed"
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: "",
        stderr: ""
      });

    const failedResult = await executeAttemptVerification({
      checks: [
        {
          name: "lint",
          executable: "npm",
          required: true
        }
      ],
      runner: vi.fn<SubprocessRunner>(async () => ({
        exitCode: 2,
        stdout: "",
        stderr: "failed"
      }))
    });
    const passedResult = await executeAttemptVerification({
      checks: [
        {
          name: "lint",
          executable: "npm",
          required: true
        }
      ],
      runner: vi.fn<SubprocessRunner>(async () => ({
        exitCode: 0,
        stdout: "",
        stderr: ""
      }))
    });

    const result = deriveAttemptSelectionResult([
      createManifest("att_failed", failedResult.verification),
      createManifest("att_passed", passedResult.verification)
    ]);

    expect(result.selected?.attemptId).toBe("att_passed");
    expect(result.recommendedForPromotion).toBe(true);
  });

  it("should not mutate the supplied execution input", async () => {
    const input = {
      checks: [
        Object.freeze({
          name: "lint",
          executable: "npm",
          args: Object.freeze(["run", "lint"]),
          required: true
        })
      ]
    } satisfies AttemptVerificationExecutionInput;
    const snapshot = structuredClone(input);

    await executeAttemptVerification({
      ...input,
      runner: async () => ({
        exitCode: 0,
        stdout: "",
        stderr: ""
      })
    });

    expect(input).toEqual(snapshot);
  });
});

function createManifest(
  attemptId: string,
  verification: AttemptManifest["verification"]
): AttemptManifest {
  return {
    adapter: "subprocess",
    attemptId,
    runtime: "codex-cli",
    schemaVersion: "0.x",
    status: "created",
    taskId: "task_verification",
    verification
  };
}
