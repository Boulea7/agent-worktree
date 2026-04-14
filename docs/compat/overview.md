# Compatibility Overview

## Philosophy

`agent-worktree` should normalize intent-level behavior, not vendor-specific primitives.

That means:

- one canonical guidance model
- one capability vocabulary
- many outward adapters

## Current Phase 4 Compatibility Baseline

The repository now sits on top of a thin Phase 2 worktree slice and a thin Phase 3 internal adapter foundation.
The current public compatibility baseline is the Phase 4 closeout slice, and it is still intentionally thin.

The currently implemented boundary is expected to cover:

- a public read-only `doctor` slice for compatibility diagnostics
- a public read-only `compat probe <tool>` slice for bounded per-runtime probing
- a public env-gated `compat smoke <tool>` slice for bounded live compatibility smoke
- explicit allow-list JSON serializers for the current public machine-readable compatibility and attempt lifecycle outputs
- an explicit public cleanup-outcome vocabulary for `attempt cleanup --json`
- adapter descriptors derived from the shared capability vocabulary
- capability-first runtime resolution
- machine-checkable command rendering contracts
- structured degradation for unsupported capabilities
- real `codex-cli` detection for the `codex exec --json` path
- a bounded internal `codex exec --json` execution contract
- minimal canonical event parsing for the `codex-cli` headless path
- internal execution observation summaries derived from canonical events
- an env-gated smoke scaffold for narrow compatibility probing

That baseline now satisfies the current Phase 4 exit criteria:

- `compat smoke codex-cli` establishes the current bounded public compatibility checkpoint for one Tier 1 runtime
- `doctor` and `compat probe` keep the remaining Tier 1 runtimes on explicit and accurate descriptor-only support boundaries

In the current implementation, the only concrete execution-backed probe path is `codex-cli`.
Within that boundary, executable probing remains internal to the `codex-cli` execution helper.
It may resolve a different executable than shell `command -v codex` when `PATH` contains same-name shadow binaries, but that behavior is not part of the public adapter surface and must not be generalized into a runtime-wide command-resolution framework.
The public `compat probe codex-cli` surface may consume that internal policy only to emit a bounded public result such as `supported`, `unsupported`, or `error` plus a stable diagnosis code; it still must not expose executable paths or probing internals.
The public `compat smoke codex-cli` surface may consume the same bounded execution foundation only to emit a bounded env-gated live result such as `passed`, `failed`, `skipped`, or `error`; it still must not expose prompt, execution, or session internals.
Descriptor-only runtimes may still return `smokeStatus: "not_supported"` through the same bounded compatibility command surface, but that result does not apply to the current `codex-cli` implementation path.
The bounded parser also remains intentionally narrow: obvious non-JSON prelude lines, including bracket-prefixed log noise, may normalize to `unknown`, while malformed JSON-looking records still fail loudly.
The same boundary now allows a thin internal observation layer on top of canonical events, but that observation is still diagnostic execution metadata rather than a public session or persistence protocol.
The merged baseline also contains deeper internal-only composition across runtime-state, runtime-context, spawn, wait, and close seams, plus the current internal-only selection closeout chain across report-ready, grouped reporting, closure, and closeout-decision helpers.
That current internal continuation now sits above the current Phase 5 internal closeout baseline as bounded-parallelism Phase 6 prep, but those helpers remain internal-only implementation detail and do not widen the public compatibility, lifecycle, or execution promise. The default `selection` barrel remains empty, and the default `control-plane` barrel remains limited to the current read-only foundational session helpers.

The first concrete reference path is intentionally narrow:

