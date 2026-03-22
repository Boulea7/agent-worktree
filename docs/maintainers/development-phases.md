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
Another acceptable thin follow-up is to add an internal wait-readiness layer above runtime-context, so long as it remains derived, non-persistent, non-manifest-backed, and limited to preconditions or blocking reasons rather than actual wait support, close support, or public selector semantics.
Another acceptable thin follow-up is to add an internal wait-candidate layer above runtime-context and wait-readiness, so long as it remains a derived composition helper, non-persistent, non-manifest-backed, non-public, and does not introduce actual wait support, close support, public selector semantics, or mutable lifecycle-manager behavior.
Another acceptable thin follow-up is to add an internal wait-target layer above wait-candidate, so long as it remains a derived projection helper, non-persistent, non-manifest-backed, non-public, and does not introduce actual wait support, close support, public selector semantics, or mutable lifecycle-manager behavior.
Another acceptable thin follow-up is to add an internal wait-request layer above an existing wait-target input, so long as it remains a derived composition helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal future internal request object composed from `{ attemptId, runtime, sessionId }` plus optional explicit constraints such as `timeoutMs` rather than actual wait support, polling, timeout scheduling, settle policy, close coupling, public selector semantics, or lifecycle truth.
That wait-request milestone should stay target-based: it may validate explicit request constraints and shape a future consumer payload, but it must not reintroduce selector resolution, runtime-state reads, readiness recomputation, or any actual wait consumer loop.
Another acceptable thin follow-up is to add an internal wait-consumer preflight layer above an existing wait-request input, so long as it remains a derived composition helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal future internal consumer object composed from an existing wait-request plus capability-aware readiness rather than actual wait support, polling, timeout scheduling, event subscription, adapter invocation, public selector semantics, or lifecycle truth.
That wait-consumer milestone should stay request-based: it may consult adapter capability truth to tell a future internal caller whether the shaped wait request is consumable, but it must not reintroduce selector resolution, runtime-state reads, readiness recomputation, or any actual wait consumer loop.
Another acceptable thin follow-up is to add an internal close-oriented helper chain above runtime-context, so long as it remains derived, non-persistent, non-manifest-backed, non-public, and limited to close-readiness, close-candidate, or close-target helpers rather than actual close support, public selector semantics, manifest-backed lifecycle state, or mutable lifecycle-manager behavior.
Another acceptable thin follow-up is to tighten that internal close-oriented helper chain into capability-aware close-readiness, so long as shipped runtimes may still resolve to blocked preflight results when `sessionLifecycle` support remains unsupported and no actual close caller is introduced.
Another acceptable thin follow-up is to add an internal close-request layer above an existing close-target input, so long as it remains a derived composition helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal future internal request object composed from `{ attemptId, runtime, sessionId }` rather than actual close support, settle policy, child policy, force or cascade semantics, public selector semantics, or lifecycle truth.
That close-request milestone should stay target-based: it may validate explicit identifier inputs and shape a future consumer payload, but it must not reintroduce selector resolution, runtime-state reads, readiness recomputation, capability checks, or any actual close consumer loop. This slice intentionally stops before any `close-consumer preflight`, because capability-aware closeability already belongs to `close-readiness`.
Another acceptable thin follow-up is to add an internal close-requested event layer above an existing close-request input, so long as it remains a derived projection helper, non-persistent, non-manifest-backed, non-public, and limited to a minimal future internal lifecycle marker composed from `{ attemptId, runtime, sessionId, lifecycleEventKind: "close_requested" }` rather than actual close support, close success truth, manifest-backed lifecycle state, or public selector semantics.
That close-requested-event milestone should stay request-based: it may bridge an existing close-request into the shared lifecycle-event vocabulary, but it must not reintroduce selector resolution, runtime-state reads, readiness recomputation, capability checks, or any actual close consumer loop. In this phase, `close_requested` remains an internal marker only; `closed` still belongs exclusively to `close_recorded`.
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
