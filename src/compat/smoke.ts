import { NotImplementedError, RuntimeError } from "../core/errors.js";
import { getAdapterDescriptor, getRuntimeAdapter } from "../adapters/catalog.js";
import {
  smokeCodexCliCompatibility,
  type CodexCliCompatibilitySmoke
} from "../adapters/codex-cli-exec.js";
import type { AdapterDescriptor, RuntimeAdapter } from "../adapters/types.js";
import type { CompatibilityDoctorAdapterStatus } from "./doctor.js";

export const compatibilitySmokeStatuses = [
  "passed",
  "failed",
  "skipped",
  "not_supported",
  "error"
] as const;

export type CompatibilitySmokeStatus =
  (typeof compatibilitySmokeStatuses)[number];

export const compatibilitySmokeDiagnosisCodes = [
  "smoke_passed",
  "gate_disabled",
  "descriptor_only",
  "detect_unavailable",
  "execution_failed",
  "unexpected_error"
] as const;

export type CompatibilitySmokeDiagnosisCode =
  (typeof compatibilitySmokeDiagnosisCodes)[number];

export interface CompatibilitySmokeDiagnosis {
  code: CompatibilitySmokeDiagnosisCode;
  summary: string;
}

export interface CompatibilitySmokeRuntime {
  adapterStatus: CompatibilityDoctorAdapterStatus;
  capabilities: AdapterDescriptor["capabilities"];
  diagnosis: CompatibilitySmokeDiagnosis;
  guidanceFile: string;
  note: string;
  projectConfig: string;
  runtime: AdapterDescriptor["runtime"];
  smokeStatus: CompatibilitySmokeStatus;
  supportTier: AdapterDescriptor["supportTier"];
}

export interface CompatibilitySmokeData {
  smoke: CompatibilitySmokeRuntime;
}

export interface CompatibilitySmokeOptions {
  getAdapterDescriptorImpl?: (
    runtime: AdapterDescriptor["runtime"] | string
  ) => AdapterDescriptor;
  getRuntimeAdapterImpl?: (runtime: AdapterDescriptor["runtime"]) => RuntimeAdapter;
  smokeCodexCliCompatibilityImpl?: () => Promise<CodexCliCompatibilitySmoke>;
}

export async function buildCompatibilitySmokeData(
  runtime: AdapterDescriptor["runtime"] | string,
  options: CompatibilitySmokeOptions = {}
): Promise<CompatibilitySmokeData> {
  const getAdapterDescriptorImpl =
    options.getAdapterDescriptorImpl ?? getAdapterDescriptor;
  const getRuntimeAdapterImpl =
    options.getRuntimeAdapterImpl ?? getRuntimeAdapter;
  const smokeCodexCliCompatibilityImpl =
    options.smokeCodexCliCompatibilityImpl ?? smokeCodexCliCompatibility;
  const descriptor = getAdapterDescriptorImpl(runtime);

  return {
    smoke: await buildCompatibilitySmokeRuntime(descriptor, {
      getRuntimeAdapterImpl,
      smokeCodexCliCompatibilityImpl
    })
  };
}

async function buildCompatibilitySmokeRuntime(
  descriptor: AdapterDescriptor,
  options: Required<
    Pick<
      CompatibilitySmokeOptions,
      "getRuntimeAdapterImpl" | "smokeCodexCliCompatibilityImpl"
    >
  >
): Promise<CompatibilitySmokeRuntime> {
  try {
    options.getRuntimeAdapterImpl(descriptor.runtime);
  } catch (error) {
    if (error instanceof NotImplementedError) {
      return {
        adapterStatus: "descriptor_only",
        smokeStatus: "not_supported",
        diagnosis: {
          code: "descriptor_only",
          summary:
            "This runtime remains descriptor-only in the current phase and does not support public compatibility smoke."
        },
        ...cloneSmokeDescriptor(descriptor)
      };
    }

    throw error;
  }

  if (descriptor.runtime !== "codex-cli") {
    throw new RuntimeError(
      `Public compatibility smoke is not implemented for ${descriptor.runtime}.`
    );
  }

  const smoke = await options.smokeCodexCliCompatibilityImpl();

  return {
    adapterStatus: "implemented",
    smokeStatus:
      smoke.smokeStatus === "passed"
        ? "passed"
        : smoke.smokeStatus === "failed"
          ? "failed"
          : smoke.smokeStatus === "skipped"
            ? "skipped"
            : "error",
    diagnosis: {
      code: smoke.diagnosisCode,
      summary: smoke.summary
    },
    ...cloneSmokeDescriptor(descriptor)
  };
}

function cloneSmokeDescriptor(
  descriptor: AdapterDescriptor
): Omit<
  CompatibilitySmokeRuntime,
  "adapterStatus" | "diagnosis" | "smokeStatus"
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
