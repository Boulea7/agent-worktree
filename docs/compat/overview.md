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
- a public read-only `compat smoke <tool>` slice for bounded env-gated live smoke
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

Within that boundary, executable probing remains internal to the `codex-cli` execution helper.
It may resolve a different executable than shell `command -v codex` when `PATH` contains same-name shadow binaries, but that behavior is not part of the public adapter surface and must not be generalized into a runtime-wide command-resolution framework.
The public `compat probe codex-cli` surface may consume that internal policy only to emit a bounded public result such as `supported`, `unsupported`, or `error` plus a stable diagnosis code; it still must not expose executable paths or probing internals.
The public `compat smoke codex-cli` surface may consume the same bounded execution foundation only to emit a bounded env-gated live result such as `passed`, `failed`, `skipped`, or `error`; it still must not expose prompt, execution, or session internals.
Descriptor-only runtimes may still return `smokeStatus: "not_supported"` through the same read-only command surface, but that result does not apply to the current `codex-cli` implementation path.
The bounded parser also remains intentionally narrow: obvious non-JSON prelude lines, including bracket-prefixed log noise, may normalize to `unknown`, while malformed JSON-looking records still fail loudly.
The same boundary now allows a thin internal observation layer on top of canonical events, but that observation is still diagnostic execution metadata rather than a public session or persistence protocol.
The merged baseline also contains a deeper internal helper chain for runtime-state, runtime-context, spawn, wait, and close composition, including the current internal-only headless wait/close request projection seams and the downstream headless batch bridge through spawn-headless wait/close target-apply batches, but those helpers remain internal-only and are not a public lifecycle promise.

The first concrete reference path is intentionally narrow:

- `codex-cli` has the only concrete adapter implementation, and that implementation remains limited to detection, command rendering, bounded internal execution, parsing, degradation, and optional smoke scaffolding
- the public `doctor` command may report `codex-cli` as implemented and other runtimes as descriptor-only, but it MUST NOT imply that descriptor-only runtimes can execute inside `agent-worktree` today
- the public `compat probe` command may report a bounded per-runtime compatibility result, but it MUST NOT expose execution/session internals or imply lifecycle support
- the public `compat smoke` command may report a bounded env-gated live compatibility result for `codex-cli`, but it MUST NOT become a general execution CLI or imply lifecycle support
- any execution observation summaries remain internal to that bounded path and are not treated as a public compatibility promise
- other runtimes remain descriptor-level compatibility targets until a later execution-backed phase

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
