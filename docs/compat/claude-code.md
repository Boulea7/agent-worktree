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
