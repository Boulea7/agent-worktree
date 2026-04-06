import { ValidationError } from "../core/errors.js";
import type { CompatibilityDoctorData } from "../compat/doctor.js";
import type { CompatibilityProbeData } from "../compat/probe.js";
import type { CompatibilitySmokeData } from "../compat/smoke.js";
import type { CapabilityDescriptor } from "../core/capabilities.js";
import type { AttemptManifest } from "../manifest/types.js";
import type { CleanupAttemptResult } from "../worktree/cleanup.js";
import type {
  PublicAttemptSourceKind,
  PublicAttemptStatus,
  PublicAttemptCleanupData,
  PublicCleanupOutcome,
  PublicAttemptCleanupRecord,
  PublicAttemptCreateData,
  PublicAttemptCreateRecord,
  PublicAttemptListData,
  PublicAttemptListRecord,
  PublicCompatibilityCatalogCapabilitySupport,
  PublicCompatibilityCatalogRecord,
  PublicCompatibilityListData,
  PublicCompatibilityShowData,
  PublicCompatibilityCapabilities,
  PublicCompatibilityCapabilitySupport,
  PublicCompatibilityDoctorData,
  PublicCompatibilityDoctorAdapterStatus,
  PublicCompatibilityDoctorRuntime,
  PublicCompatibilityProbeData,
  PublicCompatibilityProbeDiagnosisCode,
  PublicCompatibilityProbeStatus,
  PublicCompatibilityProbeRuntime,
  PublicCompatibilitySmokeData,
  PublicCompatibilitySmokeDiagnosisCode,
  PublicCompatibilitySmokeStatus,
  PublicCompatibilitySmokeRuntime,
  PublicRuntimeKind,
  PublicSupportTier
} from "./public-shapes.js";
import {
  publicAttemptSourceKinds,
  publicAttemptStatuses,
  publicCleanupOutcomes,
  publicCompatibilityCatalogCapabilitySupports,
  publicCompatibilityCapabilitySupports,
  publicCompatibilityDoctorAdapterStatuses,
  publicCompatibilityProbeDiagnosisCodes,
  publicCompatibilityProbeStatuses,
  publicCompatibilitySmokeDiagnosisCodes,
  publicCompatibilitySmokeStatuses,
  publicRuntimeKinds,
  publicSupportTiers
} from "./public-shapes.js";

const publicRuntimeKindsSet = new Set<string>(publicRuntimeKinds);
const publicSupportTiersSet = new Set<string>(publicSupportTiers);
const publicCompatibilityCatalogCapabilitySupportsSet = new Set<string>(
  publicCompatibilityCatalogCapabilitySupports
);
const publicCompatibilityCapabilitySupportsSet = new Set<string>(
  publicCompatibilityCapabilitySupports
);
const publicCompatibilityDoctorAdapterStatusesSet = new Set<string>(
  publicCompatibilityDoctorAdapterStatuses
);
const publicCompatibilityProbeStatusesSet = new Set<string>(
  publicCompatibilityProbeStatuses
);
const publicCompatibilityProbeDiagnosisCodesSet = new Set<string>(
  publicCompatibilityProbeDiagnosisCodes
);
const publicCompatibilitySmokeStatusesSet = new Set<string>(
  publicCompatibilitySmokeStatuses
);
const publicCompatibilitySmokeDiagnosisCodesSet = new Set<string>(
  publicCompatibilitySmokeDiagnosisCodes
);
const publicAttemptStatusesSet = new Set<string>(publicAttemptStatuses);
const publicAttemptSourceKindsSet = new Set<string>(publicAttemptSourceKinds);
const publicCleanupOutcomesSet = new Set<string>(publicCleanupOutcomes);

export function serializeCompatibilityDoctorData(
  data: CompatibilityDoctorData
): PublicCompatibilityDoctorData {
  return {
    runtimes: data.runtimes.map((runtime) =>
      serializeCompatibilityDoctorRuntime(runtime)
    )
  };
}

