import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import { CodexCliAdapter } from "../../src/adapters/codex-cli.js";
import { getAdapterDescriptor } from "../../src/adapters/catalog.js";
import type { HeadlessExecutionResult } from "../../src/adapters/types.js";
import { ValidationError } from "../../src/core/errors.js";
import {
  buildExecutionSessionIndex,
  deriveExecutionSessionRecord
} from "../../src/control-plane/internal.js";

async function readFixture(name: string): Promise<string> {
  return readFile(
    new URL(`../fixtures/adapters/codex-cli/headless/${name}`, import.meta.url),
    "utf8"
  );
}

describe("control-plane runtime-state helpers", () => {
  it("should derive a root execution session record from a successful headless result", async () => {
    const stdout = await readFixture("success.observed.jsonl");
    const runner = vi.fn(async () => ({
      exitCode: 0,
      stdout,
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"), {
      runner
    });
    const attempt = {
      attemptId: "att_root"
    };
    const result = await adapter.executeHeadless({
      prompt: "Reply with ok",
      attempt
    });

    expect(deriveExecutionSessionRecord({ attempt, result })).toEqual({
      attemptId: "att_root",
      runtime: "codex-cli",
      sessionId: "thr_demo",
      sourceKind: "direct",
      lifecycleState: "completed",
      runCompleted: true,
      errorEventCount: 0,
      lastAgentMessage: "ok",
      usage: {
        inputTokens: 1,
        outputTokens: 1
      },
      origin: "headless_result"
    });
  });

  it("should derive a child execution session record from a failed headless result", async () => {
    const stdout = await readFixture("error-event.jsonl");
    const runner = vi.fn(async () => ({
      exitCode: 0,
      stdout,
      stderr: "codex failed"
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"), {
      runner
    });
    const attempt = {
      attemptId: "att_child",
      sourceKind: "delegated" as const,
      parentAttemptId: "att_parent"
    };
    const result = await adapter.executeHeadless({
      prompt: "Reply with ok",
      attempt
    });

    expect(deriveExecutionSessionRecord({ attempt, result })).toEqual({
      attemptId: "att_child",
      runtime: "codex-cli",
      sourceKind: "delegated",
      parentAttemptId: "att_parent",
      lifecycleState: "failed",
      runCompleted: false,
      errorEventCount: 1,
      lastErrorMessage: "codex failed",
      origin: "headless_result"
    });
  });

  it("should return undefined when execution lineage is omitted", async () => {
    const stdout = await readFixture("success.observed.jsonl");
    const runner = vi.fn(async () => ({
      exitCode: 0,
      stdout,
      stderr: ""
    }));
    const adapter = new CodexCliAdapter(getAdapterDescriptor("codex-cli"), {
      runner
    });
    const result = await adapter.executeHeadless({
      prompt: "Reply with ok"
    });

    expect(deriveExecutionSessionRecord({ result })).toBeUndefined();
  });

  it("should fall back to observation data when sessionSnapshot is absent", () => {
    const result = createHeadlessExecutionResult({
      observation: {
        threadId: "thr_partial",
        runCompleted: false,
        errorEventCount: 0,
        lastAgentMessage: "partial"
      }
    });
    const attempt = {
      attemptId: "att_partial"
    };

    expect(deriveExecutionSessionRecord({ attempt, result })).toEqual({
      attemptId: "att_partial",
      runtime: "codex-cli",
      sessionId: "thr_partial",
      sourceKind: "direct",
      lifecycleState: "active",
      runCompleted: false,
      errorEventCount: 0,
      lastAgentMessage: "partial",
      origin: "headless_result"
    });
  });

  it("should preserve normalized guardrails from a derived session snapshot", () => {
    const result = createHeadlessExecutionResult({
      controlPlane: {
        sessionSnapshot: {
          node: {
            attemptId: "att_guarded",
            nodeKind: "root",
            sourceKind: "direct"
          },
          lifecycleState: "active",
          runCompleted: false,
          errorEventCount: 0,
          guardrails: {
            maxChildren: 2,
            maxDepth: 3
          }
        }
      }
    });
    const attempt = {
      attemptId: "att_guarded"
    };

    expect(deriveExecutionSessionRecord({ attempt, result })).toEqual({
      attemptId: "att_guarded",
      runtime: "codex-cli",
      sourceKind: "direct",
      lifecycleState: "active",
      runCompleted: false,
      errorEventCount: 0,
      guardrails: {
        maxChildren: 2,
        maxDepth: 3
      },
      origin: "headless_result"
    });
  });

  it("should reject blank attempt identifiers when deriving an execution session record", () => {
    expect(() =>
      deriveExecutionSessionRecord({
        attempt: {
          attemptId: "   "
        },
        result: createHeadlessExecutionResult()
      })
    ).toThrow(ValidationError);
  });

  it("should canonicalize attemptId and sessionId when deriving an execution session record", () => {
    expect(
      deriveExecutionSessionRecord({
        attempt: {
          attemptId: "  att_trimmed  "
        },
        result: createHeadlessExecutionResult({
          observation: {
            threadId: "  thr_trimmed  ",
            runCompleted: false,
            errorEventCount: 0,
            lastAgentMessage: "partial"
          }
        })
      })
    ).toEqual({
      attemptId: "att_trimmed",
      runtime: "codex-cli",
      sessionId: "thr_trimmed",
      sourceKind: "direct",
      lifecycleState: "active",
      runCompleted: false,
      errorEventCount: 0,
      lastAgentMessage: "partial",
      origin: "headless_result"
    });
  });

  it("should build canonical index keys for spaced attemptId and sessionId values", () => {
    const index = buildExecutionSessionIndex([
      {
        attemptId: "  att_trimmed  ",
        runtime: "codex-cli",
        sessionId: "  thr_trimmed  ",
        sourceKind: "direct",
        lifecycleState: "active",
        runCompleted: false,
        errorEventCount: 0,
        origin: "headless_result"
      }
    ]);

    expect(index.byAttemptId.get("att_trimmed")).toMatchObject({
      attemptId: "  att_trimmed  "
    });
    expect(index.bySessionId.get("thr_trimmed")).toMatchObject({
      sessionId: "  thr_trimmed  "
    });
  });

  it("should build an execution session index by attempt and by session", () => {
    const withSession = deriveExecutionSessionRecord({
      attempt: {
        attemptId: "att_root"
      },
      result: createHeadlessExecutionResult({
        observation: {
          threadId: "thr_root",
          runCompleted: true,
          errorEventCount: 0
        }
      })
    });
    const withoutSession = deriveExecutionSessionRecord({
      attempt: {
        attemptId: "att_child",
        sourceKind: "fork",
        parentAttemptId: "att_root"
      },
      result: createHeadlessExecutionResult({
        observation: {
          runCompleted: false,
          errorEventCount: 0,
          lastAgentMessage: "pending"
        }
      })
    });

    const index = buildExecutionSessionIndex([
      withSession!,
      withoutSession!
    ]);

    expect(index.byAttemptId.get("att_root")).toMatchObject({
      sessionId: "thr_root"
    });
    expect(index.byAttemptId.get("att_child")).toMatchObject({
      parentAttemptId: "att_root"
    });
    expect(index.bySessionId.get("thr_root")).toMatchObject({
      attemptId: "att_root"
    });
    expect(index.bySessionId.has("att_child")).toBe(false);
  });

  it("should reject duplicate attempt identifiers when building an execution session index", () => {
    expect(() =>
      buildExecutionSessionIndex([
        {
          attemptId: "att_duplicate",
          runtime: "codex-cli",
          sourceKind: "direct",
          lifecycleState: "created",
          runCompleted: false,
          errorEventCount: 0,
          origin: "headless_result"
        },
        {
          attemptId: "att_duplicate",
          runtime: "codex-cli",
          sourceKind: "direct",
          lifecycleState: "created",
          runCompleted: false,
          errorEventCount: 0,
          origin: "headless_result"
        }
      ])
    ).toThrow(ValidationError);
  });

  it("should reject duplicate session identifiers when building an execution session index", () => {
    expect(() =>
      buildExecutionSessionIndex([
        {
          attemptId: "att_a",
          runtime: "codex-cli",
          sessionId: "thr_shared",
          sourceKind: "direct",
          lifecycleState: "completed",
          runCompleted: true,
          errorEventCount: 0,
          origin: "headless_result"
        },
        {
          attemptId: "att_b",
          runtime: "codex-cli",
          sessionId: "thr_shared",
          sourceKind: "fork",
          parentAttemptId: "att_a",
          lifecycleState: "active",
          runCompleted: false,
          errorEventCount: 0,
          origin: "headless_result"
        }
      ])
    ).toThrow(ValidationError);
  });

  it("should reject blank session identifiers when building an execution session index", () => {
    expect(() =>
      buildExecutionSessionIndex([
        {
          attemptId: "att_blank",
          runtime: "codex-cli",
          sessionId: "   ",
          sourceKind: "direct",
          lifecycleState: "created",
          runCompleted: false,
          errorEventCount: 0,
          origin: "headless_result"
        }
      ])
    ).toThrow(ValidationError);
  });

  it("should reject blank attempt identifiers when building an execution session index", () => {
    expect(() =>
      buildExecutionSessionIndex([
        {
          attemptId: "   ",
          runtime: "codex-cli",
          sourceKind: "direct",
          lifecycleState: "created",
          runCompleted: false,
          errorEventCount: 0,
          origin: "headless_result"
        }
      ])
    ).toThrow(ValidationError);
  });
});

function createHeadlessExecutionResult(
  overrides: Partial<HeadlessExecutionResult> = {}
): HeadlessExecutionResult {
  return {
    command: {
      runtime: "codex-cli",
      executable: "codex",
      args: ["exec", "--json", "--ephemeral", "Reply with ok"],
      metadata: {
        executionMode: "headless_event_stream",
        safetyIntent: "workspace_write_with_approval",
        machineReadable: true,
        promptIncluded: true,
        resumeRequested: false
      }
    },
    events: [],
    exitCode: 0,
    observation: {
      runCompleted: false,
      errorEventCount: 0
    },
    stderr: "",
    stdout: "",
    ...overrides
  };
}
