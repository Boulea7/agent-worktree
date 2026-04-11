# Project Config

This document defines the intended public shape of the repository-level project config.

## File Name

The canonical shared project config is currently planned as:

- `agent-worktree.yaml`

Other tool-specific project configs may exist, but they are adapters, not the source of truth.

## Design Goals

- readable by humans
- generatable for tool adapters
- stable enough for future automation
- small core with room for extensions

## Intended Top-Level Shape

```yaml
version: "0.x"

compatibility:
  tier1:
    - claude-code
    - codex-cli
    - gemini-cli
    - opencode
  experimental:
    - openclaw

defaults:
  execution_mode: headless_event_stream
  safety_intent: workspace_write_with_approval

instructions:
  canonical_file: AGENTS.md
  tool_adapters:
    claude_code: CLAUDE.md
    gemini_cli: GEMINI.md

runtimes: {}
bootstrap: {}
verify: {}
policies: {}
extensions: {}
```

## Required Fields

- `version`

## Reserved Core Fields

- `compatibility`
- `defaults`
- `instructions`
- `runtimes`
- `bootstrap`
- `verify`
- `policies`

## Reserved Extension Field

- `extensions`

## Defaults Vocabulary

The current documented `defaults` vocabulary is intentionally small and
implementation-backed.

`execution_mode` MUST be one of:

- `headless_event_stream`
- `interactive_terminal`

`safety_intent` MUST be one of:

- `plan_readonly`
- `workspace_write_with_approval`
- `workspace_write_auto_edit`
- `full_access`

Values outside these vocabularies should be rejected rather than carried through
as open-ended strings.

Anything outside the reserved core fields should be treated as invalid until the spec says otherwise.

## Precedence Intent

The intended precedence model is:

1. built-in defaults
2. `agent-worktree.yaml`
3. environment variables
4. CLI flags

This is an intended direction, not a stable implementation promise yet.

Early implementations SHOULD start with only:

1. built-in defaults
2. `agent-worktree.yaml`

Environment-variable and CLI-flag precedence MAY be added later once the override contract is documented more precisely.

## Unknown Keys

In future implementation:

- unknown keys at the top level should be rejected
- unknown keys under `extensions` may be tolerated

Early implementations SHOULD prefer strict validation for reserved core namespaces and use `extensions` as the only intentionally open-ended top-level namespace.

## Out Of Scope For v1 Docs

- automatic migration semantics
- plugin-specific config schemas
- provider credential formats
- user-home config conventions
