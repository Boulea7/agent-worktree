# agent-worktree Shared Instructions

This file is the canonical, committed instruction source for repository-aware coding agents.

## Project Purpose

`agent-worktree` is building a git-native orchestration layer for coding agents that:

- uses isolated worktrees as the scheduling primitive
- treats deterministic validation as the selection primitive
- stays compatible with multiple agent tools instead of locking to one vendor

## Current Phase

This repository is in an early implementation phase.
This repository now has a usable Git `HEAD` baseline, so maintainer workflows should prefer non-destructive worktree isolation and commit-backed checkpoints for each completed thin slice.

Agents working in this repository should prioritize:

1. contract fidelity for config, manifests, and machine-readable CLI behavior
2. test coverage and deterministic validation
3. thin worktree lifecycle slices before richer runtime orchestration
4. explicit public/private doc boundaries

The currently implemented Phase 2 slice includes:

- `attempt create`
- `attempt list`
- safety-first `attempt cleanup`

The current thin Phase 3 foundation also includes:

- static adapter descriptors derived from the shared compatibility vocabulary
- capability-first adapter resolution
- render-only command contracts for the initial `codex-cli` reference adapter
- structured degradation for unsupported adapter capabilities
- a bounded internal `codex-cli` execution contract for detect, `codex exec --json`, minimal canonical event parsing, and an env-gated smoke scaffold
- a bounded internal `codex-cli` profile-aware execution path that may pass an explicit `--profile` through project-managed `codex exec --json` calls without becoming provider management, a public CLI surface, or manifest-backed state
- a bounded internal `codex-cli` relay-compatible execution-env helper that may derive subprocess env overlays from local Codex config, auth, or shell-export state without becoming a public provider-management contract
- a minimal internal session-tree/control-plane foundation derived from attempt provenance and bounded execution observation, implemented as pure helpers only
- a bounded internal execution-to-control-plane bridge for `codex-cli`, where supplied attempt lineage may derive an internal session snapshot in the execution result
- a minimal internal runtime-state foundation that may derive execution-session records and indexes from lineage, observation, and optional internal session snapshots without persisting them
- a minimal internal runtime-state read model that may build queryable execution-session views from derived records without becoming a lifecycle manager or registry
- a minimal internal runtime-context layer that may derive a single-consumer execution-session context from the runtime-state read model without becoming lifecycle control, persistence, or runtime truth
- a minimal internal lifecycle-disposition layer that may derive shared terminal/session-known/descendant-impact facts from runtime-context without becoming lifecycle truth
- a minimal internal spawn-readiness layer that may derive guardrail-aware delegated-child preflight blockers from runtime-context plus runtime-state views without becoming actual spawn support, public selectors, or lifecycle truth
- a minimal internal spawn-candidate layer that may compose an existing execution-session context plus spawn-readiness into a single-consumer internal object without becoming actual spawn support, public selectors, or lifecycle truth
- a minimal internal spawn-target layer that may project a minimal internal spawn-oriented target from an existing spawn-candidate without becoming actual spawn support, public selectors, or lifecycle truth
- a minimal internal spawn-request layer that may compose an existing spawn-capable candidate plus an explicit child source choice and optional inherited guardrails into a future internal spawn-oriented request object without becoming actual spawn support, public selectors, or lifecycle truth
- a minimal internal spawn-lineage layer that may derive additive child attempt lineage from a spawn-request plus an explicit child attempt identifier without becoming actual spawn support, manifest-backed lifecycle truth, public selectors, or child-planning semantics
- a minimal internal wait-readiness layer that may derive wait preconditions and blocking reasons from runtime-context without becoming actual wait support, close support, public selectors, or lifecycle truth
- a minimal internal wait-candidate layer that may combine runtime-context and wait-readiness into a single derived object for future internal wait-oriented consumers without becoming actual wait support, close support, public selectors, or lifecycle truth
- a minimal internal wait-target layer that may derive a future internal wait-oriented target from an existing wait-candidate without becoming actual wait support, close support, public selectors, or lifecycle truth
- a minimal internal wait-request layer that may compose an existing wait-target plus explicit wait constraints such as `timeoutMs` into a future internal wait-oriented request object without becoming actual wait support, public selectors, persistence, or lifecycle truth
- a minimal internal wait-consumer preflight layer that may compose an existing wait-request plus capability-aware readiness into a future internal wait-oriented consumer object without becoming actual wait support, public selectors, persistence, or lifecycle truth
- a minimal internal close-oriented helper chain that may derive capability-aware close-readiness, close-candidates, minimal close-targets, target-based close-requests, close-requested or close-recorded lifecycle markers, close-consumer preflight metadata, a minimal internal close-consume helper driven by an explicitly injected invoker, and a minimal internal close-consume-batch helper that consumes an explicit list of existing close-consumers through that same invoker without becoming actual close support, public selectors, or lifecycle truth

Cleanup is expected to keep manifests as audit records, target a single `attemptId`, and fail loudly on invalid manifests or unsafe path conditions.

