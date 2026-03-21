import { describe, expect, it } from "vitest";

import { NotFoundError, NotImplementedError } from "../../src/core/errors.js";
import { getCompatibilityDescriptor } from "../../src/compat/index.js";
import {
  getAdapterDescriptor,
  getRuntimeAdapter,
  listAdapterDescriptors
} from "../../src/adapters/catalog.js";

describe("adapter catalog", () => {
  it("should project compatibility metadata into adapter descriptors", () => {
    const descriptor = getAdapterDescriptor("codex-cli");
    const compatDescriptor = getCompatibilityDescriptor("codex-cli");

    expect(descriptor).toMatchObject({
      runtime: "codex-cli",
      supportTier: compatDescriptor.tier,
      guidanceFile: compatDescriptor.guidanceFile,
      projectConfig: compatDescriptor.projectConfig,
      note: compatDescriptor.note,
      capabilities: {
        machineReadableMode: compatDescriptor.machineReadableMode,
        resume: "unsupported",
        mcp: "unsupported",
        sessionLifecycle: "unsupported",
        eventStreamParsing: "partial"
      }
    });

    expect(compatDescriptor.resume).toBe("strong");
    expect(compatDescriptor.mcp).toBe("strong");
  });

  it("should list codex-cli as an available adapter descriptor", () => {
    expect(listAdapterDescriptors()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          runtime: "codex-cli",
          supportTier: "tier1"
        })
      ])
    );
  });

  it("should not advertise concrete adapter capabilities for descriptor-only runtimes", () => {
    const descriptor = getAdapterDescriptor("claude-code");
    const compatDescriptor = getCompatibilityDescriptor("claude-code");

    expect(descriptor.capabilities.machineReadableMode).toBe("unsupported");
    expect(compatDescriptor.machineReadableMode).toBe("strong");
  });

  it("should return the concrete codex-cli runtime adapter", () => {
    const adapter = getRuntimeAdapter("codex-cli");

    expect(adapter.descriptor).toMatchObject({
      runtime: "codex-cli",
      supportTier: "tier1",
      capabilities: {
        eventStreamParsing: "partial"
      }
    });
  });

  it("should reject unknown adapter runtimes", () => {
    expect(() => getAdapterDescriptor("missing-runtime")).toThrow(NotFoundError);
  });

  it("should keep known-but-unimplemented runtimes at descriptor-only level", () => {
    expect(() => getRuntimeAdapter("claude-code")).toThrow(NotImplementedError);
  });
});