export function serializeCompatibilityListData(data: {
  tools: readonly CapabilityDescriptor[];
}): PublicCompatibilityListData {
  return {
    tools: data.tools.map((tool) => serializeCompatibilityCatalogRecord(tool))
  };
}

export function serializeCompatibilityShowData(data: {
  tool: CapabilityDescriptor;
}): PublicCompatibilityShowData {
  return {
    tool: serializeCompatibilityCatalogRecord(data.tool)
  };
}

export function serializeCompatibilityProbeData(
  data: CompatibilityProbeData
): PublicCompatibilityProbeData {
  return {
    probe: serializeCompatibilityProbeRuntime(data.probe)
  };
}

export function serializeCompatibilitySmokeData(
  data: CompatibilitySmokeData
): PublicCompatibilitySmokeData {
  return {
    smoke: serializeCompatibilitySmokeRuntime(data.smoke)
  };
}

export function serializeAttemptCreateData(data: {
  attempt: AttemptManifest;
}): PublicAttemptCreateData {
  return {
    attempt: serializeAttemptCreateRecord(data.attempt)
  };
}

export function serializeAttemptListData(data: {
  attempts: readonly AttemptManifest[];
}): PublicAttemptListData {
  return {
    attempts: data.attempts.map((attempt) => serializeAttemptListRecord(attempt))
  };
}

export function serializeAttemptCleanupResult(
  result: CleanupAttemptResult
): PublicAttemptCleanupData {
  return {
    attempt: serializeAttemptCleanupRecord(result.attempt),
    cleanup: {
      outcome: normalizeCleanupOutcome(
        result.cleanup.outcome,
        "attempt.cleanup.outcome"
      ),
      worktreeRemoved: normalizeBoolean(
        result.cleanup.worktreeRemoved,
        "attempt.cleanup.worktreeRemoved"
      )
    }
  };
}

function serializeCompatibilityDoctorRuntime(
  runtime: CompatibilityDoctorData["runtimes"][number]
): PublicCompatibilityDoctorRuntime {
  return {
    runtime: normalizeRuntimeKind(runtime.runtime, "doctor.runtime"),
    supportTier: normalizeRequiredSupportTier(
      runtime.supportTier,
      "doctor.supportTier"
    ),
    guidanceFile: normalizeRequiredString(
      runtime.guidanceFile,
      "doctor.guidanceFile"
    ),
    projectConfig: normalizeRequiredString(
      runtime.projectConfig,
      "doctor.projectConfig"
    ),
    note: normalizeRequiredString(runtime.note, "doctor.note"),
    capabilities: serializeCompatibilityCapabilities(runtime.capabilities),
    adapterStatus: normalizeDoctorAdapterStatus(
      runtime.adapterStatus,
      "doctor.adapterStatus"
    ),
    detected: normalizeNullableBoolean(runtime.detected, "doctor.detected")
  };
}

function serializeCompatibilityCatalogRecord(
  descriptor: CapabilityDescriptor
): PublicCompatibilityCatalogRecord {
  return {
    tool: normalizeRuntimeKind(descriptor.tool, "compat.catalog.tool"),
    tier: normalizeRequiredSupportTier(descriptor.tier, "compat.catalog.tier"),
    guidanceFile: normalizeRequiredString(
      descriptor.guidanceFile,
      "compat.catalog.guidanceFile"
    ),
    projectConfig: normalizeRequiredString(
      descriptor.projectConfig,
      "compat.catalog.projectConfig"
    ),
    machineReadableMode: normalizeCatalogCapabilitySupport(
      descriptor.machineReadableMode,
      "compat.catalog.machineReadableMode"
    ),
    resume: normalizeCatalogCapabilitySupport(
      descriptor.resume,
      "compat.catalog.resume"
    ),
    mcp: normalizeCatalogCapabilitySupport(
      descriptor.mcp,
      "compat.catalog.mcp"
    ),
    note: normalizeRequiredString(descriptor.note, "compat.catalog.note")
  };
}

