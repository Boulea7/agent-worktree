import type { CapabilityDescriptor, RuntimeKind } from "../core/capabilities.js";
import { NotFoundError } from "../core/errors.js";
import { compatibilityCatalog } from "./catalog.js";
export {
  buildCompatibilityDoctorData,
  compatibilityDoctorAdapterStatuses,
  type CompatibilityDoctorAdapterStatus,
  type CompatibilityDoctorData,
  type CompatibilityDoctorOptions,
  type CompatibilityDoctorRuntime
} from "./doctor.js";

export function listCompatibilityDescriptors(): CapabilityDescriptor[] {
  return [...compatibilityCatalog];
}

export function getCompatibilityDescriptor(
  runtime: RuntimeKind | string
): CapabilityDescriptor {
  const descriptor = compatibilityCatalog.find((entry) => entry.tool === runtime);

  if (!descriptor) {
    throw new NotFoundError(`Unknown compatibility target: ${runtime}.`);
  }

  return descriptor;
}
