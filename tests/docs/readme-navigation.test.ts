import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readmePaths = [
  "README.md",
  "README.zh-CN.md",
  "README.zh-TW.md",
  "README.ja.md"
] as const;

const requiredSections = ["Start Here", "Key References"] as const;
const requiredStartHereLinks = [
  "[SPEC.md](SPEC.md)",
  "[README.md](README.md)",
  "[docs/index.md](docs/index.md)",
  "[AGENTS.md](AGENTS.md)",
  "[ROADMAP.md](ROADMAP.md)"
] as const;
const requiredKeyReferenceLinks = [
  "[docs/compat/overview.md](docs/compat/overview.md)",
  "[ROADMAP.md](ROADMAP.md)",
  "[docs/maintainers/development-phases.md](docs/maintainers/development-phases.md)",
  "[docs/compat/tooling-matrix.md](docs/compat/tooling-matrix.md)",
  "[docs/research/vision-synthesis.md](docs/research/vision-synthesis.md)"
] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSectionContent(content: string, heading: string): string {
  const headingMarker = `## ${heading}`;
  const startIndex = content.indexOf(headingMarker);

  expect(startIndex, `missing ## ${heading} section`).toBeGreaterThanOrEqual(0);

  const sectionStart = content.indexOf("\n", startIndex);
  const nextSectionIndex = content.indexOf("\n## ", sectionStart + 1);

  if (sectionStart < 0) {
    return "";
  }

  return content.slice(
    sectionStart + 1,
    nextSectionIndex >= 0 ? nextSectionIndex : content.length
  );
}

function getOrderedListLinks(sectionContent: string): string[] {
  return Array.from(sectionContent.matchAll(/^- (\[[^\]]+\]\([^)]+\))/gm))
    .map((match) => match[1])
    .filter((link): link is string => link !== undefined);
}

describe("docs README navigation", () => {
  for (const readmePath of readmePaths) {
    it(`should keep ${readmePath} aligned with the shared navigation skeleton`, () => {
      const content = readFileSync(resolve(process.cwd(), readmePath), "utf8");

      for (const section of requiredSections) {
        expect(content).toContain(`## ${section}`);
      }

      const startHereLinks = getOrderedListLinks(
        getSectionContent(content, "Start Here")
      );
      const keyReferenceLinks = getOrderedListLinks(
        getSectionContent(content, "Key References")
      );

      expect(startHereLinks).toEqual([...requiredStartHereLinks]);
      expect(keyReferenceLinks).toEqual([...requiredKeyReferenceLinks]);
    });
  }
});
