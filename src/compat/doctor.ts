import { NotImplementedError } from "../core/errors.js";
import { getRuntimeAdapter, listAdapterDescriptors } from "../adapters/catalog.js";
import type { AdapterDescriptor, RuntimeAdapter } from "../adapters/types.js";

export const compatibilityDoctorAdapterStatuses = [
  "implemented",
  "descriptor_only"
] as const;

export type CompatibilityDoctorAdapterStatus =
  (typeof compatibilityDoctorAdapterStatuses)[number];

export interface CompatibilityDoctorRuntime {
  adapterStatus: CompatibilityDoctorAdapterStatus;
  capabilities: AdapterDescriptor["capabilities"];
  detected: boolean | null;
  guidanceFile: string;
  note: string;
  projectConfig: string;
  runtime: AdapterDescriptor["runtime"];
  supportTier: AdapterDescriptor["supportTier"];
}

export interface CompatibilityDoctorData {
  runtimes: CompatibilityDoctorRuntime[];
}

export interface CompatibilityDoctorOptions {
  getRuntimeAdapterImpl?: (runtime: AdapterDescriptor["runtime"]) => RuntimeAdapter;
  listAdapterDescriptorsImpl?: () => AdapterDescriptor[];
}

export async function buildCompatibilityDoctorData(
  options: CompatibilityDoctorOptions = {}
): Promise<CompatibilityDoctorData> {
  const listDescriptors =
    options.listAdapterDescriptorsImpl ?? listAdapterDescriptors;
  const getRuntimeAdapterImpl =
    options.getRuntimeAdapterImpl ?? getRuntimeAdapter;
  const descriptors = listDescriptors();
  const runtimes = await Promise.all(
    descriptors.map(async (descriptor) =>
      buildCompatibilityDoctorRuntime(descriptor, getRuntimeAdapterImpl)
    )
  );

  return {
    runtimes
  };
}

async function buildCompatibilityDoctorRuntime(
  descriptor: AdapterDescriptor,
  getRuntimeAdapterImpl: CompatibilityDoctorOptions["getRuntimeAdapterImpl"]
): Promise<CompatibilityDoctorRuntime> {
  try {
    const adapter = getRuntimeAdapterImpl!(descriptor.runtime);

    return {
      adapterStatus: "implemented",
      detected: await detectRuntime(adapter),
      ...cloneDoctorDescriptor(descriptor)
    };
  } catch (error) {
    if (error instanceof NotImplementedError) {
      return {
        adapterStatus: "descriptor_only",
        detected: null,
        ...cloneDoctorDescriptor(descriptor)
      };
    }

    throw error;
  }
}

async function detectRuntime(adapter: RuntimeAdapter): Promise<boolean> {
  try {
    return await adapter.detect();
  } catch {
    return false;
  }
}

function cloneDoctorDescriptor(
  descriptor: AdapterDescriptor
): Omit<CompatibilityDoctorRuntime, "adapterStatus" | "detected"> {
  return {
    runtime: descriptor.runtime,
    supportTier: descriptor.supportTier,
    guidanceFile: descriptor.guidanceFile,
    projectConfig: descriptor.projectConfig,
    note: descriptor.note,
    capabilities: {
      ...descriptor.capabilities
    }
  };
}
