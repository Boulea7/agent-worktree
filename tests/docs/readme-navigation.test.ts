import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readmePaths = [
  "README.md",
  "README.zh-CN.md",
  "README.zh-TW.md",
  "README.ja.md"
] as const;

const requiredSections = ["## Start Here", "## Key References"] as const;
const requiredLinks = [
  "[SPEC.md](SPEC.md)",
  "[docs/index.md](docs/index.md)",
  "[AGENTS.md](AGENTS.md)",
  "[ROADMAP.md](ROADMAP.md)",
  "[docs/compat/overview.md](docs/compat/overview.md)"
] as const;

describe("docs README navigation", () => {
  for (const readmePath of readmePaths) {
    it(`should keep ${readmePath} aligned with the shared navigation skeleton`, () => {
      const content = readFileSync(resolve(process.cwd(), readmePath), "utf8");

      for (const section of requiredSections) {
        expect(content).toContain(section);
      }

      for (const link of requiredLinks) {
        expect(content).toContain(link);
      }
    });
  }
});
