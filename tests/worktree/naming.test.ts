import { describe, expect, it } from "vitest";

import {
  buildAttemptBranch,
  buildAttemptHandle,
  buildWorktreeDirectoryName
} from "../../src/worktree/naming.js";

describe("buildAttemptHandle", () => {
  it("should normalize task identifiers into safe handles", () => {
    expect(buildAttemptHandle("Fix API: OAuth Callback!")).toBe(
      "fix-api-oauth-callback"
    );
  });

  it("should fall back to task when the identifier has no safe characters", () => {
    expect(buildAttemptHandle("!!!")).toBe("task");
  });
});

describe("worktree naming helpers", () => {
  it("should build a stable branch name", () => {
    expect(
      buildAttemptBranch({
        attemptId: "att_demo123",
        taskId: "Fix API: OAuth Callback!"
      })
    ).toBe("attempt/fix-api-oauth-callback/att_demo123");
  });

  it("should build a stable worktree directory name", () => {
    expect(
      buildWorktreeDirectoryName({
        attemptId: "att_demo123",
        taskId: "Fix API: OAuth Callback!"
      })
    ).toBe("fix-api-oauth-callback-att_demo123");
  });
});
