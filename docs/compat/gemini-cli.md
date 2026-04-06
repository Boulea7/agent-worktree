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

## Current `agent-worktree` Boundary

In the current Phase 4 compatibility baseline, Gemini CLI remains descriptor-only inside `agent-worktree`.

- `doctor` may report Gemini CLI in the Tier 1 catalog
- `compat probe gemini-cli` currently returns a descriptor-only / not-probed result
- public `compat smoke gemini-cli` remains available as a bounded read-only command, but descriptor-only coverage currently returns `smokeStatus: "not_supported"` with `diagnosis.code: "descriptor_only"`
- no public execution, wait, close, spawn, or lifecycle surface exists for Gemini CLI in `agent-worktree` today

This page describes Gemini CLI as a Tier 1 compatibility target, not as a currently implemented public runtime path.