- `codex-cli` has the only concrete adapter implementation, and that implementation remains limited to detection, command rendering, bounded internal execution, parsing, degradation, and optional smoke scaffolding
- the public `doctor` command may report `codex-cli` as implemented and other runtimes as descriptor-only, but it MUST NOT imply that descriptor-only runtimes can execute inside `agent-worktree` today
- the public `compat probe` command may report a bounded per-runtime compatibility result, but it MUST NOT expose execution/session internals or imply lifecycle support
- the public `compat smoke` command may report a bounded env-gated live compatibility result for `codex-cli`, but it MUST NOT become a general execution CLI or imply lifecycle support
- any execution observation summaries remain internal to that bounded path and are not treated as a public compatibility promise
- other runtimes remain descriptor-level compatibility targets until a later execution-backed phase

In the current baseline, only `codex-cli` has an execution-backed live smoke path.
Other runtimes may still share the same public `compat smoke <tool>` command shape, but they remain descriptor-only and should resolve to bounded non-execution results such as `not_supported`.

The public CLI tree in this phase may still include explicit `NOT_IMPLEMENTED`
placeholders such as `init`, `attempt attach`, `attempt stop`, `attempt checkpoint`,
and `attempt merge`. Those placeholders are command-surface stubs only; they do
not broaden the implemented compatibility or lifecycle baseline described here.
Within the existing JSON contract, `compat list` and `compat show` intentionally keep the catalog field name `tier`, while `doctor`, `compat probe`, `compat smoke`, and attempt-facing payloads use `supportTier`. That split is part of the current public surface: replacing one with the other would be a breaking change, while emitting both would widen the public payload shape.

Adapter descriptors in this phase are expected to describe only the capabilities implemented by the thin adapter foundation itself.
They must not be treated as a one-to-one copy of the broader tool-level compatibility matrix.

It is still not expected to cover:

- session attach, stop, or resume behavior
- interactive runtime control
- general subprocess orchestration beyond the bounded internal `codex-cli` path
- MCP transport execution
- public execution CLI commands
- manifest-backed execution persistence
- internal observation summaries promoted into manifest-backed lifecycle state

That deferred persistence scope does not forbid a durable audit manifest or bounded internal session metadata; it only means public execution/session persistence semantics are not implemented in this phase.
Compatibility docs in this phase still describe mapping and support boundaries first. The `compat smoke codex-cli` surface is a bounded env-gated live compatibility checkpoint rather than a general execution promise, and the Vitest smoke harness remains narrower and is not the repository's default validation path.

## Support Tiers

### Tier 1

First-class targets:

- Claude Code
- Codex CLI
- Gemini CLI
- OpenCode

Tier 1 means the repository should maintain:

- explicit compatibility docs
- public mapping rules
- explicit support-boundary reporting
- at least one bounded public end-to-end compatibility checkpoint for an implemented Tier 1 runtime in the current baseline
- future smoke-test expectations

### Experimental

Documented but lower-commitment targets:

- OpenClaw
- other coding-agent CLIs

Experimental means:

- best-effort compatibility
- smaller guaranteed surface
- explicit caveats in docs

## What We Normalize

The future implementation should normalize:

- execution mode
- session lifecycle
- safety intent
- project guidance
- machine-readable output
- MCP and extension capabilities

In the current Phase 4 baseline, the normalized public layer is still intentionally narrow.
The only implemented execution-backed compatibility path is the bounded public `compat smoke codex-cli` surface, backed by the bounded internal `codex-cli` path.
Runtime lifecycle behavior, cross-runtime parity, and broader execution surfaces remain future work even when a runtime has a documented adapter descriptor.

## Canonical Shared Guidance

For this repository, canonical committed truth starts with `SPEC.md`, then `README.md`, then `docs/index.md`. Use `AGENTS.md` as the repository-specific execution rules and boundary companion rather than as a replacement for that committed doc set.

Thin compatibility files such as `CLAUDE.md` and `GEMINI.md` exist to help specific tools without creating duplicated policy.

## Related

- [docs/index.md](../index.md)
- [ROADMAP.md](../../ROADMAP.md)
- [docs/maintainers/development-phases.md](../maintainers/development-phases.md)
