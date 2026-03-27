import type {
  CompatibilityDoctorData
} from "../compat/doctor.js";
import type {
  CompatibilityProbeData
} from "../compat/probe.js";
import type {
  CompatibilitySmokeData
} from "../compat/smoke.js";
import type { CapabilityStrength } from "../core/capabilities.js";

type CompatibilityCapabilities =
  CompatibilityDoctorData["runtimes"][number]["capabilities"];

export const publicRuntimeKinds = [
  "claude-code",
  "codex-cli",
  "gemini-cli",
  "opencode",
  "openclaw",
  "other-cli"
] as const;

export const publicSupportTiers = ["tier1", "experimental"] as const;

export const publicCompatibilityCapabilitySupports = [
  "strong",
  "partial",
  "varies",
  "platform-oriented",
  "unsupported"
] as const;

export const publicCompatibilityCatalogCapabilitySupports = [
  "strong",
  "partial",
  "varies",
  "platform-oriented",
  "unsupported"
] as const satisfies readonly CapabilityStrength[];

export const publicCompatibilityDoctorAdapterStatuses = [
  "implemented",
  "descriptor_only"
] as const;

export const publicCompatibilityProbeStatuses = [
  "supported",
  "unsupported",
  "not_probed",
  "error"
] as const;

export const publicCompatibilityProbeDiagnosisCodes = [
  "exec_json_supported",
  "exec_json_unavailable",
  "descriptor_only",
  "probe_error"
] as const;

export const publicCompatibilitySmokeStatuses = [
  "passed",
  "failed",
  "skipped",
  "not_supported",
  "error"
] as const;

export const publicCompatibilitySmokeDiagnosisCodes = [
  "smoke_passed",
  "gate_disabled",
  "descriptor_only",
  "detect_unavailable",
  "execution_failed",
  "unexpected_error"
] as const;

export const publicAttemptStatuses = [
  "created",
  "running",
  "paused",
  "failed",
  "verified",
  "merged",
  "cleaned"
] as const;

export const publicAttemptSourceKinds = [
  "direct",
  "resume",
  "fork",
  "delegated"
] as const;

export const publicCleanupOutcomes = [
  "removed",
  "already_cleaned",
  "missing_worktree_converged"
] as const;

export type PublicRuntimeKind = (typeof publicRuntimeKinds)[number];
export type PublicSupportTier = (typeof publicSupportTiers)[number];
export type PublicCompatibilityCapabilitySupport =
  (typeof publicCompatibilityCapabilitySupports)[number];
export type PublicCompatibilityCatalogCapabilitySupport =
  (typeof publicCompatibilityCatalogCapabilitySupports)[number];
export type PublicCompatibilityDoctorAdapterStatus =
  (typeof publicCompatibilityDoctorAdapterStatuses)[number];
export type PublicCompatibilityProbeStatus =
  (typeof publicCompatibilityProbeStatuses)[number];
export type PublicCompatibilityProbeDiagnosisCode =
  (typeof publicCompatibilityProbeDiagnosisCodes)[number];
export type PublicCompatibilitySmokeStatus =
  (typeof publicCompatibilitySmokeStatuses)[number];
export type PublicCompatibilitySmokeDiagnosisCode =
  (typeof publicCompatibilitySmokeDiagnosisCodes)[number];
export type PublicAttemptStatus = (typeof publicAttemptStatuses)[number];
export type PublicAttemptSourceKind = (typeof publicAttemptSourceKinds)[number];
export type PublicCleanupOutcome = (typeof publicCleanupOutcomes)[number];

export interface PublicCompatibilityCapabilities {
  eventStreamParsing: PublicCompatibilityCapabilitySupport;
  machineReadableMode: PublicCompatibilityCapabilitySupport;
  mcp: PublicCompatibilityCapabilitySupport;
  resume: PublicCompatibilityCapabilitySupport;
  sessionLifecycle: PublicCompatibilityCapabilitySupport;
}

