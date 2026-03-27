import type { CapabilityDescriptor } from "../core/capabilities.js";

export const compatibilityCatalog: CapabilityDescriptor[] = [
  {
    tool: "claude-code",
    tier: "tier1",
    guidanceFile: "CLAUDE.md",
    projectConfig: ".claude/settings.json",
    machineReadableMode: "unsupported",
    resume: "unsupported",
    mcp: "unsupported",
    note: "Rich hook model and clear settings scopes."
  },
  {
    tool: "codex-cli",
    tier: "tier1",
    guidanceFile: "AGENTS.md",
    projectConfig: ".codex/config.toml",
    machineReadableMode: "strong",
    resume: "unsupported",
    mcp: "unsupported",
    note: "Most naturally aligned with root AGENTS.md."
  },
  {
    tool: "gemini-cli",
    tier: "tier1",
    guidanceFile: "GEMINI.md",
    projectConfig: ".gemini/settings.json",
    machineReadableMode: "unsupported",
    resume: "unsupported",
    mcp: "unsupported",
    note: "Strong extension and hook story."
  },
  {
    tool: "opencode",
    tier: "tier1",
    guidanceFile: "AGENTS.md",
    projectConfig: "opencode.json",
    machineReadableMode: "unsupported",
    resume: "unsupported",
    mcp: "unsupported",
    note: "Good plugin and server-oriented surface."
  },
  {
    tool: "openclaw",
    tier: "experimental",
    guidanceFile: "workspace prompt files",
    projectConfig: "gateway/workspace config",
    machineReadableMode: "unsupported",
    resume: "unsupported",
    mcp: "unsupported",
    note: "Better as a secondary adapter target."
  },
  {
    tool: "other-cli",
    tier: "experimental",
    guidanceFile: "generic mapping",
    projectConfig: "generic mapping",
    machineReadableMode: "unsupported",
    resume: "unsupported",
    mcp: "unsupported",
    note: "Use generic shell or native plugin adapters."
  }
];
