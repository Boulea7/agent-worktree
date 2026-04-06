# OpenCode

## Why It Is Tier 1

OpenCode is first-class because it is already repository-friendly:

- `AGENTS.md` is native
- project config is explicit
- plugin, skills, and server concepts are documented
- it is positioned as an open coding agent

## Shared Artifacts

Potential shared artifacts:

- `AGENTS.md`
- `opencode.json`
- `.opencode/agents/**`
- `.opencode/skills/**`

Local-only artifacts:

- user-home config
- credentials
- workstation-specific preferences

## Role In `agent-worktree`

OpenCode is especially useful as a reference for future plugin and local-agent asset design.

## Current `agent-worktree` Boundary

In the current Phase 4 compatibility baseline, OpenCode remains descriptor-only inside `agent-worktree`.

- `doctor` may report OpenCode in the Tier 1 catalog
- `compat probe opencode` currently returns a descriptor-only / not-probed result
- public `compat smoke opencode` remains available as a bounded read-only command, but descriptor-only coverage currently returns `smokeStatus: "not_supported"` with `diagnosis.code: "descriptor_only"`
- no public execution, wait, close, spawn, or lifecycle surface exists for OpenCode in `agent-worktree` today

This page describes why OpenCode remains a Tier 1 target and what a future adapter may want to preserve.
It does not mean that the current repository can execute OpenCode through a public compatibility path yet.