Do not assume advanced runtime orchestration exists yet.
The current adapter layer only launches a bounded internal execution path for `codex-cli`.
It does not provide interactive runtime control, attach or resume behavior, general session lifecycle management, MCP transport execution, manifest-backed execution persistence, or public spawn/wait/close semantics.
Treat the current smoke coverage as an optional compatibility probe only: the narrower env-gated Vitest harness currently passes in this workspace, but it still remains non-default validation rather than a public reliability guarantee and may stay green even when a real `codex exec --json` success baseline is unavailable locally.
Treat executable probing the same way: it is an internal `codex-cli` execution-helper detail used to locate a `codex` binary that really supports `exec --json`, not a generic runtime-resolution framework or a public adapter guarantee.
Treat internal `codex-cli` profile-aware execution the same way: it may best-effort pass an explicit profile name through bounded internal render or execution paths so future internal consumers can select an existing Codex profile, but it must remain internal-only, non-persistent, non-manifest-backed, non-public, and must not become provider management, a config-management surface, a public selector, or a public CLI contract.
Treat relay-compatible execution-env derivation the same way: it may best-effort derive subprocess env overlays from local Codex config, auth, or shell-export state so OpenAI-compatible relays remain usable for internal `codex exec --json` calls, but it must remain internal-only, non-persistent, non-public, and must not become a public provider switcher, a config-management surface, or a promise that direct shell sessions are repaired automatically.
That env-overlay boundary remains narrow even when profile-aware execution is present: the default runner path may still derive a best-effort home-based env overlay, but custom runners must not silently inherit that overlay unless an internal caller explicitly supplies a replacement environment resolver.
The bounded parser may preserve obvious non-JSON prelude lines, including bracket-prefixed log noise, as `unknown` events, but malformed JSON-looking records still remain loud failures.
The current manifest layer may also record thin attempt provenance through `sourceKind` and an optional `parentAttemptId`. Treat those fields as additive audit metadata only; they do not imply delegated execution, fork/resume runtime support, or session-tree lifecycle behavior.
The current internal control-plane layer may derive node references, lifecycle summaries, and parent/child indexes from provenance and observation, but those derived values are non-persistent and must not be written into `manifest.session` or exposed as public CLI contract.
The current `codex-cli` execution path may consume supplied attempt lineage and attach an internal session snapshot to execution results, but that snapshot remains adapter-internal metadata only and does not imply wait, close, attach, or resume support.
The current internal runtime-state layer, when present, must remain derived, non-persistent, and non-manifest-backed: execution-session records or indexes are future-facing internal inputs only and must not be treated as public lifecycle state or orchestration truth.
The current internal runtime-state read model, when present, must remain query-only and deterministic: selector helpers or parent/child views may serve future internal consumers, but they must not become mutable registries, wait/close controllers, or public lifecycle APIs.
The current internal runtime-context layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may prepare a single execution-session context for future internal wait/close-oriented consumers, but it must not become wait/close/attach/resume support, a mutable registry or manager, or a source of lifecycle truth.
The current internal lifecycle-disposition layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may centralize shared terminal/session-known/descendant-impact facts for sibling wait-readiness and close-readiness helpers, but it must not resolve adapter capability, validate parent graphs, generate blocker vocabularies, become a mutable registry or manager, write into manifests, or become a source of lifecycle truth.
The current internal spawn-readiness layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may combine existing runtime-context facts, parent/child lineage visibility, and optional guardrails into delegated-child preflight blockers, but it must not become actual spawn support, public selectors, manifest-backed guardrail truth, or a mutable lifecycle manager.
The current internal spawn-candidate layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may compose an existing execution-session context plus spawn-readiness into a single-consumer internal object for future spawn-oriented consumers, but it must not become actual spawn support, public selectors, manifest-backed guardrail truth, a mutable lifecycle manager, or a source of lifecycle truth.
The current internal spawn-target layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may project a minimal internal spawn-oriented target from an existing spawn-candidate, but it must not become actual spawn support, public selectors, manifest-backed guardrail truth, a mutable lifecycle manager, or a source of child-lineage decisions.
The current internal spawn-request layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may compose an existing spawn-capable candidate plus an explicit child `sourceKind` choice and optional inherited guardrails into a future internal spawn-oriented request object, but it must not become actual spawn support, public selectors, manifest-backed guardrail truth, a manifest seed, a mutable registry or manager, or a source of child-attempt, branch, worktree, runtime-mode, prompt-planning, or delegated-runtime approval decisions.
The current internal spawn-lineage layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may normalize a minimal child lineage object from an existing spawn-request plus an explicit child attempt identifier, but it must not become actual spawn support, a manifest seed, public selectors, parent runtime/session truth, or a source of branch, worktree, runtime-mode, prompt-planning, or delegated-runtime approval decisions.
Treat that internal spawn-oriented helper chain as lineage-aware preparation only: it may inspect resolved ancestry and inherited guardrails to shape readiness, candidate, target, request, or child-lineage helpers, but it must stop before public spawn contracts, parent-session lifecycle truth, or child branch/worktree/prompt planning.
The current internal wait-readiness layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may prepare internal wait preconditions or blocking reasons for future wait-oriented consumers, but it must not become actual wait support, close support, public selectors, or a mutable lifecycle manager.
The current internal wait-candidate layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may compose an existing execution-session context plus wait-readiness into a single-consumer internal object for future wait-oriented consumers, but it must not become actual wait support, close support, public selectors, a mutable lifecycle manager, or a source of lifecycle truth.
The current internal wait-target layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may project a minimal future internal wait-oriented target from an existing wait-candidate, but it must not become actual wait support, close support, public selectors, a mutable lifecycle manager, or a source of lifecycle truth.
The current internal wait-request layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may compose an existing wait-target plus explicit constraints such as `timeoutMs` into a minimal future internal request object, but it must not reintroduce selectors, views, or readiness decisions, and it must not become actual wait support, polling or timeout scheduling, settle policy, child policy, close coupling, public selectors, a mutable lifecycle manager, or a source of lifecycle truth.
The current internal wait-consumer preflight layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may compose an existing wait-request plus capability-aware readiness into a minimal future internal consumer object, but it must not reintroduce selectors, views, contexts, candidates, targets, or readiness recomputation, and it must not become actual wait support, polling or timeout scheduling, event subscription, adapter invocation, public selectors, a mutable lifecycle manager, or a source of lifecycle truth.
The current internal close-oriented helper chain, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may prepare capability-aware close-readiness blockers, composed close-candidates, minimal internal close-targets, target-based close-requests, close-requested and close-recorded lifecycle markers, close-consumer preflight metadata, a minimal internal close-consume helper driven by an explicitly injected invoker, or a minimal internal close-consume-batch helper driven by an explicit list of existing close-consumers plus that same invoker, but it must not reintroduce selector resolution, runtime-state reads, readiness recomputation outside the dedicated helper boundary, or actual close support, and it must not become public selectors, a mutable lifecycle manager, or a source of lifecycle truth. Any `close_requested` marker in this phase remains a future-facing internal event projection only, not close success truth; `close_recorded` is the first close-side marker that maps to shared `closed`, but it still does not imply actual close support or adapter-driven close success.
The current internal close-consumer preflight layer, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may compose an existing close-request plus capability-aware readiness into a minimal future internal consumer object, but it must not reintroduce selectors, views, contexts, candidates, targets, requested-event or recorded-event inputs, and it must not become actual close support, adapter invocation, event subscription, public selectors, a mutable lifecycle manager, or a source of lifecycle truth.
The current internal close-consume helper, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may consume an existing close-consumer object by either returning a structured blocked result or invoking an explicitly injected close invoker exactly once with the existing close-request, but it must not reintroduce selectors, runtime-state reads, readiness recomputation, capability recomputation, event projection, manifest seeds, adapter lifecycle truth, or actual close success semantics. Blocked close-consumer preflight results must not invoke the injected close invoker, while supported close-consumer results may invoke it exactly once with the existing close-request only.
The current internal close-consume-batch helper, when present, must remain derived, non-persistent, non-manifest-backed, and non-public: it may consume an explicit ordered list of existing close-consumer objects by composing the single-consumer close-consume helper, but it must stay consumer-list-based, preserve input order, continue past blocked entries, fail fast on the first injected invoker error from a supported entry, and must not introduce selector resolution, runtime-state reads, readiness recomputation, capability recomputation, event projection, manifest seeds, per-item error aggregation, summary policy, or actual close success semantics.

