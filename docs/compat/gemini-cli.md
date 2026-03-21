# Gemini CLI

## Why It Is Tier 1

Gemini CLI is a strong target because it documents:

- headless automation
- project/user/system config scopes
- hooks and extensions
- MCP support
- configurable instruction-file behavior

## Shared Artifacts

Potential shared artifacts:

- `GEMINI.md`
- `.gemini/settings.json`
- `.geminiignore`

Local-only artifacts:

- `.gemini/.env`
- user-home settings
- auth state

## Role In `agent-worktree`

Gemini CLI should be supported in a way that preserves one canonical shared rule source while still honoring Gemini-native conventions.
