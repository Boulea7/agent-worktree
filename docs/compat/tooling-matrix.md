# Tooling Matrix

This matrix reflects the current research synthesis, not implementation reality.

The matrix describes tool-level potential, not the currently implemented `agent-worktree` adapter surface.
At the current repository boundary, only `codex-cli` has a concrete adapter, and even that adapter should be read as a bounded internal execution contract plus an env-gated smoke scaffold rather than full resume or MCP support.

| Tool | Tier | Guidance file | Project config | Machine-readable mode | Resume | MCP | Distinguishing note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Claude Code | Tier 1 | `CLAUDE.md` and `.claude/` rules | `.claude/settings.json` | Strong | Strong | Strong | Rich hook model and clear settings scopes |
| Codex CLI | Tier 1 | `AGENTS.md` | `.codex/config.toml` | Strong | Strong | Strong | Most naturally aligned with root `AGENTS.md`, but the implemented adapter remains narrower than the tool-level potential |
| Gemini CLI | Tier 1 | `GEMINI.md` or configured `AGENTS.md` | `.gemini/settings.json` | Strong | Strong | Strong | Strong extension and hook story |
| OpenCode | Tier 1 | `AGENTS.md` | `opencode.json` | Strong | Strong | Strong | Good plugin and server-oriented surface |
| OpenClaw | Experimental | workspace prompt files | gateway/workspace config | Partial | Platform-oriented | Platform-oriented | Better as a secondary adapter target |
| Other CLIs | Experimental | generic mapping | generic mapping | Varies | Varies | Varies | Use generic shell or native plugin adapters |

## Cross-Tool Conclusions

- `AGENTS.md` is the strongest shared baseline for Codex CLI and OpenCode.
- Claude Code and Gemini CLI justify thin compatibility files because they have first-class tool-specific conventions.
- OpenClaw is worth documenting now, but not promising as a first public runtime target.
- The future platform should reason in capabilities, not brands.
