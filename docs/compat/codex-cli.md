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

The current `codex-cli` adapter is intentionally limited.

Implemented now:

- real detection for the `codex exec --json` path
- machine-checkable command rendering
- bounded internal execution through `codex exec --json`
- minimal canonical event parsing for the headless JSONL output
- internal execution observation summaries derived from canonical events
- structured degradation for unsupported capabilities
- an env-gated smoke scaffold for narrow compatibility probing

Additional bounded internal details:

- execution-time probing may scan `PATH` candidates to find a `codex` binary that actually supports `exec --json`
- the default subprocess runner may therefore execute a different resolved binary than shell `command -v codex`
- `renderCommand()` still renders `codex`; probing does not widen the public render contract
- obvious non-JSON prelude lines, including bracket-prefixed log noise such as `[warn] ...`, may normalize to `unknown`
- malformed JSON-looking records, including malformed bracket-prefixed array-like lines, still fail loudly
- `executeHeadless()` may return an internal observation summary such as thread identifier, final turn status, last agent message, usage, and error counts derived from canonical events
- `executeHeadless()` may also attach an internal session snapshot when the caller supplies attempt lineage metadata; that snapshot is derived from lineage plus canonical observation only
- a separate internal helper layer may derive execution-session records or indexes from attempt lineage, bounded execution observation, and optional internal session snapshots
- a separate internal read-model helper layer may build selector-driven or parent/child execution-session views from those derived records
- a separate internal runtime-context helper layer may derive single-consumer execution-session contexts from the internal runtime-state read model for future internal wait/close-oriented consumers
- a separate internal wait-readiness helper layer may derive wait preconditions or blocking reasons from runtime-context for future internal wait-oriented consumers
- that observation summary is adapter-internal only: it is not a public CLI payload contract, not manifest-backed state, and not a session-lifecycle API
- the same restriction applies to any derived internal session snapshot: it is not a public CLI payload, not manifest-backed state, and not attach/resume/wait/close support
- the same restriction applies to any derived execution-session record or index: it is not a public CLI payload, not manifest-backed state, and not lifecycle support
- the same restriction applies to any derived execution-session read model: it is query-only internal metadata, not a mutable registry, public selector surface, or lifecycle manager
- the same restriction applies to any derived execution-session context: it is internal-only, non-persistent, non-manifest-backed metadata and does not imply public selectors or lifecycle support
- the same restriction applies to any derived wait-readiness metadata: it is internal-only, non-persistent, non-manifest-backed preflight state and does not imply actual wait support, close support, or public selectors

Explicitly not implemented:

- `resume` rendering or execution
- MCP transport execution
- interactive session attach or stop behavior
- general session lifecycle management
- public execution commands in `agent-worktree`
- manifest-backed execution persistence
- session-tree control semantics such as wait, close, or delegated-child lifecycle

## Executable Probing Boundary

Executable probing is an internal helper policy for the bounded `codex-cli` execution slice.

- it exists to locate a `codex` binary that truly supports `codex exec --json`
- it is not a public adapter semantic
- it is not a generic command-resolution layer for other runtimes
- it does not change the `RenderedCommand` contract exposed by `renderCommand()`

The current implementation keeps a narrow distinction between shell-visible resolution and execution-time resolution.
That is why a smoke run may report one path from `command -v codex` and a different path in `result.command.executable`.
This difference is expected when a same-name shadow binary appears earlier in `PATH`.

## Smoke Expectations

`codex-cli` smoke coverage is intentionally optional at this stage.

- smoke tests SHOULD be gated behind an environment variable such as `RUN_CODEX_SMOKE=1`
- smoke tests SHOULD confirm detection, bounded internal execution, and baseline parsing only
- smoke output MAY include internal observation diagnostics for debugging, but those diagnostics remain non-contractual
- smoke tests MUST NOT become the default validation path for the repository
- direct-shell invocation and the env-gated Vitest smoke harness were both re-verified successfully in this workspace on 2026-03-21
- the Vitest smoke harness remains narrower and should still be treated as a bounded secondary probe rather than a public reliability guarantee
- smoke output SHOULD help diagnose differences between shell-visible `codex` resolution and the final executed binary rather than assuming they are always identical
