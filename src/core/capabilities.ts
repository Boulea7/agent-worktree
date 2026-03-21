export const runtimeKinds = [
  "claude-code",
  "codex-cli",
  "gemini-cli",
  "opencode",
  "openclaw",
  "other-cli"
] as const;

export const supportTiers = ["tier1", "experimental"] as const;

export const executionModes = [
  "headless_event_stream",
  "interactive_terminal"
] as const;

export const safetyIntents = [
  "plan_readonly",
  "workspace_write_with_approval",
  "workspace_write_auto_edit",
  "full_access"
] as const;

export const capabilityStrengths = [
  "strong",
  "partial",
  "varies",
  "platform-oriented"
] as const;

export type RuntimeKind = (typeof runtimeKinds)[number];
export type SupportTier = (typeof supportTiers)[number];
export type ExecutionMode = (typeof executionModes)[number];
export type SafetyIntent = (typeof safetyIntents)[number];
export type CapabilityStrength = (typeof capabilityStrengths)[number];

export interface CapabilityDescriptor {
  tool: RuntimeKind;
  tier: SupportTier;
  guidanceFile: string;
  projectConfig: string;
  machineReadableMode: CapabilityStrength;
  resume: CapabilityStrength;
  mcp: CapabilityStrength;
  note: string;
}

export const defaultExecutionMode: ExecutionMode = "headless_event_stream";
export const defaultSafetyIntent: SafetyIntent =
  "workspace_write_with_approval";