## Canonical Sources

When working in this repository, prefer these files in order:

1. `SPEC.md`
2. `README.md`
3. `docs/index.md`
4. `docs/specs/*`
5. `docs/compat/*`
6. `docs/research/*`

## Local-Only Handoff Notes

A visible local handoff file may exist at `PROJECT_STATUS.local.md`.

- It is intentionally ignored by Git.
- It may contain current progress, next steps, and local research pointers.
- Treat it as operational context, not public policy.

## Repository Rules

- Keep public documents sanitized and reusable.
- Do not place secrets, machine-specific paths, transcripts, or raw scratch notes in committed docs.
- Prefer updating existing canonical docs over creating overlapping documents.
- Treat compatibility claims carefully: document supported, experimental, and future targets separately.

## Compatibility Intent

Tier 1:

- Claude Code
- Codex CLI
- Gemini CLI
- OpenCode

Experimental:

- OpenClaw
- Other coding-agent CLIs through a generic adapter contract

## Implementation Boundary

The current implementation boundary should stay narrow:

- prioritize `Phase 1: Core Scaffold` and thin, testable `Phase 2` slices
- keep machine-readable output and runtime manifests clearer than human-readable text
- avoid introducing runtime adapters, verification ranking, or speculative orchestration features before their contracts are justified
- keep internal architecture flexible unless a spec explicitly defines a public contract
- keep adapter work thin and contract-first even when a later Phase 3 sub-slice introduces a bounded internal `codex-cli` execution contract

## Future Work Tracking

Use public RFCs and ADRs for durable decisions.
Use the local handoff file for session continuity and short-lived operational notes.
This repository now has a usable Git commit baseline, so implementation windows should actively use non-destructive Git commits, branches, and worktrees as archival checkpoints for each completed thin slice or debugging milestone.
