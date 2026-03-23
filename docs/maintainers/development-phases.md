# Development Phases

This document breaks future implementation into explicit phases so later coding sessions can work against stable milestones.

The purpose is to reduce ambiguity and make automated implementation more reliable.

## Phase 0: Documentation Freeze

Objective:

- finish the first coherent public contract layer

Deliverables:

- stable terminology
- compatibility tiers
- config draft
- runtime manifest draft
- CLI command tree draft
- testing strategy draft

Exit criteria:

- docs are internally consistent
- handoff document is current
- no major contradiction remains in core docs

## Phase 1: Core Scaffold

Objective:

- establish implementation structure without taking on runtime complexity yet

Deliverables:

- language and package scaffolding
- schema validation foundation
- config loader
- manifest types
- basic test harness

Exit criteria:

- config examples parse
- manifest examples validate
- test harness runs cleanly

## Phase 2: Worktree Lifecycle

Objective:

- implement the smallest useful orchestration slice

Deliverables:

- attempt create
- attempt list
- attempt cleanup
- safe naming and status handling

Early implementation windows MAY land `attempt create` and `attempt list` before `attempt cleanup` if cleanup safety semantics are not yet explicit enough to test confidently.

Exit criteria:

- isolated worktree lifecycle works locally
- cleanup behavior is deterministic
- tests cover lifecycle basics

## Phase 3: Session and Adapter Foundation

Objective:

- add runtime abstraction without committing to one tool

Deliverables:

- adapter interface
- capability descriptor
- first subprocess runtime path
- minimal session backend abstraction

