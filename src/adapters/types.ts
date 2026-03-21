import {
  capabilityStrengths,
  type ExecutionMode,
  type RuntimeKind,
  type SafetyIntent,
  type SupportTier
} from "../core/capabilities.js";
import type { SessionGuardrails, SessionSnapshot } from "../control-plane/types.js";
import type { AttemptSourceKind } from "../manifest/types.js";

export const adapterCapabilities = [
  "machineReadableMode",
  "resume",
  "mcp",
  "sessionLifecycle",
  "eventStreamParsing"
] as const;

export const adapterCapabilitySupports = [
  ...capabilityStrengths,
  "unsupported"
] as const;

export type AdapterCapability = (typeof adapterCapabilities)[number];
export type AdapterCapabilitySupport = (typeof adapterCapabilitySupports)[number];

export const canonicalAdapterEventKinds = [
  "message_delta",
  "message_completed",
  "run_completed",
  "error",
  "unknown"
] as const;

export type CanonicalAdapterEventKind =
  (typeof canonicalAdapterEventKinds)[number];

export interface AdapterDescriptor {
  capabilities: Record<AdapterCapability, AdapterCapabilitySupport>;
  guidanceFile: string;
  note: string;
  projectConfig: string;
  runtime: RuntimeKind;
  supportTier: SupportTier;
}

export interface RenderCommandInput {
  cwd?: string;
  executionMode?: ExecutionMode;
  prompt?: string;
  resumeSessionId?: string;
  safetyIntent?: SafetyIntent;
}

export interface RenderedCommand {
  args: string[];
  cwd?: string;
  executable: string;
  metadata: {
    executionMode: ExecutionMode;
    machineReadable: boolean;
    promptIncluded: boolean;
    resumeRequested: boolean;
    safetyIntent: SafetyIntent;
  };
  runtime: RuntimeKind;
}

export interface StructuredDegradation {
  canProceed: boolean;
  capability: AdapterCapability;
  fallback?: string;
  kind: "unsupported_capability";
  ok: false;
  reason: string;
  runtime: RuntimeKind;
  supported: false;
  note?: string;
}

export interface CanonicalAdapterEvent {
  index: number;
  kind: CanonicalAdapterEventKind;
  payload: unknown;
  rawType: string;
}

export interface HeadlessExecutionInput {
  abortSignal?: AbortSignal;
  attempt?: HeadlessExecutionAttemptLineage;
  cwd?: string;
  prompt: string;
  timeoutMs?: number;
}

export interface HeadlessExecutionAttemptLineage {
  attemptId: string;
  guardrails?: SessionGuardrails;
  parentAttemptId?: string;
  sourceKind?: AttemptSourceKind;
}

export interface HeadlessExecutionObservationUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface HeadlessExecutionObservation {
  errorEventCount: number;
  lastAgentMessage?: string;
  lastErrorMessage?: string;
  runCompleted: boolean;
  threadId?: string;
  turnStatus?: string;
  usage?: HeadlessExecutionObservationUsage;
}

export interface HeadlessExecutionResult {
  command: RenderedCommand;
  controlPlane?: HeadlessExecutionControlPlane;
  events: CanonicalAdapterEvent[];
  exitCode: number;
  observation: HeadlessExecutionObservation;
  stderr: string;
  stdout: string;
}

export interface HeadlessExecutionControlPlane {
  sessionSnapshot: SessionSnapshot;
}

export interface HeadlessExecutionAdapter {
  executeHeadless(
    input: HeadlessExecutionInput
  ): Promise<HeadlessExecutionResult>;
}

export interface RuntimeAdapter {
  readonly descriptor: AdapterDescriptor;

  detect(): boolean | Promise<boolean>;
  renderCommand(input?: RenderCommandInput): RenderedCommand;
  degradeUnsupportedCapability(
    capability: AdapterCapability
  ): StructuredDegradation;
  supportsCapability(capability: AdapterCapability): boolean;
}
