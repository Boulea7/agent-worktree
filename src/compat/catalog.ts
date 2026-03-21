import type { CapabilityDescriptor } from "../core/capabilities.js";

export const compatibilityCatalog: CapabilityDescriptor[] = [
  {
    tool: "claude-code",
    tier: "tier1",
    guidanceFile: "CLAUDE.md",
    projectConfig: ".claude/settings.json",
    machineReadableMode: "strong",
    resume: "strong",
    mcp: "strong",
    note: "Rich hook model and clear settings scopes."
  },
  {
    tool: "codex-cli",
    tier: "tier1",
    guidanceFile: "AGENTS.md",
    projectConfig: ".codex/config.toml",
    machineReadableMode: "strong",
    resume: "strong",
    mcp: "strong",
    note: "Most naturally aligned with root AGENTS.md."
  },
  {
    tool: "gemini-cli",
    tier: "tier1",
    guidanceFile: "GEMINI.md",
    projectConfig: ".gemini/settings.json",
    machineReadableMode: "strong",
    resume: "strong",
    mcp: "strong",
    note: "Strong extension and hook story."
  },
  {
    tool: "opencode",
    tier: "tier1",
    guidanceFile: "AGENTS.md",
    projectConfig: "opencode.json",
    machineReadableMode: "strong",
    resume: "strong",
    mcp: "strong",
    note: "Good plugin and server-oriented surface."
  },
  {
    tool: "openclaw",
    tier: "experimental",
    guidanceFile: "workspace prompt files",
    projectConfig: "gateway/workspace config",
    machineReadableMode: "partial",
    resume: "platform-oriented",
    mcp: "platform-oriented",
    note: "Better as a secondary adapter target."
  },
  {
    tool: "other-cli",
    tier: "experimental",
    guidanceFile: "generic mapping",
    projectConfig: "generic mapping",
    machineReadableMode: "varies",
    resume: "varies",
    mcp: "varies",
    note: "Use generic shell or native plugin adapters."
  }
];
