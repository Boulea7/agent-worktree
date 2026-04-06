# Claude Code

## Why It Is Tier 1

Claude Code is a first-class target because it has:

- project and local settings scopes
- project instruction files
- lifecycle hooks
- rich MCP support
- strong headless modes

## Shared Artifacts

Potential shared artifacts:

- `CLAUDE.md`
- `.claude/settings.json`
- `.claude/rules/*.md`

Local-only artifacts:

- `.claude/settings.local.json`
- user-home config
- auth state

## Role In `agent-worktree`

Claude Code should be treated as:

- a first-class runtime
- a first-class MCP-aware runtime
- a reference implementation for hook-driven workflows

Claude-specific hooks should not become the universal abstraction for every tool.

## Current `agent-worktree` Boundary

In the current Phase 4 compatibility baseline, Claude Code remains descriptor-only inside `agent-worktree`.

- `doctor` may report Claude Code in the Tier 1 catalog
- `compat probe claude-code` currently returns a descriptor-only / not-probed result
- public `compat smoke claude-code` remains available as a bounded read-only command, but descriptor-only coverage currently returns `smokeStatus: "not_supported"` with `diagnosis.code: "descriptor_only"`
- no public execution, wait, close, spawn, or lifecycle surface exists for Claude Code in `agent-worktree` today

This page describes why Claude Code remains a Tier 1 target and what it could eventually map to.
It does not mean that the current repository can execute Claude Code through a public adapter path yet.