function serializeCompatibilityProbeRuntime(
  runtime: CompatibilityProbeData["probe"]
): PublicCompatibilityProbeRuntime {
  return {
    runtime: normalizeRuntimeKind(runtime.runtime, "compat.probe.runtime"),
    supportTier: normalizeRequiredSupportTier(
      runtime.supportTier,
      "compat.probe.supportTier"
    ),
    guidanceFile: normalizeRequiredString(
      runtime.guidanceFile,
      "compat.probe.guidanceFile"
    ),
    projectConfig: normalizeRequiredString(
      runtime.projectConfig,
      "compat.probe.projectConfig"
    ),
    note: normalizeRequiredString(runtime.note, "compat.probe.note"),
    capabilities: serializeCompatibilityCapabilities(runtime.capabilities),
    adapterStatus: normalizeDoctorAdapterStatus(
      runtime.adapterStatus,
      "compat.probe.adapterStatus"
    ),
    probeStatus: normalizeProbeStatus(
      runtime.probeStatus,
      "compat.probe.probeStatus"
    ),
    diagnosis: {
      code: normalizeProbeDiagnosisCode(
        runtime.diagnosis.code,
        "compat.probe.diagnosis.code"
      ),
      summary: normalizeRequiredString(
        runtime.diagnosis.summary,
        "compat.probe.diagnosis.summary"
      )
    }
  };
}

function serializeCompatibilitySmokeRuntime(
  runtime: CompatibilitySmokeData["smoke"]
): PublicCompatibilitySmokeRuntime {
  return {
    runtime: normalizeRuntimeKind(runtime.runtime, "compat.smoke.runtime"),
    supportTier: normalizeRequiredSupportTier(
      runtime.supportTier,
      "compat.smoke.supportTier"
    ),
    guidanceFile: normalizeRequiredString(
      runtime.guidanceFile,
      "compat.smoke.guidanceFile"
    ),
    projectConfig: normalizeRequiredString(
      runtime.projectConfig,
      "compat.smoke.projectConfig"
    ),
    note: normalizeRequiredString(runtime.note, "compat.smoke.note"),
    capabilities: serializeCompatibilityCapabilities(runtime.capabilities),
    adapterStatus: normalizeDoctorAdapterStatus(
      runtime.adapterStatus,
      "compat.smoke.adapterStatus"
    ),
    smokeStatus: normalizeSmokeStatus(
      runtime.smokeStatus,
      "compat.smoke.smokeStatus"
    ),
    diagnosis: {
      code: normalizeSmokeDiagnosisCode(
        runtime.diagnosis.code,
        "compat.smoke.diagnosis.code"
      ),
      summary: normalizeRequiredString(
        runtime.diagnosis.summary,
        "compat.smoke.diagnosis.summary"
      )
    }
  };
}

function serializeCompatibilityCapabilities(
  capabilities: CompatibilityDoctorData["runtimes"][number]["capabilities"]
): PublicCompatibilityCapabilities {
  return {
    machineReadableMode: normalizeCompatibilityCapabilitySupport(
      capabilities.machineReadableMode,
      "capabilities.machineReadableMode"
    ),
    resume: normalizeCompatibilityCapabilitySupport(
      capabilities.resume,
      "capabilities.resume"
    ),
    mcp: normalizeCompatibilityCapabilitySupport(
      capabilities.mcp,
      "capabilities.mcp"
    ),
    sessionLifecycle: normalizeCompatibilityCapabilitySupport(
      capabilities.sessionLifecycle,
      "capabilities.sessionLifecycle"
    ),
    eventStreamParsing: normalizeCompatibilityCapabilitySupport(
      capabilities.eventStreamParsing,
      "capabilities.eventStreamParsing"
    )
  };
}