Phase 3 MAY land in multiple thin sub-slices.
An acceptable intermediate milestone is a bounded internal `codex-cli` execution contract with real detection, `codex exec --json` execution, minimal parsing, and an env-gated smoke scaffold, while session lifecycle work remains deferred.
Another acceptable thin follow-up is to tighten the internal `codex-cli` executable probing contract, add probing-specific contract tests, and sharpen parser-noise boundaries without introducing manifest-backed execution state or a generic runtime-resolution framework.
Another acceptable thin follow-up is to add minimal internal `codex-cli` profile-aware execution support, so long as an explicit profile name is only passed through bounded internal render or execution paths, remains internal-only, non-persistent, non-manifest-backed, and non-public, does not become provider management or a public CLI/config surface, and does not silently widen default-runner env-overlay behavior into custom-runner defaults.
Another acceptable thin follow-up is to add manifest-level attempt provenance fields such as `sourceKind` and `parentAttemptId`, so long as they remain additive audit metadata and do not widen the public CLI into real delegated-runtime lifecycle commands.
Another acceptable thin follow-up is to add an internal execution observation summary on top of canonical `codex-cli` events, so long as it remains adapter-internal, non-persistent, and outside the public CLI or session-lifecycle contract.
Another acceptable thin follow-up is to add an internal session-tree/control-plane vocabulary derived from attempt provenance and execution observation, so long as it remains a pure helper layer, stays outside the public CLI and manifest contracts, and does not persist live session state.
Another acceptable thin follow-up is to let the bounded `codex-cli` execution path consume that internal control-plane vocabulary and emit derived session snapshots in internal execution results, so long as those snapshots remain non-persistent and do not widen the public CLI, manifest, or lifecycle contracts.
Another acceptable thin follow-up is to add an internal runtime-state layer that derives execution-session records or indexes from attempt lineage, bounded execution observation, and optional derived session snapshots, so long as it remains pure, non-persistent, non-manifest-backed, and outside the public lifecycle contract.
Another acceptable thin follow-up is to add a read-only query/view layer on top of that internal runtime-state, so long as selectors, parent/child traversal, and lookup helpers remain deterministic, non-persistent, non-public, and clearly separate from mutable registry or lifecycle-manager behavior.
Another acceptable thin follow-up is to add an internal runtime-context layer above that read model, so long as it remains selector-driven or view-driven, derived, non-persistent, non-manifest-backed, and does not introduce wait/close commands, mutable registry behavior, or public selector semantics.
Another acceptable thin follow-up is to add an internal lifecycle-disposition layer above runtime-context and below wait-readiness and close-readiness, so long as it derives only shared facts such as `alreadyFinal`, `hasKnownSession`, and `wouldAffectDescendants`, remains derived, non-persistent, non-manifest-backed, non-public, and does not resolve adapter capability or introduce actual wait/close/public selector semantics.
Within that milestone, wait-readiness and close-readiness should remain sibling helper layers that reuse shared disposition facts without depending on each other or promoting those derived facts into lifecycle truth.
Another acceptable thin follow-up is to add an internal spawn-readiness layer above runtime-context, lifecycle-disposition, and runtime-state views, so long as it derives only delegated-child preflight blockers such as terminal/session-known/lineage-depth/child-limit facts, remains derived, non-persistent, non-manifest-backed, non-public, and does not introduce actual spawn support, public selector semantics, or manifest-backed guardrail truth.
Another acceptable thin follow-up is to add an internal spawn-candidate layer above runtime-context and spawn-readiness, so long as it remains a derived composition helper, non-persistent, non-manifest-backed, non-public, reuses the existing selector contract, and does not introduce actual spawn support, public selector semantics, manifest-backed guardrail truth, or child-attempt creation semantics.
Another acceptable thin follow-up is to add an internal spawn-target layer above spawn-candidate, so long as it remains a derived projection helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal parent-session target rather than child-attempt creation, child worktree creation, child sourceKind decisions, or actual spawn support.
Another acceptable thin follow-up is to add an internal spawn-request layer above an existing spawn-candidate or spawn-target input, so long as it remains a derived composition helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal future internal request object composed from a parent-session target, an explicit child `sourceKind` choice, and optional inherited guardrails rather than actual spawn support, child-attempt creation, child worktree or branch creation, child source auto-resolution, manifest-backed persistence, or public CLI or selector semantics.
Another acceptable thin follow-up is to add an internal spawn-lineage layer above spawn-request, so long as it remains a derived projection helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal child lineage object composed from an explicit child attempt identifier, the parent attempt reference already present in spawn-request, the explicit child `sourceKind`, and any normalized inherited guardrails rather than actual spawn support, manifest seeding, public CLI or selector semantics, or child branch/worktree planning.
Within that spawn-lineage milestone, lineage-aware ancestry lookup may inform delegated-child readiness, inherited guardrail carry-through, and minimal child lineage projection, but the helper chain must still stop before public spawn semantics. It must not synthesize parent runtime/session truth, child branches, child worktrees, child runtime mode, prompt payloads, or delegated-runtime approval decisions.
Another acceptable thin follow-up is to add an internal spawn-requested-event layer above an existing spawn-request input, so long as it remains a derived projection helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal parent-session marker composed from `{ attemptId, runtime, sessionId, lifecycleEventKind: "spawn_requested" }` using the existing spawn-request parent-session fields rather than child-attempt creation, child-lineage truth, manifest seeding, public CLI or selector semantics, or actual spawn support.
That spawn-requested-event milestone should stay request-based: it may bridge an existing spawn-request into the shared lifecycle-event vocabulary, but it must not reintroduce selector resolution, runtime-state reads, readiness or capability recomputation, child-attempt evidence, child branch/worktree planning, or delegated-runtime approval decisions. In this phase, `spawn_requested` remains a parent-session marker only; it does not imply child creation, child lineage truth, or adapter-driven spawn success.
Another acceptable thin follow-up is to add an internal spawn-recorded-event layer above an existing spawn-requested-event input, so long as it remains a derived projection helper, non-persistent, non-manifest-backed, non-public, and limited to a second minimal parent-session marker composed from `{ attemptId, runtime, sessionId, lifecycleEventKind: "spawn_recorded" }` rather than child-attempt creation, child-lineage truth, manifest seeding, public CLI or selector semantics, terminal lifecycle truth, or actual spawn support.
That spawn-recorded-event milestone should stay requested-event-based: it may bridge an existing spawn-requested-event into the shared lifecycle-event vocabulary, but it must not reintroduce selector resolution, runtime-state reads, readiness or capability recomputation, child-attempt evidence, child branch/worktree planning, or delegated-runtime approval decisions. In this phase, `spawn_recorded` remains a second parent-session marker only; it does not imply child creation, child lineage truth, terminal lifecycle truth, or adapter-driven spawn success.
Another acceptable thin follow-up is to add an internal spawn-consume helper above an existing spawn-request input, so long as it remains a request-based derived async composition helper, non-persistent, non-manifest-backed, non-public, and limited to invoking an explicitly injected spawn invoker exactly once with that existing request rather than child creation, child-lineage truth, terminal lifecycle truth, branch or worktree creation, prompt planning, adapter-driven spawn success, manifest-backed persistence, public CLI or selector semantics, or a public session-lifecycle API.
That spawn-consume milestone should stay request-based: it may consume an already-shaped internal spawn-request for a future internal caller, but it must not reintroduce selector resolution, runtime-state reads, readiness or capability recomputation, child-lineage derivation, child branch/worktree planning, prompt planning, or delegated-runtime approval decisions. In this phase, `spawn-consume` remains internal request-consumption metadata only; it does not imply child creation, child lineage truth, terminal lifecycle truth, branch/worktree creation, prompt planning, or adapter-driven spawn success.
Another acceptable thin follow-up is to add an internal spawn-consume-batch helper above an explicit ordered list of existing spawn-request inputs, so long as it remains a request-based derived async composition helper, non-persistent, non-manifest-backed, non-public, and limited to sequentially composing the existing single-request `spawn-consume` helper rather than child creation, child-lineage truth, terminal lifecycle truth, branch or worktree creation, prompt planning, adapter-driven spawn success, manifest-backed persistence, public CLI or selector semantics, per-item summary-policy contracts, or a public session-lifecycle API.
That spawn-consume-batch milestone should stay request-list-based: it may preserve input order and fail fast on the first injected invoker error, but it must not reintroduce selector resolution, runtime-state reads, readiness or capability recomputation, child-lineage derivation, child branch/worktree planning, prompt planning, delegated-runtime approval decisions, or summary policy semantics. In this phase, `spawn-consume-batch` remains internal request-consumption metadata only; it does not imply child creation, child lineage truth, terminal lifecycle truth, branch/worktree creation, prompt planning, or adapter-driven spawn success.
Another acceptable thin follow-up is to add an internal spawn-effects helper above an existing spawn-request plus explicit child attempt identifier, so long as it remains a request-based pure composition helper, non-persistent, non-manifest-backed, non-public, and limited to reusing the existing spawn-lineage, spawn-requested-event, and spawn-recorded-event helpers rather than child creation, terminal lifecycle truth, branch or worktree creation, prompt planning, adapter invocation, manifest-backed persistence, public CLI or selector semantics, or a public session-lifecycle API.
That spawn-effects milestone should stay request-based: it may compose minimal child-lineage plus parent-session `spawn_requested` and `spawn_recorded` markers for a future internal caller, but it must not reintroduce selector resolution, runtime-state reads, readiness or capability recomputation, child-attempt evidence beyond the explicit `childAttemptId`, child branch/worktree planning, prompt planning, delegated-runtime approval decisions, or adapter-driven spawn success. In this phase, `spawn-effects` remains internal composition metadata only; it does not imply child creation, child lineage truth, terminal lifecycle truth, or actual spawn support.
Another acceptable thin follow-up is to add an internal spawn-effects-batch helper above an explicit ordered list of existing spawn-effects inputs, so long as it remains a request-list-based pure composition helper, non-persistent, non-manifest-backed, non-public, and limited to sequentially composing the existing single-request `spawn-effects` helper rather than child creation, terminal lifecycle truth, branch or worktree creation, prompt planning, manifest-backed persistence, public CLI or selector semantics, summary-policy contracts, or a public session-lifecycle API.
That spawn-effects-batch milestone should stay request-list-based: it may preserve input order and fail fast on the first derivation error, but it must not reintroduce selector resolution, runtime-state reads, readiness or capability recomputation, child branch/worktree planning, prompt planning, delegated-runtime approval decisions, or summary policy semantics. In this phase, `spawn-effects-batch` remains internal composition metadata only; it does not imply child creation, child lineage truth, terminal lifecycle truth, or actual spawn support.
Another acceptable thin follow-up is to add an internal spawn-apply helper above an existing spawn-request plus explicit child attempt identifier, so long as it remains a request-based derived async composition helper, non-persistent, non-manifest-backed, non-public, and limited to invoking the existing single-request `spawn-consume` helper first and composing the existing single-request `spawn-effects` helper only after that consume step succeeds rather than child creation, terminal lifecycle truth, branch or worktree creation, prompt planning, manifest-backed persistence, public CLI or selector semantics, or a public session-lifecycle API.
That spawn-apply milestone should stay request-based: it may compose existing consume metadata plus effects metadata for a future internal caller, but it must not reintroduce selector resolution, runtime-state reads, readiness or capability recomputation, child branch/worktree planning, prompt planning, delegated-runtime approval decisions, or adapter-driven spawn success. In this phase, `spawn-apply` remains internal composition metadata only; it does not imply child creation, child lineage truth, terminal lifecycle truth, or actual spawn support.
Another acceptable thin follow-up is to add an internal spawn-apply-batch helper above an explicit ordered list of existing spawn-effects inputs, so long as it remains a request-list-based derived async composition helper, non-persistent, non-manifest-backed, non-public, and limited to sequentially composing the existing single-request `spawn-apply` helper through the same injected invoker rather than child creation, terminal lifecycle truth, branch or worktree creation, prompt planning, manifest-backed persistence, public CLI or selector semantics, per-item summary-policy contracts, or a public session-lifecycle API.
That spawn-apply-batch milestone should stay request-list-based: it may preserve input order and fail fast on the first error, but it must not reintroduce selector resolution, runtime-state reads, readiness or capability recomputation, child branch/worktree planning, prompt planning, delegated-runtime approval decisions, or summary policy semantics. In this phase, `spawn-apply-batch` remains internal composition metadata only; it does not imply child creation, child lineage truth, terminal lifecycle truth, or actual delegated runtime support.
Another acceptable thin follow-up is to add an internal spawn-headless-input helper above existing spawn-effects metadata plus a minimal headless-execution seed, so long as it remains an adapter-neutral pure composition helper, non-persistent, non-manifest-backed, non-public, and limited to deriving `attempt` from `effects.lineage` while whitelisting only explicit execution fields such as `prompt`, `cwd`, `timeoutMs`, or `abortSignal` rather than child runtime execution, child creation, terminal lifecycle truth, manifest-backed persistence, public CLI or selector semantics, or a public session-lifecycle API.
That spawn-headless-input milestone should stay adapter-neutral and input-shaping only: it may bridge existing spawn-effects metadata into a future internal headless execution input for internal callers, but it must not execute a child runtime, reintroduce selector resolution, runtime-state reads, readiness or capability recomputation, branch/worktree planning, prompt planning beyond passthrough, delegated-runtime approval decisions, or adapter-driven spawn success. In this phase, `spawn-headless-input` remains internal bridge metadata only; it does not imply child creation, child runtime launch, terminal lifecycle truth, or actual delegated runtime support.
Another acceptable thin follow-up is to add an internal spawn-headless-input-batch helper above an explicit ordered list of existing spawn-effects metadata plus execution seeds, so long as it remains an adapter-neutral request-list-based pure composition helper, non-persistent, non-manifest-backed, non-public, and limited to sequentially composing the existing single-request `spawn-headless-input` helper rather than child runtime execution, child creation, terminal lifecycle truth, manifest-backed persistence, public CLI or selector semantics, summary-policy contracts, or a public session-lifecycle API.
That spawn-headless-input-batch milestone should stay request-list-based and input-shaping only: it may preserve input order and fail fast on the first bridge error, but it must not reintroduce selector resolution, runtime-state reads, readiness or capability recomputation, branch/worktree planning, prompt planning beyond passthrough, delegated-runtime approval decisions, or summary policy semantics. In this phase, `spawn-headless-input-batch` remains internal bridge metadata only; it does not imply child creation, child runtime launch, terminal lifecycle truth, or actual delegated runtime support.
Another acceptable thin follow-up is to add an internal wait-readiness layer above runtime-context, so long as it remains derived, non-persistent, non-manifest-backed, and limited to preconditions or blocking reasons rather than actual wait support, close support, or public selector semantics.
Another acceptable thin follow-up is to add an internal wait-candidate layer above runtime-context and wait-readiness, so long as it remains a derived composition helper, non-persistent, non-manifest-backed, non-public, and does not introduce actual wait support, close support, public selector semantics, or mutable lifecycle-manager behavior.
Another acceptable thin follow-up is to add an internal wait-target layer above wait-candidate, so long as it remains a derived projection helper, non-persistent, non-manifest-backed, non-public, and does not introduce actual wait support, close support, public selector semantics, or mutable lifecycle-manager behavior.
Another acceptable thin follow-up is to add an internal wait-request layer above an existing wait-target input, so long as it remains a derived composition helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal future internal request object composed from `{ attemptId, runtime, sessionId }` plus optional explicit constraints such as `timeoutMs` rather than actual wait support, polling, timeout scheduling, settle policy, close coupling, public selector semantics, or lifecycle truth.
That wait-request milestone should stay target-based: it may validate explicit request constraints and shape a future consumer payload, but it must not reintroduce selector resolution, runtime-state reads, readiness recomputation, or any actual wait consumer loop.
Another acceptable thin follow-up is to add an internal wait-consumer preflight layer above an existing wait-request input, so long as it remains a derived composition helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal future internal consumer object composed from an existing wait-request plus capability-aware readiness rather than actual wait support, polling, timeout scheduling, event subscription, adapter invocation, public selector semantics, or lifecycle truth.
That wait-consumer milestone should stay request-based: it may consult adapter capability truth to tell a future internal caller whether the shaped wait request is consumable, but it must not reintroduce selector resolution, runtime-state reads, readiness recomputation, or any actual wait consumer loop.
Another acceptable thin follow-up is to add an internal wait-consume helper above an existing wait-consumer input, so long as it remains a derived async composition helper, non-persistent, non-manifest-backed, non-public, and limited to either returning a structured blocked result or invoking an explicitly injected wait invoker with the existing wait-request rather than actual wait support, polling, timeout scheduling, settle policy, child policy, manifest-backed lifecycle state, public selector semantics, public CLI surface, or lifecycle truth.
That wait-consume milestone should stay consumer-based: it may trust the existing wait-consumer preflight contract and must not reintroduce selector resolution, runtime-state reads, wait-readiness recomputation, identifier revalidation, capability recomputation, or any lifecycle projection. Blocked wait-consumer preflight results must not invoke the injected wait invoker, while supported wait-consumer results may invoke it exactly once with the existing wait-request only.
Another acceptable thin follow-up is to add an internal wait-consume-batch helper above an explicit list of existing wait-consumer inputs, so long as it remains a derived async composition helper, non-persistent, non-manifest-backed, non-public, and limited to sequentially composing the existing single-consumer wait-consume helper rather than actual wait support, polling, timeout scheduling, settle policy, child policy, manifest-backed lifecycle state, public selector semantics, public CLI surface, or summary-policy contracts.
That wait-consume-batch milestone should stay consumer-list-based: it may preserve input order, continue past blocked entries, and fail fast on the first injected invoker error from a supported entry, but it must not reintroduce selector resolution, runtime-state reads, wait-readiness recomputation, identifier revalidation, capability recomputation, lifecycle projection, per-item error aggregation, or summary policy semantics.
Another acceptable thin follow-up is to add an internal close-oriented helper chain above runtime-context, so long as it remains derived, non-persistent, non-manifest-backed, non-public, and limited to close-readiness, close-candidate, or close-target helpers rather than actual close support, public selector semantics, manifest-backed lifecycle state, or mutable lifecycle-manager behavior.
Another acceptable thin follow-up is to tighten that internal close-oriented helper chain into capability-aware close-readiness, so long as shipped runtimes may still resolve to blocked preflight results when `sessionLifecycle` support remains unsupported and no actual close caller is introduced.
Another acceptable thin follow-up is to add an internal close-request layer above an existing close-target input, so long as it remains a derived composition helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal future internal request object composed from `{ attemptId, runtime, sessionId }` rather than actual close support, settle policy, child policy, force or cascade semantics, public selector semantics, or lifecycle truth.
That close-request milestone should stay target-based: it may validate explicit identifier inputs and shape a future consumer payload, but it must not reintroduce selector resolution, runtime-state reads, readiness recomputation, capability checks, or any actual close consumer loop. This slice intentionally stops before any `close-consumer preflight`, because capability-aware closeability already belongs to `close-readiness`.
Another acceptable thin follow-up is to add an internal close-requested event layer above an existing close-request input, so long as it remains a derived projection helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal future internal lifecycle marker composed from `{ attemptId, runtime, sessionId, lifecycleEventKind: "close_requested" }` rather than actual close support, close success truth, manifest-backed lifecycle state, or public selector semantics.
That close-requested-event milestone should stay request-based: it may bridge an existing close-request into the shared lifecycle-event vocabulary, but it must not reintroduce selector resolution, runtime-state reads, readiness recomputation, capability checks, or any actual close consumer loop. In this phase, `close_requested` remains an internal marker only; `closed` still belongs exclusively to `close_recorded`.
Another acceptable thin follow-up is to add an internal close-recorded event layer above an existing close-requested-event input, so long as it remains a derived projection helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal future internal lifecycle marker composed from `{ attemptId, runtime, sessionId, lifecycleEventKind: "close_recorded" }` rather than actual close support, close-consumer preflight, adapter-driven close results, manifest-backed lifecycle state, or public selector semantics.
That close-recorded-event milestone should stay requested-event-based: it may bridge an existing close-requested-event into the shared lifecycle-event vocabulary that already maps `close_recorded` to `closed`, but it must not reintroduce selector resolution, runtime-state reads, readiness recomputation, capability checks, identifier revalidation, or any actual close consumer loop. In this phase, `close_recorded` is still an internal marker projection, not adapter-driven close success truth.
Another acceptable thin follow-up is to add an internal close-consumer preflight layer above an existing close-request input, so long as it remains a derived composition helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal future internal consumer object composed from an existing close-request plus capability-aware readiness rather than actual close support, adapter invocation, event subscription, close success truth, manifest-backed lifecycle state, or public selector semantics.
That close-consumer preflight milestone should stay request-based: it may consult adapter capability truth to tell a future internal caller whether the shaped close request is consumable, but it must not reintroduce selector resolution, runtime-state reads, close-readiness recomputation, identifier revalidation, or any actual close consumer loop. This slice should remain a sibling to close-requested-event and close-recorded-event, not a replacement for those lifecycle markers.
Another acceptable thin follow-up is to add an internal close-consume helper above an existing close-consumer input, so long as it remains a derived async composition helper, non-persistent, non-manifest-backed, non-public, and limited to either returning a structured blocked result or invoking an explicitly injected close invoker with the existing close-request rather than actual close support, event subscription, polling, settle policy, child policy, force or cascade semantics, manifest-backed lifecycle state, or public selector semantics.
That close-consume milestone should stay consumer-based: it may trust the existing close-consumer preflight contract and must not reintroduce selector resolution, runtime-state reads, close-readiness recomputation, identifier revalidation, capability recomputation, or close-requested / close-recorded event projection. Blocked close-consumer preflight results must not invoke the injected close invoker, while supported close-consumer results may invoke it exactly once with the existing close-request only.
Another acceptable thin follow-up is to add an internal close-consume-batch helper above an explicit list of existing close-consumer inputs, so long as it remains a derived async composition helper, non-persistent, non-manifest-backed, non-public, and limited to sequentially composing the existing single-consumer close-consume helper rather than actual close support, event subscription, polling, settle policy, child policy, force or cascade semantics, manifest-backed lifecycle state, public selector semantics, or partial-failure aggregation contracts.
That close-consume-batch milestone should stay consumer-list-based: it may preserve input order, continue past blocked entries, and fail fast on the first injected invoker error from a supported entry, but it must not reintroduce selector resolution, runtime-state reads, close-readiness recomputation, identifier revalidation, capability recomputation, close-requested / close-recorded event projection, per-item error aggregation, or summary policy semantics.
Within that milestone, direct-shell verification and the narrower env-gated Vitest smoke harness may both serve as bounded compatibility probes when they pass locally, but the smoke scaffold still does not become a default validation path or a public reliability promise.
That same milestone should keep scaffold success separate from live-success baselines: an env-gated smoke scaffold may validate detect, launch, or diagnostic behavior even when credential-dependent real execution is unavailable locally.

