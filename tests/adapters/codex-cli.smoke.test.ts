import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { getAdapterDescriptor } from "../../src/adapters/catalog.js";
import { CodexCliAdapter } from "../../src/adapters/codex-cli.js";
import { smokeCodexCliCompatibility } from "../../src/adapters/codex-cli-exec.js";
import { RuntimeError } from "../../src/core/errors.js";

const runSmoke = process.env.RUN_CODEX_SMOKE === "1";
const smokeIt = runSmoke ? it : it.skip;

describe("CodexCliAdapter smoke", () => {
  smokeIt(
    "should provide a live codex diagnostic scaffold",
    async () => {
      const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"));
      const prompt = "Reply with exactly: ok";
      const diagnostics = {
        cwd: process.cwd(),
        home: process.env.HOME ?? null,
        ci: process.env.CI ?? null,
        vitestPoolId: process.env.VITEST_POOL_ID ?? null,
        path: truncate(process.env.PATH ?? ""),
        pid: process.pid,
        ppid: process.ppid,
        codexPath: safeExec(process.env.SHELL ?? "/bin/sh", [
          "-lc",
          "command -v codex"
        ]),
        codexVersion: safeExec("codex", ["--version"]),
        codexExecHelp: truncate(safeExec("codex", ["exec", "--help"]))
      };
      const detected = await adapter.detect();

      console.log(
        JSON.stringify(
          {
            smoke: {
              ...diagnostics,
              detected,
            }
          },
          null,
          2
        )
      );

      expect(detected).toBe(true);

      try {
        const result = await adapter.executeHeadless({
          cwd: process.cwd(),
          prompt,
          timeoutMs: 60_000
        });
        const publicSmoke = await smokeCodexCliCompatibility({
          env: {
            ...process.env,
            RUN_CODEX_SMOKE: "1"
          },
          cwd: process.cwd(),
          detectImpl: async () => detected,
          executeHeadlessImpl: async () => result
        });

        console.log(
          JSON.stringify(
            {
              smoke: {
                ...diagnostics,
                detected,
                publicSmoke,
                executable: result.command.executable,
                commandArgs: result.command.args,
                exitCode: result.exitCode,
                stdout: truncate(result.stdout),
                stderr: truncate(result.stderr),
                observation: result.observation,
                eventKinds: result.events.map((event) => event.kind),
                eventCount: result.events.length
              }
            },
            null,
            2
          )
        );

        expect(result.command.args.filter((arg) => arg === "--ephemeral")).toHaveLength(
          1
        );
        expect(result.command.args).toContain("--ephemeral");
        expect(result.command.args.at(-1)).toBe(prompt);
        expect(result.command.executable).toMatch(
          /(^codex$|[\\/]codex(?:\.(?:exe|cmd|bat|com))?$)/iu
        );
        expect(publicSmoke).toMatchObject({
          smokeStatus: "passed",
          diagnosisCode: "smoke_passed"
        });
        expect(result.observation).toMatchObject({
          runCompleted: expect.any(Boolean),
          errorEventCount: expect.any(Number)
        });
        expect(
          result.stdout.trim().length > 0 ||
            result.stderr.trim().length > 0 ||
            result.events.length > 0
        ).toBe(true);
      } catch (error) {
        const publicSmoke = await smokeCodexCliCompatibility({
          env: {
            ...process.env,
            RUN_CODEX_SMOKE: "1"
          },
          cwd: process.cwd(),
          detectImpl: async () => detected,
          executeHeadlessImpl: async () => {
            throw error;
          }
        });

        console.log(
          JSON.stringify(
            {
              smoke: {
                ...diagnostics,
                detected,
                publicSmoke,
                failure:
                  error instanceof RuntimeError
                    ? {
                        message: error.message,
                        causeValue: error.causeValue
                      }
                    : {
                        message: error instanceof Error ? error.message : String(error)
                      }
              }
            },
            null,
            2
          )
        );
        expect(publicSmoke.smokeStatus).toBe("failed");
        throw error;
      }
    },
    70_000
  );
});

function safeExec(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    return `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function truncate(value: string, length = 1_000): string {
  return value.length <= length ? value : `${value.slice(0, length)}…`;
}