function serializeAttemptCreateRecord(
  manifest: AttemptManifest
): PublicAttemptCreateRecord {
  const serialized: PublicAttemptCreateRecord = {
    attemptId: normalizeRequiredString(manifest.attemptId, "attempt.attemptId"),
    taskId: normalizeRequiredString(manifest.taskId, "attempt.taskId"),
    runtime: normalizeRuntimeKind(manifest.runtime, "attempt.runtime"),
    adapter: normalizeRequiredString(manifest.adapter, "attempt.adapter"),
    status: normalizeAttemptStatus(manifest.status, "attempt.status")
  };

  assignOptionalAttemptFields(serialized, manifest);
  assignOptionalString(serialized, "baseRef", manifest.baseRef);
  assignOptionalString(serialized, "branch", manifest.branch);
  assignOptionalString(serialized, "repoRoot", manifest.repoRoot);
  assignOptionalString(serialized, "worktreePath", manifest.worktreePath);

  return serialized;
}

function serializeAttemptListRecord(
  manifest: AttemptManifest
): PublicAttemptListRecord {
  const serialized: PublicAttemptListRecord = {
    attemptId: normalizeRequiredString(manifest.attemptId, "attempt.attemptId"),
    taskId: normalizeRequiredString(manifest.taskId, "attempt.taskId"),
    runtime: normalizeRuntimeKind(manifest.runtime, "attempt.runtime"),
    adapter: normalizeRequiredString(manifest.adapter, "attempt.adapter"),
    status: normalizeAttemptStatus(manifest.status, "attempt.status")
  };

  assignOptionalAttemptFields(serialized, manifest);

  return serialized;
}

function serializeAttemptCleanupRecord(
  manifest: AttemptManifest
): PublicAttemptCleanupRecord {
  const serialized: PublicAttemptCleanupRecord = {
    attemptId: normalizeRequiredString(manifest.attemptId, "attempt.attemptId"),
    taskId: normalizeRequiredString(manifest.taskId, "attempt.taskId"),
    runtime: normalizeRuntimeKind(manifest.runtime, "attempt.runtime"),
    adapter: normalizeRequiredString(manifest.adapter, "attempt.adapter"),
    status: normalizeAttemptStatus(manifest.status, "attempt.status")
  };

  assignOptionalAttemptFields(serialized, manifest);
  assignOptionalString(serialized, "branch", manifest.branch);
  assignOptionalString(serialized, "repoRoot", manifest.repoRoot);
  assignOptionalString(serialized, "worktreePath", manifest.worktreePath);

  return serialized;
}

function assignOptionalAttemptFields(
  target:
    | PublicAttemptCreateRecord
    | PublicAttemptListRecord
    | PublicAttemptCleanupRecord,
  manifest: AttemptManifest
): void {
  assignOptionalString(
    target,
    "supportTier",
    normalizeOptionalSupportTier(manifest.supportTier, "attempt.supportTier")
  );
  assignOptionalString(
    target,
    "sourceKind",
    normalizeAttemptSourceKind(manifest.sourceKind, "attempt.sourceKind")
  );
  assignOptionalString(target, "parentAttemptId", manifest.parentAttemptId);
}

function assignOptionalString<T extends object>(
  target: T,
  key: keyof T,
  value: string | undefined
): void {
  if (value !== undefined) {
    target[key] = value as T[keyof T];
  }
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to be a non-empty string.`
    );
  }

  return value;
}

function normalizeCompatibilityCapabilitySupport(
  value: unknown,
  fieldName: string
): PublicCompatibilityCapabilitySupport {
  if (
    typeof value !== "string" ||
    !publicCompatibilityCapabilitySupportsSet.has(value)
  ) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to use the current public capability-support vocabulary.`
    );
  }

  return value as PublicCompatibilityCapabilitySupport;
}

