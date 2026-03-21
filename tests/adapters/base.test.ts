import { describe, expect, it } from "vitest";

import { BaseRuntimeAdapter } from "../../src/adapters/base.js";
import type {
  AdapterDescriptor,
  RenderCommandInput,
  RenderedCommand
} from "../../src/adapters/types.js";
import { ValidationError } from "../../src/core/errors.js";

function createDescriptor(
  overrides: Partial<AdapterDescriptor> = {}
): AdapterDescriptor {
  return {
    runtime: "other-cli",
    supportTier: "experimental",
    guidanceFile: "AGENTS.md",
    projectConfig: "generic mapping",
    note: "Demo descriptor.",
    capabilities: {
      machineReadableMode: "partial",
      resume: "unsupported",
      mcp: "unsupported",
      sessionLifecycle: "unsupported",
      eventStreamParsing: "unsupported"
    },
    ...overrides
  };
}

class DemoAdapter extends BaseRuntimeAdapter {
  public constructor() {
    super(createDescriptor());
  }

  public renderCommand(input: RenderCommandInput = {}): RenderedCommand {
    return {
      runtime: this.descriptor.runtime,
      executable: "demo",
      args: [],
      metadata: {
        executionMode: this.getDefaultExecutionMode(input),
        safetyIntent: this.getDefaultSafetyIntent(input),
        machineReadable: false,
        promptIncluded: input.prompt !== undefined,
        resumeRequested: input.resumeSessionId !== undefined
      }
    };
  }
}

describe("BaseRuntimeAdapter", () => {
  it("should expose capability support checks", () => {
    const adapter = new DemoAdapter();

    expect(adapter.supportsCapability("machineReadableMode")).toBe(true);
    expect(adapter.supportsCapability("sessionLifecycle")).toBe(false);
  });

  it("should return a deterministic structured degradation result", () => {
    const adapter = new DemoAdapter();

    expect(adapter.degradeUnsupportedCapability("sessionLifecycle")).toEqual({
      ok: false,
      kind: "unsupported_capability",
      runtime: "other-cli",
      capability: "sessionLifecycle",
      supported: false,
      reason:
        "Runtime other-cli does not currently expose sessionLifecycle in the thin adapter foundation.",
      canProceed: true,
      fallback:
        "Continue with manifest-backed lifecycle state without attach/stop support.",
      note:
        "Phase 3 currently ships a limited adapter execution slice with explicit unsupported capabilities."
    });
  });

  it("should reject degradation requests for supported capabilities", () => {
    const adapter = new DemoAdapter();

    expect(() =>
      adapter.degradeUnsupportedCapability("machineReadableMode")
    ).toThrow(ValidationError);
  });
});
