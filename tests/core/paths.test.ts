import { describe, expect, it } from "vitest";

import {
  isPathInsideRoot,
  normalizePathForComparison
} from "../../src/core/paths.js";

describe("normalizePathForComparison", () => {
  it("should collapse /private/var paths to /var", () => {
    expect(normalizePathForComparison("/private/var/tmp/demo")).toBe(
      "/var/tmp/demo"
    );
  });

  it("should collapse /private/tmp paths to /tmp", () => {
    expect(normalizePathForComparison("/private/tmp/demo")).toBe("/tmp/demo");
  });
});

describe("isPathInsideRoot", () => {
  it("should treat /tmp and /private/tmp aliases as the same root", () => {
    expect(isPathInsideRoot("/private/tmp/demo", "/tmp")).toBe(true);
  });
});
