# Codex CLI

## Why It Is Tier 1

Codex CLI is central to this project because it aligns closely with the intended architecture:

- `AGENTS.md` is native
- machine-readable execution is strong
- approvals and sandboxing are documented
- project config is explicit

## Shared Artifacts

Potential shared artifacts:

- `AGENTS.md`
- `.codex/config.toml`

Local-only artifacts:

- user-home Codex settings
- personal provider choices
- credentials

## Role In `agent-worktree`

Codex CLI is a natural baseline for:

- root guidance handling
- structured execution
- future worktree-oriented orchestration patterns

## Current Implementation Boundary

The current `codex-cli` adapter is intentionally limited to a public
compatibility surface plus bounded internal execution helpers.

Current public compatibility truth:

- `agent-worktree doctor` may report `codex-cli` as the only implemented runtime adapter
- `doctor` may report whether bounded `codex-cli` detection succeeds locally
- `agent-worktree compat probe codex-cli` may report a bounded public compatibility result for local `codex exec --json` support
- `agent-worktree compat smoke codex-cli` may report a bounded env-gated live smoke result for the fixed `codex exec --json` path
- that bounded public smoke path is the current Phase 4 closeout checkpoint for the first Tier 1 end-to-end compatibility promise
- `doctor`, `compat probe`, and `compat smoke` do not expose executable resolution, profile selection, env overlays, execution observation, or any internal control-plane metadata

Implemented now:

- a public `doctor` slice for compatibility diagnostics
- a public `compat probe codex-cli` slice for bounded compatibility diagnostics
- a public env-gated `compat smoke codex-cli` slice for bounded live smoke
- real detection for the `codex exec --json` path
- machine-checkable command rendering
- structured degradation for unsupported capabilities
- bounded internal execution through `codex exec --json`
- bounded internal profile-aware execution passthrough for explicit Codex `--profile` selection
- minimal canonical event parsing for the headless JSONL output
- internal execution observation summaries derived from canonical events
- an env-gated smoke scaffold for narrow compatibility probing

Additional bounded internal details:

- execution-time probing may scan `PATH` candidates to find a `codex` binary that actually supports `exec --json`
- the default subprocess runner may therefore execute a different resolved binary than shell `command -v codex`
- `renderCommand()` still renders `codex`; probing does not widen the public render contract
- bounded internal render and execution paths may pass an explicit profile name through `--profile`, but that profile selection remains internal-only, non-persistent, non-manifest-backed, and non-public
- that same restriction applies to any profile-aware execution metadata: it is not provider management, not a public CLI flag, not a public selector surface, and not lifecycle truth
- the default subprocess runner may still derive a best-effort relay-compatible env overlay from local Codex config, auth, or shell-export state, but custom runners do not silently inherit that overlay unless an internal caller explicitly supplies a replacement environment resolver
- obvious non-JSON prelude lines, including bracket-prefixed log noise such as `[warn] ...`, may normalize to `unknown`
- malformed JSON-looking records, including malformed bracket-prefixed array-like lines, still fail loudly
- `executeHeadless()` may return an internal observation summary such as thread identifier, final turn status, last agent message, usage, and error counts derived from canonical events
- `executeHeadless()` may also attach an internal session snapshot when the caller supplies attempt lineage metadata; that snapshot is derived from lineage plus canonical observation only
- the runtime manifest schema may still carry a bounded internal `session`
  block for execution metadata
- public CLI output does not expose that internal `session` metadata
- that internal `session` metadata does not imply attach/resume or
  lifecycle-control truth
- beyond that execution path, current internal continuation work is intentionally described by capability bucket rather than by fixed helper or module topology:
  - execution-derived state and read models built from attempt lineage, bounded execution observation, and optional internal session snapshots
  - runtime context and lifecycle-disposition metadata built from those existing internal read models
  - delegated-child or spawn-oriented preflight and composition metadata built from runtime context, lineage, and inherited guardrails
  - delegated or headless execution bridge metadata built from existing internal requests, apply results, or execution seeds
  - wait- and close-oriented preflight or consume-path metadata built from existing internal contexts, requests, and capability checks
- all of those buckets remain internal-only, derived, non-persistent, non-manifest-backed, and not lifecycle truth. They do not create public execution, spawn, wait, close, report, explanation, decision, or session-lifecycle surfaces.

Explicitly not implemented:


- `resume` rendering or execution
- MCP transport execution
- interactive session attach or stop behavior
- general public session lifecycle management
- public execution commands in `agent-worktree`
- public delegated-child or spawn surfaces in `agent-worktree`
- public `--profile` flags or public provider-selection semantics in `agent-worktree`
- public wait or close surfaces in `agent-worktree`
- provider, auth, or config-management writers for local Codex settings
- manifest-backed execution persistence
- session-tree control semantics such as wait, close, or delegated-child lifecycle

## Executable Probing Boundary

Executable probing is an internal helper policy for the bounded `codex-cli` execution slice.

- it exists to locate a `codex` binary that truly supports `codex exec --json`
- it is not a public adapter semantic
- it is not a generic command-resolution layer for other runtimes
- it does not change the `RenderedCommand` contract exposed by `renderCommand()`

The public `compat probe codex-cli` command may depend on that internal helper policy, but only to emit a sanitized compatibility result.
It must not expose the resolved executable path, PATH candidate order, or any raw subprocess details.
The public `compat smoke codex-cli` command may depend on the same bounded execution foundation, but only to emit a sanitized env-gated live smoke result for a fixed prompt and timeout.
It must not expose the fixed prompt text, resolved executable path, PATH candidate order, raw subprocess details, or internal observation metadata.

The current implementation keeps a narrow distinction between shell-visible resolution and execution-time resolution.
Internal debugging or direct-shell verification may therefore observe one path from `command -v codex` and another in bounded execution metadata when a same-name shadow binary appears earlier in `PATH`.
The public `compat probe` and `compat smoke` contract keeps that executable-resolution detail out of serialized output.

## Smoke Expectations

`codex-cli` smoke coverage is intentionally optional at this stage.

- smoke tests SHOULD be gated behind an environment variable such as `RUN_CODEX_SMOKE=1`
- public `compat smoke codex-cli` SHOULD use that same gate and return a bounded `skipped` result rather than failing when the gate is disabled
- smoke tests SHOULD confirm detection, bounded internal execution, and baseline parsing only
- internal smoke harnesses MAY include observation diagnostics for debugging, but the public `compat smoke` contract must keep those diagnostics out of serialized output
- smoke tests MUST NOT become the default validation path for the repository
- direct-shell invocation and the env-gated Vitest smoke harness MAY still be re-verified locally when they pass, but those local checks are operational evidence rather than durable public contract text
- the Vitest smoke harness remains narrower and should still be treated as a bounded secondary probe rather than a public reliability guarantee
- smoke output SHOULD help diagnose differences between shell-visible `codex` resolution and the final executed binary rather than assuming they are always identical
- that bounded public smoke path is sufficient for the current Phase 4 compatibility closeout, but it remains a compatibility checkpoint rather than a general execution or lifecycle promise
