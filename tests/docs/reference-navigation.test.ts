import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const relatedDocs = [
  {
    path: "docs/index.md",
    links: [
      "[ROADMAP.md](../ROADMAP.md)",
      "[docs/compat/overview.md](compat/overview.md)",
      "[docs/maintainers/development-phases.md](maintainers/development-phases.md)"
    ]
  },
  {
    path: "ROADMAP.md",
    links: [
      "[docs/index.md](docs/index.md)",
      "[docs/compat/overview.md](docs/compat/overview.md)",
      "[docs/maintainers/development-phases.md](docs/maintainers/development-phases.md)"
    ]
  },
  {
    path: "docs/compat/overview.md",
    links: [
      "[docs/index.md](../index.md)",
      "[ROADMAP.md](../../ROADMAP.md)",
      "[docs/maintainers/development-phases.md](../maintainers/development-phases.md)"
    ]
  },
  {
    path: "docs/maintainers/development-phases.md",
    links: [
      "[docs/index.md](../index.md)",
      "[ROADMAP.md](../../ROADMAP.md)",
      "[docs/compat/overview.md](../compat/overview.md)"
    ]
  }
] as const;

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

describe("docs reference navigation", () => {
  for (const doc of relatedDocs) {
    it(`should keep ${doc.path} connected to the shared doc spine`, () => {
      const content = readFileSync(resolve(process.cwd(), doc.path), "utf8");
      const relatedLinks = getOrderedListLinks(getSectionContent(content, "Related"));

      expect(relatedLinks).toEqual([...doc.links]);
    });
  }
});