function normalizeCatalogCapabilitySupport(
  value: unknown,
  fieldName: string
): PublicCompatibilityCatalogCapabilitySupport {
  if (
    typeof value !== "string" ||
    !publicCompatibilityCatalogCapabilitySupportsSet.has(value)
  ) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to use the current public catalog capability-support vocabulary.`
    );
  }

  return value as PublicCompatibilityCatalogCapabilitySupport;
}

function normalizeDoctorAdapterStatus(
  value: unknown,
  fieldName: string
): PublicCompatibilityDoctorAdapterStatus {
  if (
    typeof value !== "string" ||
    !publicCompatibilityDoctorAdapterStatusesSet.has(value)
  ) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to use the current public doctor adapter-status vocabulary.`
    );
  }

  return value as PublicCompatibilityDoctorAdapterStatus;
}

function normalizeProbeStatus(
  value: unknown,
  fieldName: string
): PublicCompatibilityProbeStatus {
  if (typeof value !== "string" || !publicCompatibilityProbeStatusesSet.has(value)) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to use the current public probe-status vocabulary.`
    );
  }

  return value as PublicCompatibilityProbeStatus;
}

function normalizeProbeDiagnosisCode(
  value: unknown,
  fieldName: string
): PublicCompatibilityProbeDiagnosisCode {
  if (
    typeof value !== "string" ||
    !publicCompatibilityProbeDiagnosisCodesSet.has(value)
  ) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to use the current public probe diagnosis-code vocabulary.`
    );
  }

  return value as PublicCompatibilityProbeDiagnosisCode;
}

function normalizeSmokeStatus(
  value: unknown,
  fieldName: string
): PublicCompatibilitySmokeStatus {
  if (typeof value !== "string" || !publicCompatibilitySmokeStatusesSet.has(value)) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to use the current public smoke-status vocabulary.`
    );
  }

  return value as PublicCompatibilitySmokeStatus;
}

function normalizeSmokeDiagnosisCode(
  value: unknown,
  fieldName: string
): PublicCompatibilitySmokeDiagnosisCode {
  if (
    typeof value !== "string" ||
    !publicCompatibilitySmokeDiagnosisCodesSet.has(value)
  ) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to use the current public smoke diagnosis-code vocabulary.`
    );
  }

  return value as PublicCompatibilitySmokeDiagnosisCode;
}

function normalizeRuntimeKind(
  value: unknown,
  fieldName: string
): PublicRuntimeKind {
  if (typeof value !== "string" || !publicRuntimeKindsSet.has(value)) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to use the current public runtime vocabulary.`
    );
  }

  return value as PublicRuntimeKind;
}

function normalizeRequiredSupportTier(
  value: unknown,
  fieldName: string
): PublicSupportTier {
  if (typeof value !== "string" || !publicSupportTiersSet.has(value)) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to use the current public support-tier vocabulary.`
    );
  }

  return value as PublicSupportTier;
}

function normalizeOptionalSupportTier(
  value: unknown,
  fieldName: string
): PublicSupportTier | undefined {
  if (value === undefined) {
    return undefined;
  }

  return normalizeRequiredSupportTier(value, fieldName);
}

function normalizeAttemptStatus(
  value: unknown,
  fieldName: string
): PublicAttemptStatus {
  if (typeof value !== "string" || !publicAttemptStatusesSet.has(value)) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to use the current public attempt-status vocabulary.`
    );
  }

  return value as PublicAttemptStatus;
}

function normalizeAttemptSourceKind(
  value: unknown,
  fieldName: string
): PublicAttemptSourceKind | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !publicAttemptSourceKindsSet.has(value)) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to use the current public attempt source-kind vocabulary when provided.`
    );
  }

  return value as PublicAttemptSourceKind;
}

function normalizeBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to be boolean.`
    );
  }

  return value;
}

function normalizeNullableBoolean(
  value: unknown,
  fieldName: string
): boolean | null {
  if (value === null) {
    return null;
  }

  return normalizeBoolean(value, fieldName);
}

function normalizeCleanupOutcome(
  value: unknown,
  fieldName: string
): PublicCleanupOutcome {
  if (typeof value !== "string" || !publicCleanupOutcomesSet.has(value)) {
    throw new ValidationError(
      `Public CLI serialization requires ${fieldName} to use the current public cleanup-outcome vocabulary.`
    );
  }

  return value as PublicCleanupOutcome;
}
