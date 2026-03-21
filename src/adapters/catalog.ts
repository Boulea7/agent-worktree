import type {
  CapabilityDescriptor,
  RuntimeKind
} from "../core/capabilities.js";
import { NotFoundError, NotImplementedError } from "../core/errors.js";
import { compatibilityCatalog } from "../compat/catalog.js";
import { isCapabilitySupported } from "./base.js";
import { createCodexCliAdapter } from "./codex-cli.js";
import type { AdapterDescriptor, RuntimeAdapter } from "./types.js";

const concreteAdapterRuntimes = new Set<RuntimeKind>(["codex-cli"]);

const adapterDescriptorCatalog = compatibilityCatalog.map((descriptor) =>
  createAdapterDescriptor(descriptor)
);

const runtimeAdapterFactories = new Map<
  RuntimeKind,
  (descriptor: AdapterDescriptor) => RuntimeAdapter
>([
  ["codex-cli", (descriptor) => createCodexCliAdapter(descriptor)]
]);

export function listAdapterDescriptors(): AdapterDescriptor[] {
  return adapterDescriptorCatalog.map(cloneDescriptor);
}

export function getAdapterDescriptor(
  runtime: RuntimeKind | string
): AdapterDescriptor {
  const descriptor = adapterDescriptorCatalog.find(
    (entry) => entry.runtime === runtime
  );

  if (!descriptor) {
    throw new NotFoundError(`Unknown adapter target: ${runtime}.`);
  }

  return cloneDescriptor(descriptor);
}

export function getRuntimeAdapter(runtime: RuntimeKind | string): RuntimeAdapter {
  const descriptor = getAdapterDescriptor(runtime);
  const createAdapter = runtimeAdapterFactories.get(descriptor.runtime);

  if (!createAdapter) {
    throw new NotImplementedError(
      `Runtime adapter for ${descriptor.runtime} is not implemented in the current phase.`
    );
  }

  return createAdapter(descriptor);
}

export function adapterSupportsCapability(
  runtime: RuntimeKind | string,
  capability: keyof AdapterDescriptor["capabilities"]
): boolean {
  return isCapabilitySupported(getAdapterDescriptor(runtime), capability);
}

function createAdapterDescriptor(
  descriptor: CapabilityDescriptor
): AdapterDescriptor {
  return {
    runtime: descriptor.tool,
    supportTier: descriptor.tier,
    guidanceFile: descriptor.guidanceFile,
    projectConfig: descriptor.projectConfig,
    note: descriptor.note,
    capabilities: {
      machineReadableMode: concreteAdapterRuntimes.has(descriptor.tool)
        ? descriptor.machineReadableMode
        : "unsupported",
      resume: "unsupported",
      mcp: "unsupported",
      sessionLifecycle: "unsupported",
      eventStreamParsing:
        descriptor.tool === "codex-cli" ? "partial" : "unsupported"
    }
  };
}

function cloneDescriptor(descriptor: AdapterDescriptor): AdapterDescriptor {
  return {
    ...descriptor,
    capabilities: {
      ...descriptor.capabilities
    }
  };
}
