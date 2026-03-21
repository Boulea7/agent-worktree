import {
  defaultExecutionMode,
  defaultSafetyIntent,
  type ExecutionMode,
  type SafetyIntent
} from "../core/capabilities.js";
import { ValidationError } from "../core/errors.js";
import type {
  AdapterCapability,
  AdapterDescriptor,
  RenderCommandInput,
  RenderedCommand,
  RuntimeAdapter,
  StructuredDegradation
} from "./types.js";

interface UnsupportedCapabilityPolicy {
  canProceed: boolean;
  fallback: string;
}

const unsupportedCapabilityPolicies: Record<
  AdapterCapability,
  UnsupportedCapabilityPolicy
> = {
  machineReadableMode: {
    canProceed: true,
    fallback:
      "Switch to interactive rendering when machine-readable output is not required."
  },
  resume: {
    canProceed: true,
    fallback:
      "Render a fresh command without resuming an existing session in the current phase."
  },
  mcp: {
    canProceed: true,
    fallback:
      "Continue without MCP-backed extensions until adapter execution is implemented."
  },
  sessionLifecycle: {
    canProceed: true,
    fallback:
      "Continue with manifest-backed lifecycle state without attach/stop support."
  },
  eventStreamParsing: {
    canProceed: true,
    fallback:
      "Use rendered commands only until canonical event parsing is implemented."
  }
};

export abstract class BaseRuntimeAdapter implements RuntimeAdapter {
  public readonly descriptor: AdapterDescriptor;
  private readonly detectImpl: () => boolean | Promise<boolean>;

  public constructor(
    descriptor: AdapterDescriptor,
    detectImpl: () => boolean | Promise<boolean> = () => true
  ) {
    this.descriptor = cloneDescriptor(descriptor);
    this.detectImpl = detectImpl;
  }

  public abstract renderCommand(input?: RenderCommandInput): RenderedCommand;

  public detect(): boolean | Promise<boolean> {
    return this.detectImpl();
  }

  public supportsCapability(capability: AdapterCapability): boolean {
    return isCapabilitySupported(this.descriptor, capability);
  }

  public degradeUnsupportedCapability(
    capability: AdapterCapability
  ): StructuredDegradation {
    if (this.supportsCapability(capability)) {
      throw new ValidationError(
        `Runtime ${this.descriptor.runtime} already supports capability ${capability}.`
      );
    }

    const policy = unsupportedCapabilityPolicies[capability];

    return {
      ok: false,
      kind: "unsupported_capability",
      runtime: this.descriptor.runtime,
      capability,
      supported: false,
      reason: `Runtime ${this.descriptor.runtime} does not currently expose ${capability} in the thin adapter foundation.`,
      canProceed: policy.canProceed,
      fallback: policy.fallback,
      note:
        "Phase 3 currently ships a limited adapter execution slice with explicit unsupported capabilities."
    };
  }

  protected getDefaultExecutionMode(
    input: RenderCommandInput = {}
  ): ExecutionMode {
    return input.executionMode ?? defaultExecutionMode;
  }

  protected getDefaultSafetyIntent(input: RenderCommandInput = {}): SafetyIntent {
    return input.safetyIntent ?? defaultSafetyIntent;
  }
}

export function isCapabilitySupported(
  descriptor: AdapterDescriptor,
  capability: AdapterCapability
): boolean {
  return descriptor.capabilities[capability] !== "unsupported";
}

function cloneDescriptor(descriptor: AdapterDescriptor): AdapterDescriptor {
  return {
    ...descriptor,
    capabilities: {
      ...descriptor.capabilities
    }
  };
}
