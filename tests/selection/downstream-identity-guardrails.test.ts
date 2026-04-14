import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  validateDownstreamIdentityIngress,
  validateDownstreamSingleTaskBoundary,
  validateDownstreamUniqueIdentity
} from "../../src/selection/downstream-identity-guardrails.js";

describe("selection downstream identity guardrails", () => {
  it("should compare task identity after trimming surrounding whitespace", () => {
    expect(() =>
      validateDownstreamSingleTaskBoundary(
        [
          {
            taskId: "task_shared",
            attemptId: "att_a",
            runtime: "codex-cli"
          },
          {
            taskId: " task_other ",
            attemptId: "att_b",
            runtime: "gemini-cli"
          }
        ],
        "single-task"
      )
    ).toThrow(ValidationError);
    expect(() =>
      validateDownstreamSingleTaskBoundary(
        [
          {
            taskId: "task_shared",
            attemptId: "att_a",
            runtime: "codex-cli"
          },
          {
            taskId: " task_other ",
            attemptId: "att_b",
            runtime: "gemini-cli"
          }
        ],
        "single-task"
      )
    ).toThrow("single-task");
  });

  it("should ignore entries whose task identity is missing after normalization", () => {
    expect(() =>
      validateDownstreamSingleTaskBoundary(
        [
          {
            taskId: "task_shared",
            attemptId: "att_a",
            runtime: "codex-cli"
          },
          {
            taskId: "   ",
            attemptId: "att_b",
            runtime: "gemini-cli"
          },
          {
            taskId: undefined,
            attemptId: "att_c",
            runtime: "gemini-cli"
          }
        ],
        "single-task"
      )
    ).not.toThrow();
  });

  it("should compare full downstream identity after trimming each comparable part", () => {
    expect(() =>
      validateDownstreamUniqueIdentity(
        [
          {
            taskId: "task_shared",
            attemptId: "att_dup",
            runtime: "codex-cli"
          },
          {
            taskId: " task_shared ",
            attemptId: " att_dup ",
            runtime: " codex-cli "
          }
        ],
        "duplicate-identity"
      )
    ).toThrow(ValidationError);
    expect(() =>
      validateDownstreamUniqueIdentity(
        [
          {
            taskId: "task_shared",
            attemptId: "att_dup",
            runtime: "codex-cli"
          },
          {
            taskId: " task_shared ",
            attemptId: " att_dup ",
            runtime: " codex-cli "
          }
        ],
        "duplicate-identity"
      )
    ).toThrow("duplicate-identity");
  });

  it("should ignore incomplete identity fragments during duplicate checks", () => {
    expect(() =>
      validateDownstreamUniqueIdentity(
        [
          {
            taskId: "task_shared",
            attemptId: "att_dup",
            runtime: "codex-cli"
          },
          {
            taskId: "task_shared",
            attemptId: "   ",
            runtime: "codex-cli"
          },
          {
            taskId: "task_shared",
            attemptId: "att_dup",
            runtime: undefined
          }
        ],
        "duplicate-identity"
      )
    ).not.toThrow();
  });

  it("should apply required identity validation before later ingress checks", () => {
    expect(() =>
      validateDownstreamIdentityIngress(
        [
          {
            taskId: "task_shared",
            attemptId: "   ",
            runtime: "codex-cli"
          },
          {
            taskId: "task_other",
            attemptId: "att_b",
            runtime: "gemini-cli"
          }
        ],
        {
          required:
            "required-identity",
          singleTask: "single-task",
          unique: "duplicate-identity"
        }
      )
    ).toThrow(ValidationError);
    expect(() =>
      validateDownstreamIdentityIngress(
        [
          {
            taskId: "task_shared",
            attemptId: "   ",
            runtime: "codex-cli"
          },
          {
            taskId: "task_other",
            attemptId: "att_b",
            runtime: "gemini-cli"
          }
        ],
        {
          required:
            "required-identity",
          singleTask: "single-task",
          unique: "duplicate-identity"
        }
      )
    ).toThrow("required-identity");
  });

  it("should fail closed when required identity fields are exposed only through inherited properties", () => {
    expect(() =>
      validateDownstreamIdentityIngress(
        [
          Object.create({
            taskId: "task_shared",
            attemptId: "att_a",
            runtime: "codex-cli"
          })
        ] as Array<{
          taskId: string;
          attemptId: string;
          runtime: string;
        }>,
        {
          required: "required-identity",
          singleTask: "single-task",
          unique: "duplicate-identity"
        }
      )
    ).toThrow("required-identity");
  });

  it("should fail closed when reading a downstream identity field throws", () => {
    const entry = {
      get taskId() {
        throw new Error("getter boom");
      },
      attemptId: "att_a",
      runtime: "codex-cli"
    };

    expect(() =>
      validateDownstreamIdentityIngress([entry], {
        required: "required-identity",
        singleTask: "single-task",
        unique: "duplicate-identity"
      })
    ).toThrow(ValidationError);
    expect(() =>
      validateDownstreamIdentityIngress([entry], {
        required: "required-identity",
        singleTask: "single-task",
        unique: "duplicate-identity"
      })
    ).toThrow("required-identity");
  });

  it("should preserve single-task and duplicate checks when ingress identity is complete", () => {
    expect(() =>
      validateDownstreamIdentityIngress(
        [
          {
            taskId: "task_shared",
            attemptId: "att_a",
            runtime: "codex-cli"
          },
          {
            taskId: "task_other",
            attemptId: "att_b",
            runtime: "gemini-cli"
          }
        ],
        {
          required: "required-identity",
          singleTask: "single-task",
          unique: "duplicate-identity"
        }
      )
    ).toThrow("single-task");

    expect(() =>
      validateDownstreamIdentityIngress(
        [
          {
            taskId: "task_shared",
            attemptId: "att_dup",
            runtime: "codex-cli"
          },
          {
            taskId: " task_shared ",
            attemptId: " att_dup ",
            runtime: " codex-cli "
          }
        ],
        {
          required: "required-identity",
          singleTask: "single-task",
          unique: "duplicate-identity"
        }
      )
    ).toThrow("duplicate-identity");
  });
});