Exit criteria:

- one runtime can be detected and launched headlessly
- machine-readable output can be parsed
- unsupported capabilities degrade clearly

## Phase 4: Tier 1 Compatibility Slice

Objective:

- make the first public compatibility promise real

Deliverables:

- Tier 1 adapter stubs or implementations
- compatibility docs aligned with actual behavior
- smoke test scaffolding that remains non-default until its reliability boundary broadens

Exit criteria:

- at least one Tier 1 tool works end to end
- other Tier 1 tools have explicit and accurate support boundaries

## Phase 5: Verification and Selection

Objective:

- move from orchestration to quality-aware orchestration

Deliverables:

- verification execution model
- required-check handling
- deterministic selection rules
- artifact summaries

Exit criteria:

- multiple attempts can be compared by validation outcome
- ranking logic is tested
- manifests record verification state coherently

## Phase 6: Harden and Expand

Objective:

- improve ergonomics and prepare for richer future research tracks

Possible deliverables:

- richer checkpoint model
- better compatibility file rendering
- bounded parallelism controls
- dashboard or TUI exploration
- experimental OpenClaw adapter work

Exit criteria:

- experimental features remain clearly labeled
- stable surfaces remain narrow and well-tested

## Phase Rules

- Do not skip directly to later phases if earlier phases leave core contracts unclear.
- Every phase should have explicit exit gates.
- Every phase should define what tests are mandatory before completion.
- The repository now has a usable Git commit baseline, so implementation windows should actively use non-destructive Git commits, branches, and worktrees as archival checkpoints for each completed thin slice or debugging milestone.
