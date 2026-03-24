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

Current public compatibility truth:

- `agent-worktree doctor` may report `codex-cli` as the only implemented runtime adapter
- `doctor` may report whether bounded `codex-cli` detection succeeds locally
- `doctor` does not expose profile selection, env overlays, execution observation, or any internal control-plane metadata

Implemented now:

- real detection for the `codex exec --json` path
- machine-checkable command rendering
- bounded internal execution through `codex exec --json`
- bounded internal profile-aware execution passthrough for explicit Codex `--profile` selection
- minimal canonical event parsing for the headless JSONL output
- internal execution observation summaries derived from canonical events
- structured degradation for unsupported capabilities
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
- a separate internal helper layer may derive execution-session records or indexes from attempt lineage, bounded execution observation, and optional internal session snapshots
- a separate internal read-model helper layer may build selector-driven or parent/child execution-session views from those derived records
- a separate internal runtime-context helper layer may derive single-consumer execution-session contexts from the internal runtime-state read model for future internal wait/close-oriented consumers
- a separate internal lifecycle-disposition helper layer may derive shared terminal/session-known/descendant-impact facts from runtime-context for future internal wait/close-oriented consumers
- a separate internal spawn-oriented helper chain may derive readiness, candidate, target, request, or child-lineage preparation metadata from runtime-context, runtime-state views, and inherited guardrails
- a separate internal spawn-requested-event layer may derive a minimal parent-session `spawn_requested` marker above an existing spawn-request for future internal consumers without becoming actual spawn support
- that same spawn-requested-event projection remains request-based internal metadata only: it does not reintroduce selector-driven spawn surfaces, child-lineage truth, child planning, or a public session-lifecycle API
- a separate internal spawn-recorded-event layer may derive a second minimal parent-session `spawn_recorded` marker above an existing spawn-requested-event for future internal consumers without becoming actual spawn support
- that same spawn-recorded-event projection remains requested-event-based internal metadata only: it does not reintroduce selector-driven spawn surfaces, child-lineage truth, child planning, terminal lifecycle truth, or a public session-lifecycle API
- a separate internal spawn-consume helper may consume an existing spawn-request for future internal callers through an explicitly injected invoker without becoming actual spawn support
- that same spawn-consume helper remains request-based internal metadata only: it invokes the injected spawn invoker with the existing spawn-request only and does not imply child creation, child-lineage truth, terminal lifecycle truth, branch/worktree creation, prompt planning, adapter-driven spawn success, or a public session-lifecycle API
- a separate internal spawn-consume-batch helper may consume an explicit ordered list of existing spawn-requests for future internal callers by composing the single-request spawn-consume helper without becoming actual spawn support
- that same spawn-consume-batch helper remains request-list-based internal metadata only: it preserves input order, fails fast on the first injected invoker error, and does not imply child creation, child-lineage truth, terminal lifecycle truth, branch/worktree creation, prompt planning, adapter-driven spawn success, summary-policy contracts, or a public session-lifecycle API
- a separate internal spawn-effects helper may compose minimal child-lineage plus parent-session `spawn_requested` and `spawn_recorded` markers from an existing spawn-request and explicit child attempt identifier for future internal consumers without becoming actual spawn support
- that same spawn-effects helper remains request-based internal metadata only: it reuses existing lineage and marker helpers only, does not invoke adapters, and does not imply child creation, child-lineage truth beyond the explicit projection, terminal lifecycle truth, real runtime side effects, or a public session-lifecycle API
- a separate internal spawn-effects-batch helper may compose an explicit ordered list of existing spawn-effects inputs for future internal callers by composing the single-request spawn-effects helper without becoming actual spawn support
- that same spawn-effects-batch helper remains request-list-based internal metadata only: it preserves input order, fails fast on the first derivation error, and does not imply child creation, child-lineage truth, terminal lifecycle truth, real runtime side effects, summary-policy contracts, or a public session-lifecycle API
- a separate internal spawn-apply helper may compose an existing spawn-consume result plus an existing spawn-effects result for future internal callers without becoming actual spawn support
- that same spawn-apply helper remains request-based internal metadata only: it consumes first, derives effects second, and does not imply child creation, child-lineage truth, terminal lifecycle truth, real spawn success, or a public session-lifecycle API
- a separate internal spawn-apply-batch helper may compose an explicit ordered list of existing spawn-effects inputs for future internal callers by composing the single-request spawn-apply helper without becoming actual spawn support
- that same spawn-apply-batch helper remains request-list-based internal metadata only: it preserves input order, fails fast on the first error, and does not imply child creation, child-lineage truth, terminal lifecycle truth, real spawn success, summary-policy contracts, or a public session-lifecycle API
- a separate internal spawn-headless-input helper may compose existing spawn-effects metadata plus a minimal headless-execution seed into a future internal execution input whose `attempt` comes from child lineage without becoming actual spawn support
- that same spawn-headless-input helper remains adapter-neutral internal metadata only: it shapes input fields only, does not execute a child runtime, and does not imply child creation, child-runtime truth, terminal lifecycle truth, real spawn success, or a public session-lifecycle API
- a separate internal spawn-headless-input-batch helper may compose an explicit ordered list of existing spawn-effects metadata plus execution seeds for future internal callers by composing the single-request spawn-headless-input helper without becoming actual spawn support
- that same spawn-headless-input-batch helper remains request-list-based internal metadata only: it preserves input order, fails fast on the first bridge error, and does not imply child creation, child-runtime truth, terminal lifecycle truth, real spawn success, summary-policy contracts, or a public session-lifecycle API
- a separate internal spawn-headless-apply helper may compose existing spawn-apply metadata plus a minimal headless-execution seed into a future internal execution payload whose `attempt` comes from `apply.effects.lineage` without becoming actual delegated runtime support
- that same spawn-headless-apply helper remains adapter-neutral internal metadata only: it shapes input fields only, does not execute a child runtime, and does not imply child creation, child-runtime truth, terminal lifecycle truth, real spawn success, or a public session-lifecycle API
- a separate internal spawn-headless-apply-batch helper may compose an explicit ordered list of existing spawn-apply metadata plus execution seeds for future internal callers by composing the single-request spawn-headless-apply helper without becoming actual delegated runtime support
- that same spawn-headless-apply-batch helper remains request-list-based internal metadata only: it preserves input order, fails fast on the first bridge error, and does not imply child creation, child-runtime truth, terminal lifecycle truth, real spawn success, summary-policy contracts, or a public session-lifecycle API
- a separate internal spawn-headless-execute helper may consume an existing spawn-headless-apply payload through an explicitly injected bounded headless executor without becoming actual delegated runtime support
- that same spawn-headless-execute helper remains consume-path internal metadata only: it may return bounded internal execution-consumption results, but it does not imply child creation, child-runtime truth, terminal lifecycle truth, delegated-runtime truth, or a public session-lifecycle API
- a separate internal spawn-headless-execute-batch helper may compose an explicit ordered list of those same internal execution-consumption results by composing the single-request spawn-headless-execute helper without becoming actual delegated runtime support
- that same spawn-headless-execute-batch helper remains request-list-based internal metadata only: it preserves input order, fails fast on the first execution error, and does not imply child creation, child-runtime truth, terminal lifecycle truth, delegated-runtime truth, or summary-policy contracts
- a separate internal spawn-headless-record helper may derive a single execution-session record from an existing spawn-headless-execute payload by composing the generic execution-session record helper without becoming actual delegated runtime support
- that same spawn-headless-record helper remains runtime-state internal metadata only: it may return bounded derived `ExecutionSessionRecord` metadata, but it does not imply child creation, child-runtime truth, terminal lifecycle truth, delegated-runtime truth, or a public session-lifecycle API
- a separate internal spawn-headless-record-batch helper may compose an explicit ordered list of those same internal runtime-state derivations by composing the single-request spawn-headless-record helper without becoming actual delegated runtime support
- that same spawn-headless-record-batch helper remains request-list-based internal metadata only: it preserves input order, fails fast on the first derivation error, and does not imply child creation, child-runtime truth, terminal lifecycle truth, delegated-runtime truth, or summary-policy contracts
- a separate internal spawn-headless-context helper may derive a single execution-session context from an existing spawn-headless-view payload by composing the generic `deriveExecutionSessionContext(...)` helper with an internal attempt-based selector derived from the existing headless record without becoming actual delegated runtime support
- that same spawn-headless-context helper remains bounded internal metadata only: it may return derived `ExecutionSessionContext` metadata, but it does not imply child creation, child-runtime truth, runtime truth, terminal lifecycle truth, delegated-runtime truth, or a public session-lifecycle API
- a separate internal spawn-headless-context-batch helper may compose an explicit ordered list of internal context derivations from an existing spawn-headless-view-batch payload by reusing the same shared execution-session view and composing the generic `deriveExecutionSessionContext(...)` helper with internally derived attempt-based selectors for each existing headless record without becoming actual delegated runtime support
- that same spawn-headless-context-batch helper remains batch internal metadata only: it preserves input ordering, fails fast on the first selector or context-derivation error, exposes no per-item summary contract, and does not imply child creation, child-runtime truth, runtime truth, terminal lifecycle truth, delegated-runtime truth, or summary-policy contracts
- a separate internal spawn-headless-wait-candidate helper may derive a single wait-candidate-shaped result from an existing spawn-headless-context payload by composing the generic `deriveExecutionSessionWaitReadiness(...)` helper with the existing derived context without calling the generic selector-driven `deriveExecutionSessionWaitCandidate(...)` helper or becoming actual wait support
- that same spawn-headless-wait-candidate helper remains bounded internal bridge metadata only: it may return derived `ExecutionSessionWaitCandidate` semantics, but it does not imply child creation, child-runtime truth, runtime truth, terminal lifecycle truth, polling truth, timeout scheduling truth, actual wait support, or a public session-lifecycle API
- a separate internal spawn-headless-wait-candidate-batch helper may compose an explicit ordered list of those same bounded bridge results from an existing spawn-headless-context-batch payload by reusing the single-request spawn-headless-wait-candidate helper without calling the generic selector-driven `deriveExecutionSessionWaitCandidate(...)` helper or becoming actual wait support
- that same spawn-headless-wait-candidate-batch helper remains batch internal bridge metadata only: it preserves input ordering, fails fast on the first wait-readiness derivation error, exposes no per-item summary contract, and does not imply child creation, child-runtime truth, runtime truth, terminal lifecycle truth, polling truth, timeout scheduling truth, actual wait support, or summary-policy contracts
- a separate internal spawn-headless-close-candidate helper may derive a single `{ headlessContext, candidate }` bridge from an existing spawn-headless-context payload by composing the generic `deriveExecutionSessionCloseReadiness(...)` helper with the existing `headlessContext.context` without becoming actual close support or delegated runtime support
- that same spawn-headless-close-candidate helper remains bounded internal metadata only: it may return derived close-oriented bridge metadata, but it does not imply child creation, child-runtime truth, runtime truth, terminal lifecycle truth, actual close support, adapter-driven close success truth, or a public session-lifecycle API
- a separate internal spawn-headless-close-candidate-batch helper may compose an explicit ordered list of those same close-oriented bridges from an existing spawn-headless-context-batch payload by reusing the same single-request helper and, when provided, the same capability resolver across each item without becoming actual close support or delegated runtime support
- that same spawn-headless-close-candidate-batch helper remains batch internal metadata only: it preserves input ordering, fails fast on the first readiness-derivation error, exposes no partial-result or per-item summary contract, and does not imply child creation, child-runtime truth, runtime truth, terminal lifecycle truth, actual close support, adapter-driven close success truth, or summary-policy contracts
- a separate internal wait-readiness helper layer may derive wait preconditions or blocking reasons from runtime-context for future internal wait-oriented consumers
- a separate internal wait-candidate helper layer may derive selector-driven wait-candidate metadata above runtime-context and wait-readiness for future internal consumers without becoming actual wait support
- that same wait-candidate helper remains selector-driven internal metadata only: it reuses existing context and readiness contracts and does not imply actual wait support, close support, public selectors, or lifecycle truth
- a separate internal wait-target or wait-request helper layer may derive minimal internal wait-oriented target or request metadata above that control-plane vocabulary for future internal consumers
- that same wait-request shaping remains target-based internal metadata only: it does not reintroduce selector-driven wait surfaces, readiness recomputation, or an actual wait consumer loop
- a separate internal wait-consumer preflight layer may derive capability-aware consumer readiness above an existing wait-request for future internal consumers without becoming actual wait support
- a separate internal wait-consume helper may consume an existing wait-consumer object for future internal callers through an explicitly injected invoker without becoming actual wait support
- that same wait-consume helper remains consumer-based internal metadata only: blocked results do not invoke the injected invoker, supported results may invoke it exactly once with the existing wait-request, and it does not imply polling, timeout scheduling, adapter-driven wait success, sessionLifecycle support, event projection, or a public session-lifecycle API
- a separate internal wait-consume-batch helper may consume an explicit list of existing wait-consumer objects for future internal callers by composing the single-consumer wait-consume helper without becoming actual wait support
- that same wait-consume-batch helper remains consumer-list-based internal metadata only: it preserves input order, continues past blocked entries, fails fast on the first injected invoker error from a supported entry, and does not imply polling, timeout scheduling, summary-policy contracts, adapter-driven wait success, sessionLifecycle support, event projection, or a public session-lifecycle API
- a separate internal close-target or close-request helper layer may derive minimal internal close-oriented target or request metadata above that control-plane vocabulary for future internal consumers
- that same close-request shaping remains target-based internal metadata only: it does not reintroduce selector-driven close surfaces, readiness or capability recomputation, or any close-consumer preflight or actual close loop
- a separate internal close-requested-event layer may derive a minimal internal `close_requested` lifecycle marker above an existing close-request for future internal consumers without becoming actual close support
- that same close-requested-event projection remains request-based internal metadata only: it does not reintroduce selector-driven close surfaces, readiness or capability recomputation, any close-consumer preflight, or `close_recorded` / `closed` truth
- a separate internal close-recorded-event layer may derive a minimal internal `close_recorded` lifecycle marker above an existing close-requested-event for future internal consumers without becoming actual close support
- that same close-recorded-event projection remains requested-event-based internal metadata only: it does not reintroduce selector-driven close surfaces, readiness or capability recomputation, any close-consumer preflight, or adapter-driven close success truth even though shared lifecycle derivation maps `close_recorded` to `closed`
- a separate internal close-consumer preflight layer may derive capability-aware consumer readiness above an existing close-request for future internal consumers without becoming actual close support
- that same close-consumer preflight composition remains request-based internal metadata only: it does not reintroduce selector-driven close surfaces, close-readiness recomputation, adapter invocation, event subscription, or adapter-driven close success truth
- a separate internal close-consume helper may consume an existing close-consumer object for future internal callers through an explicitly injected invoker without becoming actual close support
- that same close-consume helper remains consumer-based internal metadata only: blocked results do not invoke the injected invoker, supported results may invoke it exactly once with the existing close-request, and it does not imply adapter-driven close success, sessionLifecycle support, event projection, or a public session-lifecycle API
- a separate internal close-consume-batch helper may consume an explicit list of existing close-consumer objects for future internal callers by composing the single-consumer close-consume helper without becoming actual close support
- that same close-consume-batch helper remains consumer-list-based internal metadata only: it preserves input order, continues past blocked entries, fails fast on the first injected invoker error from a supported entry, and does not imply partial-failure aggregation, adapter-driven close success, sessionLifecycle support, event projection, or a public session-lifecycle API
- that observation summary is adapter-internal only: it is not a public CLI payload contract, not manifest-backed state, and not a session-lifecycle API
- the same restriction applies to any derived internal session snapshot: it is not a public CLI payload, not manifest-backed state, and not attach/resume/wait/close support
- the same restriction applies to any derived execution-session record or index: it is not a public CLI payload, not manifest-backed state, and not lifecycle support
- the same restriction applies to any derived execution-session read model: it is query-only internal metadata, not a mutable registry, public selector surface, or lifecycle manager
- the same restriction applies to any derived execution-session context: it is internal-only, non-persistent, non-manifest-backed metadata and does not imply public selectors or lifecycle support
- the same restriction applies to any derived lifecycle-disposition or spawn-oriented metadata: it is internal-only, derived, non-persistent, non-manifest-backed metadata and does not imply actual spawn support, public selectors, child planning, or lifecycle truth
- the same restriction applies to any derived spawn-requested-event metadata: it is internal-only, non-persistent, non-manifest-backed lifecycle-marker metadata and does not imply actual spawn support, child creation truth, child lineage truth, or a public session-lifecycle API
- the same restriction applies to any derived spawn-recorded-event metadata: it is internal-only, non-persistent, non-manifest-backed lifecycle-marker metadata and does not imply actual spawn support, child creation truth, child lineage truth, terminal lifecycle truth, or a public session-lifecycle API
- the same restriction applies to any derived spawn-effects metadata: it is internal-only, non-persistent, non-manifest-backed composition metadata and does not imply actual spawn support, child creation truth, child lineage truth, terminal lifecycle truth, or real runtime side effects
- the same restriction applies to any derived spawn-effects-batch metadata: it is internal-only, non-persistent, non-manifest-backed batch composition metadata and does not imply actual spawn support, child creation truth, child lineage truth, terminal lifecycle truth, real runtime side effects, or summary-policy contracts
- the same restriction applies to any derived spawn-consume metadata: it is internal-only, non-persistent, non-manifest-backed request-consumption metadata and does not imply actual spawn support, child creation truth, child lineage truth, terminal lifecycle truth, branch/worktree creation, prompt planning, adapter-driven spawn success, or a public session-lifecycle API
- the same restriction applies to any derived spawn-consume-batch metadata: it is internal-only, non-persistent, non-manifest-backed batch request-consumption metadata and does not imply actual spawn support, child creation truth, child lineage truth, terminal lifecycle truth, branch/worktree creation, prompt planning, adapter-driven spawn success, summary-policy contracts, or a public session-lifecycle API
- the same restriction applies to any derived spawn-apply metadata: it is internal-only, non-persistent, non-manifest-backed composition metadata and does not imply actual spawn support, child creation truth, child lineage truth, terminal lifecycle truth, or real spawn success
- the same restriction applies to any derived spawn-apply-batch metadata: it is internal-only, non-persistent, non-manifest-backed batch composition metadata and does not imply actual spawn support, child creation truth, child lineage truth, terminal lifecycle truth, real spawn success, or summary-policy contracts
- the same restriction applies to any derived spawn-headless-input metadata: it is internal-only, non-persistent, non-manifest-backed bridge metadata and does not imply actual spawn support, child creation truth, child-runtime execution truth, terminal lifecycle truth, or real spawn success
- the same restriction applies to any derived spawn-headless-input-batch metadata: it is internal-only, non-persistent, non-manifest-backed batch bridge metadata and does not imply actual spawn support, child creation truth, child-runtime execution truth, terminal lifecycle truth, real spawn success, or summary-policy contracts
- the same restriction applies to any derived spawn-headless-apply metadata: it is internal-only, non-persistent, non-manifest-backed bridge metadata and does not imply actual delegated runtime support, child creation truth, child-runtime execution truth, terminal lifecycle truth, or real spawn success
- the same restriction applies to any derived spawn-headless-apply-batch metadata: it is internal-only, non-persistent, non-manifest-backed batch bridge metadata and does not imply actual delegated runtime support, child creation truth, child-runtime execution truth, terminal lifecycle truth, real spawn success, or summary-policy contracts
- the same restriction applies to any derived spawn-headless-execute metadata: it is internal-only, non-persistent, non-manifest-backed execution-consumption metadata and does not imply actual delegated runtime support, child creation truth, child-runtime execution truth, terminal lifecycle truth, or public lifecycle semantics
- the same restriction applies to any derived spawn-headless-execute-batch metadata: it is internal-only, non-persistent, non-manifest-backed batch execution-consumption metadata and does not imply actual delegated runtime support, child creation truth, child-runtime execution truth, terminal lifecycle truth, or summary-policy contracts
- the same restriction applies to any derived spawn-headless-record metadata: it is internal-only, non-persistent, non-manifest-backed runtime-state metadata and does not imply actual delegated runtime support, child creation truth, child-runtime execution truth, terminal lifecycle truth, or public lifecycle semantics
- the same restriction applies to any derived spawn-headless-record-batch metadata: it is internal-only, non-persistent, non-manifest-backed batch runtime-state metadata and does not imply actual delegated runtime support, child creation truth, child-runtime execution truth, terminal lifecycle truth, or summary-policy contracts
- the same restriction applies to any derived spawn-headless-context metadata: it is internal-only, non-persistent, non-manifest-backed context metadata and does not imply actual delegated runtime support, child creation truth, child-runtime execution truth, runtime truth, terminal lifecycle truth, or public lifecycle semantics
- the same restriction applies to any derived spawn-headless-context-batch metadata: it is internal-only, non-persistent, non-manifest-backed batch context metadata and does not imply actual delegated runtime support, child creation truth, child-runtime execution truth, runtime truth, terminal lifecycle truth, or summary-policy contracts
- the same restriction applies to any derived spawn-headless-wait-candidate metadata: it is internal-only, non-persistent, non-manifest-backed bridge metadata and does not imply actual wait support, polling truth, timeout scheduling truth, child creation truth, runtime truth, terminal lifecycle truth, or a public session-lifecycle API
- the same restriction applies to any derived spawn-headless-wait-candidate-batch metadata: it is internal-only, non-persistent, non-manifest-backed batch bridge metadata and does not imply actual wait support, polling truth, timeout scheduling truth, child creation truth, runtime truth, terminal lifecycle truth, or summary-policy contracts
- the same restriction applies to any derived spawn-headless-close-candidate metadata: it is internal-only, non-persistent, non-manifest-backed close-bridge metadata and does not imply actual close support, child creation truth, child-runtime execution truth, runtime truth, terminal lifecycle truth, adapter-driven close success truth, or public lifecycle semantics
- the same restriction applies to any derived spawn-headless-close-candidate-batch metadata: it is internal-only, non-persistent, non-manifest-backed batch close-bridge metadata and does not imply actual close support, child creation truth, child-runtime execution truth, runtime truth, terminal lifecycle truth, adapter-driven close success truth, or summary-policy contracts
- the same restriction applies to any derived wait-readiness metadata: it is internal-only, non-persistent, non-manifest-backed preflight state and does not imply actual wait support, close support, or public selectors
- the same restriction applies to any derived wait-candidate metadata: it is internal-only, non-persistent, non-manifest-backed metadata and does not imply actual wait support, close support, public selectors, or lifecycle truth
- the same restriction applies to any derived wait-target or wait-request metadata: it is internal-only, non-persistent, non-manifest-backed metadata and does not imply actual wait support, polling, timeout scheduling, or a public session-lifecycle API
- the same restriction applies to any derived wait-consumer metadata: it is internal-only, non-persistent, non-manifest-backed capability-aware preflight state and does not imply actual wait support, polling, timeout scheduling, adapter-driven waiting, or a public session-lifecycle API
- the same restriction applies to any derived wait-consume metadata: it is internal-only, non-persistent, non-manifest-backed consume-path metadata and does not imply actual wait support, polling, timeout scheduling, adapter-driven wait success, sessionLifecycle support, or a public session-lifecycle API
- the same restriction applies to any derived wait-consume-batch metadata: it is internal-only, non-persistent, non-manifest-backed batch consume-path metadata and does not imply actual wait support, polling, timeout scheduling, summary-policy contracts, adapter-driven wait success, sessionLifecycle support, or a public session-lifecycle API
- the same restriction applies to any derived close-target or close-request metadata: it is internal-only, non-persistent, non-manifest-backed metadata and does not imply actual close support, close-consumer preflight, adapter-driven closing, or a public session-lifecycle API
- the same restriction applies to any derived close-requested-event metadata: it is internal-only, non-persistent, non-manifest-backed lifecycle-marker metadata and does not imply actual close support, close success truth, close-consumer preflight, adapter-driven closing, or a public session-lifecycle API
- the same restriction applies to any derived close-recorded-event metadata: it is internal-only, non-persistent, non-manifest-backed lifecycle-marker metadata and does not imply actual close support, adapter-driven close success, close-consumer preflight, or a public session-lifecycle API
- the same restriction applies to any derived close-consumer metadata: it is internal-only, non-persistent, non-manifest-backed capability-aware preflight metadata and does not imply actual close support, adapter-driven closing, event subscription, or a public session-lifecycle API
- the same restriction applies to any derived close-consume metadata: it is internal-only, non-persistent, non-manifest-backed consume-path metadata and does not imply actual close support, adapter-driven close success, sessionLifecycle support, or a public session-lifecycle API
- the same restriction applies to any derived close-consume-batch metadata: it is internal-only, non-persistent, non-manifest-backed batch consume-path metadata and does not imply actual close support, partial-failure aggregation support, adapter-driven close success, sessionLifecycle support, or a public session-lifecycle API

Explicitly not implemented:

- `resume` rendering or execution
- MCP transport execution
- interactive session attach or stop behavior
- general session lifecycle management
- public execution commands in `agent-worktree`
- public spawn, spawn-requested-event, or spawn-recorded-event CLI surface in `agent-worktree`
- public spawn-consume or spawn-consume-batch CLI surface in `agent-worktree`
- public spawn-effects or spawn-apply CLI surface in `agent-worktree`
- public spawn-headless-input CLI surface in `agent-worktree`
- public spawn-headless-apply, spawn-headless-execute, spawn-headless-record, spawn-headless-view, spawn-headless-context, spawn-headless-wait-candidate, or spawn-headless-close-candidate CLI surface in `agent-worktree`
- public `--profile` flags or public provider-selection semantics in `agent-worktree`
- public wait, wait-consume, or wait-consume-batch CLI surface in `agent-worktree`
- provider, auth, or config-management writers for local Codex settings
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