export interface PublicCompatibilityDoctorRuntime {
  adapterStatus: PublicCompatibilityDoctorAdapterStatus;
  capabilities: PublicCompatibilityCapabilities;
  detected: boolean | null;
  guidanceFile: string;
  note: string;
  projectConfig: string;
  runtime: PublicRuntimeKind;
  supportTier: PublicSupportTier;
}

export interface PublicCompatibilityDoctorData {
  runtimes: PublicCompatibilityDoctorRuntime[];
}

export interface PublicCompatibilityCatalogRecord {
  guidanceFile: string;
  machineReadableMode: PublicCompatibilityCatalogCapabilitySupport;
  mcp: PublicCompatibilityCatalogCapabilitySupport;
  note: string;
  projectConfig: string;
  resume: PublicCompatibilityCatalogCapabilitySupport;
  tier: PublicSupportTier;
  tool: PublicRuntimeKind;
}

export interface PublicCompatibilityListData {
  tools: PublicCompatibilityCatalogRecord[];
}

export interface PublicCompatibilityShowData {
  tool: PublicCompatibilityCatalogRecord;
}

export interface PublicCompatibilityProbeDiagnosis {
  code: PublicCompatibilityProbeDiagnosisCode;
  summary: string;
}

export interface PublicCompatibilityProbeRuntime {
  adapterStatus: PublicCompatibilityDoctorAdapterStatus;
  capabilities: PublicCompatibilityCapabilities;
  diagnosis: PublicCompatibilityProbeDiagnosis;
  guidanceFile: string;
  note: string;
  probeStatus: PublicCompatibilityProbeStatus;
  projectConfig: string;
  runtime: PublicRuntimeKind;
  supportTier: PublicSupportTier;
}

export interface PublicCompatibilityProbeData {
  probe: PublicCompatibilityProbeRuntime;
}

export interface PublicCompatibilitySmokeDiagnosis {
  code: PublicCompatibilitySmokeDiagnosisCode;
  summary: string;
}

export interface PublicCompatibilitySmokeRuntime {
  adapterStatus: PublicCompatibilityDoctorAdapterStatus;
  capabilities: PublicCompatibilityCapabilities;
  diagnosis: PublicCompatibilitySmokeDiagnosis;
  guidanceFile: string;
  note: string;
  projectConfig: string;
  runtime: PublicRuntimeKind;
  smokeStatus: PublicCompatibilitySmokeStatus;
  supportTier: PublicSupportTier;
}

export interface PublicCompatibilitySmokeData {
  smoke: PublicCompatibilitySmokeRuntime;
}

export interface PublicAttemptCreateRecord {
  adapter: string;
  attemptId: string;
  baseRef?: string;
  branch?: string;
  parentAttemptId?: string;
  repoRoot?: string;
  runtime: PublicRuntimeKind;
  sourceKind?: PublicAttemptSourceKind;
  status: PublicAttemptStatus;
  supportTier?: PublicSupportTier;
  taskId: string;
  worktreePath?: string;
}

export interface PublicAttemptCreateData {
  attempt: PublicAttemptCreateRecord;
}

export interface PublicAttemptListRecord {
  adapter: string;
  attemptId: string;
  parentAttemptId?: string;
  runtime: PublicRuntimeKind;
  sourceKind?: PublicAttemptSourceKind;
  status: PublicAttemptStatus;
  supportTier?: PublicSupportTier;
  taskId: string;
}

export interface PublicAttemptListData {
  attempts: PublicAttemptListRecord[];
}

export interface PublicAttemptCleanupRecord {
  adapter: string;
  attemptId: string;
  branch?: string;
  parentAttemptId?: string;
  repoRoot?: string;
  runtime: PublicRuntimeKind;
  sourceKind?: PublicAttemptSourceKind;
  status: PublicAttemptStatus;
  supportTier?: PublicSupportTier;
  taskId: string;
  worktreePath?: string;
}

export interface PublicAttemptCleanupData {
  attempt: PublicAttemptCleanupRecord;
  cleanup: {
    outcome: PublicCleanupOutcome;
    worktreeRemoved: boolean;
  };
}
