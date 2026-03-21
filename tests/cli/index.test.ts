import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../../src/cli/index.js";
import { createTestRepository } from "../worktree/helpers.js";

class MemoryWriter {
  public output = "";

  public write(chunk: string): void {
    this.output += chunk;
  }
}

function assertNoInternalRuntimeMetadata(value: Record<string, unknown>): void {
  expect(value).not.toHaveProperty("controlPlane");
  expect(value).not.toHaveProperty("runtimeState");
  expect(value).not.toHaveProperty("closeCandidate");
  expect(value).not.toHaveProperty("closeReadiness");
  expect(value).not.toHaveProperty("closeTarget");
  expect(value).not.toHaveProperty("closePreflight");
  expect(value).not.toHaveProperty("lifecycleDisposition");
  expect(value).not.toHaveProperty("spawnCandidate");
  expect(value).not.toHaveProperty("spawnTarget");
  expect(value).not.toHaveProperty("spawnCandidate");
  expect(value).not.toHaveProperty("spawnTarget");
  expect(value).not.toHaveProperty("waitCandidate");
  expect(value).not.toHaveProperty("waitTarget");
  expect(value).not.toHaveProperty("runtimeContext");
  expect(value).not.toHaveProperty("waitReadiness");
  expect(value).not.toHaveProperty("spawnReadiness");
  expect(value).not.toHaveProperty("spawnCandidate");
  expect(value).not.toHaveProperty("spawnTarget");
  expect(value).not.toHaveProperty("guardrails");
}

describe("runCli", () => {
  const tempDirectories: string[] = [];

  afterEach(async () => {
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
      command: "compat.list"
    });
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
          tool: "codex-cli",
          tier: "tier1"
        }
      }
    });
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
    assertNoInternalRuntimeMetadata(listPayload.data.attempts[0]!);
  }, 10000);
});
