import { describe, expect, it } from "vitest";

import {
  getCompatibilityDescriptor,
  listCompatibilityDescriptors
} from "../../src/compat/index.js";

describe("compat index catalog access", () => {
  it("should return cloned descriptors from getCompatibilityDescriptor", () => {
    const descriptor = getCompatibilityDescriptor("codex-cli");

    descriptor.note = "Mutated note.";
    descriptor.machineReadableMode = "unsupported";

    expect(getCompatibilityDescriptor("codex-cli")).toMatchObject({
      tool: "codex-cli",
      note: "Most naturally aligned with root AGENTS.md.",
      machineReadableMode: "strong"
    });
  });

  it("should return cloned descriptors from listCompatibilityDescriptors", () => {
    const [firstDescriptor] = listCompatibilityDescriptors();

    expect(firstDescriptor).toBeDefined();

    if (!firstDescriptor) {
      return;
    }

    firstDescriptor.note = "Mutated note.";
    firstDescriptor.machineReadableMode = "strong";

    const [nextDescriptor] = listCompatibilityDescriptors();

    expect(nextDescriptor).toMatchObject({
      tool: "claude-code",
      note: "Rich hook model and clear settings scopes.",
      machineReadableMode: "unsupported"
    });
  });
});
