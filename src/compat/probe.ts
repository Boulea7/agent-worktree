import { NotFoundError, NotImplementedError, RuntimeError } from "../core/errors.js";
import { getAdapterDescriptor, getRuntimeAdapter } from "../adapters/catalog.js";
import {
  probeCodexCliCompatibility,
  type CodexCliCompatibilityProbe
} from "../adapters/codex-cli-exec.js";
import type { AdapterDescriptor, RuntimeAdapter } from "../adapters/types.js";
import type {
  CompatibilityDoctorAdapterStatus
} from "./doctor.js";

export const compatibilityProbeStatuses = [
  "supported",
  "unsupported",
  "not_probed",
  "error"
] as const;

export type CompatibilityProbeStatus =
  (typeof compatibilityProbeStatuses)[number];

export const compatibilityProbeDiagnosisCodes = [
  "exec_json_supported",
  "exec_json_unavailable",
  "descriptor_only",
  "probe_error"
] as const;

export type CompatibilityProbeDiagnosisCode =
  (typeof compatibilityProbeDiagnosisCodes)[number];

export interface CompatibilityProbeDiagnosis {
  code: CompatibilityProbeDiagnosisCode;
  summary: string;
}

export interface CompatibilityProbeRuntime {
  adapterStatus: CompatibilityDoctorAdapterStatus;
  capabilities: AdapterDescriptor["capabilities"];
  diagnosis: CompatibilityProbeDiagnosis;
  guidanceFile: string;
  note: string;
  probeStatus: CompatibilityProbeStatus;
  projectConfig: string;
  runtime: AdapterDescriptor["runtime"];
  supportTier: AdapterDescriptor["supportTier"];
}

export interface CompatibilityProbeData {
  probe: CompatibilityProbeRuntime;
}

export interface CompatibilityProbeOptions {
  getAdapterDescriptorImpl?: (
    runtime: AdapterDescriptor["runtime"] | string
  ) => AdapterDescriptor;
  getRuntimeAdapterImpl?: (runtime: AdapterDescriptor["runtime"]) => RuntimeAdapter;
  probeCodexCliCompatibilityImpl?: () => Promise<CodexCliCompatibilityProbe>;
}

export async function buildCompatibilityProbeData(
  runtime: AdapterDescriptor["runtime"] | string,
  options: CompatibilityProbeOptions = {}
): Promise<CompatibilityProbeData> {
  const getAdapterDescriptorImpl =
    options.getAdapterDescriptorImpl ?? getAdapterDescriptor;
  const getRuntimeAdapterImpl =
    options.getRuntimeAdapterImpl ?? getRuntimeAdapter;
  const probeCodexCliCompatibilityImpl =
    options.probeCodexCliCompatibilityImpl ?? probeCodexCliCompatibility;
  const descriptor = resolveCompatibilityDescriptor(
    runtime,
    getAdapterDescriptorImpl
  );

  return {
    probe: await buildCompatibilityProbeRuntime(descriptor, {
      getRuntimeAdapterImpl,
      probeCodexCliCompatibilityImpl
    })
  };
}

function resolveCompatibilityDescriptor(
  runtime: AdapterDescriptor["runtime"] | string,
  getAdapterDescriptorImpl: (
    runtime: AdapterDescriptor["runtime"] | string
  ) => AdapterDescriptor
): AdapterDescriptor {
  try {
    return getAdapterDescriptorImpl(runtime);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new NotFoundError(`Unknown compatibility target: ${runtime}.`);
    }

    throw error;
  }
}

async function buildCompatibilityProbeRuntime(
  descriptor: AdapterDescriptor,
  options: Required<
    Pick<
      CompatibilityProbeOptions,
      "getRuntimeAdapterImpl" | "probeCodexCliCompatibilityImpl"
    >
  >
): Promise<CompatibilityProbeRuntime> {
  try {
    options.getRuntimeAdapterImpl(descriptor.runtime);
  } catch (error) {
    if (error instanceof NotImplementedError) {
      return {
        adapterStatus: "descriptor_only",
        probeStatus: "not_probed",
        diagnosis: {
          code: "descriptor_only",
          summary:
            "This runtime remains descriptor-only in the current phase and is not runtime-probed."
        },
        ...cloneProbeDescriptor(descriptor)
      };
    }

    throw error;
  }

  if (descriptor.runtime !== "codex-cli") {
    throw new RuntimeError(
      `Public compatibility probing is not implemented for ${descriptor.runtime}.`
    );
  }

  try {
    const probe = await options.probeCodexCliCompatibilityImpl();

    return {
      adapterStatus: "implemented",
      probeStatus: probe.supported ? "supported" : "unsupported",
      diagnosis: {
        code: probe.diagnosisCode,
        summary: probe.summary
      },
      ...cloneProbeDescriptor(descriptor)
    };
  } catch {
    return {
      adapterStatus: "implemented",
      probeStatus: "error",
      diagnosis: {
        code: "probe_error",
        summary: "The local codex-cli compatibility probe did not complete successfully."
      },
      ...cloneProbeDescriptor(descriptor)
    };
  }
}

function cloneProbeDescriptor(
  descriptor: AdapterDescriptor
): Omit<
  CompatibilityProbeRuntime,
  "adapterStatus" | "diagnosis" | "probeStatus"
> {
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
