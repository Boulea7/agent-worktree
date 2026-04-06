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

Acceptable thin follow-ups in this phase include:

- a bounded internal `codex-cli` execution contract with real detection, `codex exec --json` execution, minimal parsing, and an env-gated smoke scaffold, while session lifecycle work remains deferred
- internal adapter hardening around executable probing, parser-noise boundaries, profile-aware passthrough, or relay-compatible env overlays, so long as those behaviors remain internal-only and do not become public CLI or config contracts
- additive attempt provenance such as `sourceKind` and `parentAttemptId`, so long as those fields remain audit metadata and do not widen the public CLI into delegated-runtime lifecycle commands
- derived internal control-plane or state helpers built from attempt provenance and bounded execution observation, so long as they remain non-persistent, non-manifest-backed, and outside the public lifecycle contract
- internal-only lifecycle experimentation around delegated-child, wait-oriented, or close-oriented composition, so long as it stops before public spawn, wait, close, resume, or execution surfaces
- bounded compatibility probes such as direct-shell checks and env-gated smoke scaffolds, so long as they remain non-default diagnostics and do not become a public reliability promise

This phase guide should describe capability boundaries and thin-slice priorities, not freeze internal helper names or internal module topology as durable documentation contracts.

Exit criteria:

- one runtime can be detected and launched headlessly
- machine-readable output can be parsed
- unsupported capabilities degrade clearly

## Phase 4: Tier 1 Compatibility Slice

Objective:

- establish the first bounded public compatibility baseline

Deliverables:

- Tier 1 adapter stubs or implementations
- compatibility docs aligned with actual behavior
- smoke test scaffolding that remains non-default until its reliability boundary broadens

Exit criteria:

- at least one Tier 1 tool has a bounded public compatibility smoke path
- other Tier 1 tools have explicit and accurate support boundaries

Current closeout status:

- the current baseline satisfies these exit criteria through `doctor`, `compat probe`, and the bounded public `compat smoke codex-cli` path
- the current internal continuation now spans the current Phase 5 closeout checkpoints plus bounded-parallelism Phase 6 prep through spawn-budget, spawn-candidate, spawn-batch-plan, spawn-batch-items, spawn-batch-items-apply, spawn-batch-headless-apply-items, spawn-batch-headless-apply, and the current headless batch bridge through wait/close target-batch layers
- the next implementation windows should continue that internal-only continuation rather than widening public lifecycle or execution surfaces

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
- verification state can be derived and compared coherently across attempts

Current closeout status:

- the current maintainer-only Phase 5 closeout slice now marks the current thin-slice closeout checkpoint for the internal Phase 5 chain through internal-only verification, selection, promotion, handoff, and handoff-finalization coverage; it does not claim full Phase 5 completion for every future internal continuation
- those closeout anchors still preserve non-public, non-persistent, and non-manifest-backed boundaries
- later thin slices may still exercise Phase 3 execution and control-plane foundations while extending the internal Phase 5 chain; that overlap should be described explicitly rather than treated as a full phase jump
- `multiple attempts can be compared by validation outcome` is currently anchored by `tests/verification/compare.test.ts`, `tests/selection/derive.test.ts`, and `tests/selection/promotion-result.test.ts`
- `ranking logic is tested` is currently anchored by `tests/verification/compare.test.ts`, `tests/selection/derive.test.ts`, and `tests/selection/promotion-result.test.ts`, which keep ranking on the current verification-comparator-only path
- downstream canonicalization and blocker projection are covered by the current promotion report, explanation, decision, and target test families without widening ranking policy
- `verification state can be derived coherently` is currently anchored by `tests/verification/derive.test.ts`, `tests/verification/execute.test.ts`, and `tests/verification/artifact-summary.test.ts`
- cross-attempt verification comparison is currently anchored by `tests/verification/compare.test.ts` and `tests/selection/derive.test.ts`
- the current internal close-side convenience layer is now anchored by `tests/control-plane/runtime-state-close-apply.test.ts`, `tests/control-plane/runtime-state-close-apply-batch.test.ts`, and `tests/control-plane/runtime-state-close-target-apply.test.ts`, which keep the new close-oriented apply path internal-only and aligned with the existing wait-side composition shape
- the current handoff-finalization closeout chain is now anchored end-to-end by `tests/selection/handoff-finalization-closeout-summary.test.ts` without widening public lifecycle, execution, or reporting contracts
- the current closeout-decision gate above that chain is now anchored by `tests/selection/handoff-finalization-closeout-decision.test.ts` without widening public review, merge, or lifecycle contracts
- the current closeout-decision single-entry helper is now anchored by `tests/selection/handoff-finalization-closeout-decision-apply.test.ts`, where it remains a post-apply convenience entry above the current closeout chain and still returns `undefined` for missing or non-finalizable request summaries rather than widening into a broader blocker-producing policy surface
- the current spawn-side canonical hardening is now anchored by `tests/control-plane/runtime-state-spawn-consume.test.ts`, `tests/control-plane/runtime-state-spawn-apply.test.ts`, `tests/control-plane/runtime-state-spawn-apply-batch.test.ts`, and `tests/control-plane/runtime-state-spawn-headless-apply.test.ts`, which keep malformed spawn-request inputs from reaching injected spawn invokers while preserving consume-first apply composition and without widening public spawn lifecycle support
- the current direct spawn projection hardening is now anchored by `tests/control-plane/runtime-state-spawn-recorded-event.test.ts` and `tests/control-plane/runtime-state-spawn-headless-input.test.ts`, which keep malformed requested-event, lineage, guardrail, abort-signal, or execution-seed inputs from leaking raw runtime `TypeError`s while preserving the existing internal-only projection shape
- the current wait/close target-oriented batch convenience layer is now anchored by `tests/control-plane/runtime-state-wait-target-apply.test.ts`, `tests/control-plane/runtime-state-close-target-apply.test.ts`, and `tests/control-plane/internal.test.ts`, which together keep the target-batch helpers internal-only, explicitly barrel-scoped, and aligned with the existing single-target apply semantics without widening public lifecycle or execution contracts
- the current top-level wait/close consumer guardrails are now anchored by `tests/control-plane/runtime-state-wait-consume.test.ts` and `tests/control-plane/runtime-state-close-consume.test.ts`, which keep malformed `consumer` and `consumer.readiness` containers inside bounded validation errors instead of leaking raw runtime exceptions
- the current promotion provenance hardening is now anchored by `tests/selection/promotion.test.ts`, `tests/selection/promotion-result.test.ts`, and `tests/selection/promotion-audit.test.ts`, which keep invalid `sourceKind` values failing at the candidate/result seam instead of drifting into later promotion layers
- the current public serializer/catalog hardening is now anchored by `tests/cli/public-serialize.test.ts`, `tests/compat/index.test.ts`, and the `compat list` / `compat show` JSON-contract assertions in `tests/cli/index.test.ts`, which keep public string slots, compat catalog reads, and CLI-visible catalog fields bounded without widening machine-readable CLI output
- repo-internal bucket boundary coverage is now explicitly anchored by `tests/selection/internal.test.ts`, `tests/control-plane/internal.test.ts`, and `tests/verification/internal.test.ts`, which preserve internal/private staging boundaries and, where needed, keep the current repo-internal barrel inventory explicit without treating it as a public contract
- the current barrel-boundary follow-up for this window further tightens `tests/control-plane/internal.test.ts`, `tests/control-plane/index.test.ts`, `tests/selection/internal.test.ts`, and `tests/selection/index.test.ts` around close-side, spawn-side, wait/close target-batch, closeout-entry helpers, and the intentionally narrower default control-plane / selection entry points, so maintainers can trace those additions without treating them as public-contract expansion
- required checks that end in `skipped` remain blocking for verification summaries and downstream promotion semantics, while env-gated `codex-cli` smoke remains a separate compatibility concern rather than a Phase 5 closeout gate
- if those test files are renamed or reorganized, maintainers should update these traceability anchors in the same change
- the next implementation windows should prefer maintainer traceability or new evidence-backed internal follow-ups rather than expanding public lifecycle or execution contracts

## Phase 6: Harden and Expand

Objective:

- improve ergonomics and prepare for richer future research tracks

Possible deliverables:

- richer checkpoint model
- better compatibility file rendering
- bounded parallelism controls
- dashboard or TUI exploration
- experimental OpenClaw adapter work

Current thin-slice status:

- the first thin Phase 6 follow-up now stays internal-only and evidence-backed through bounded spawn parallelism budget projection from existing guardrails rather than widening public orchestration or lifecycle surfaces
- that prep layer keeps the current spawn-readiness vocabulary unchanged while making remaining child-slot and depth-allowance state explicit for later internal consumers
- the next thin Phase 6 follow-up now also stays internal-only by composing that budget projection directly into the current spawn-candidate seam, so later internal consumers can read context, budget, and readiness together without widening downstream request, apply, or public target contracts
- the current follow-up above that candidate seam now also stays internal-only by composing the existing candidate plus a proposed sibling batch count into a bounded spawn batch planning projection, so later internal consumers can evaluate child-slot fit without widening spawn-target, spawn-request, spawn-apply, or public orchestration contracts
- the current follow-up above that planning seam now also stays internal-only by composing the existing plan plus explicit child attempt identifiers and a source kind into ordered spawn batch items, so later internal consumers can bridge bounded planning into existing batch consumers without widening spawn-apply, headless execution, queue truth, or public orchestration contracts
- the current follow-up above that batch-items seam now also stays internal-only by composing the existing batch-items result directly into the current spawn-apply-batch path, so later internal consumers can consume a bounded convenience seam without widening headless execution, queue truth, scheduler truth, or public orchestration contracts
- the current follow-up above that batch-items seam now also stays internal-only by composing the existing batch-items result plus ordered headless execution seeds into request-preserving headless-apply batch items, so later internal consumers can bridge bounded planning into the current headless apply/execute batch path without widening headless execution truth, queue truth, scheduler truth, or public orchestration contracts
- the current follow-up above that projection seam now also stays internal-only by composing the existing headless-apply-items result directly into the current spawn-headless-apply-batch path, so later internal consumers can consume one bounded convenience seam without widening headless execution truth, queue truth, scheduler truth, or public orchestration contracts
- maintainers should anchor these prep slices through repo-internal control-plane tests such as `tests/control-plane/runtime-state-spawn-budget.test.ts`, `tests/control-plane/runtime-state-spawn-readiness.test.ts`, `tests/control-plane/runtime-state-spawn-candidate.test.ts`, `tests/control-plane/runtime-state-spawn-batch-plan.test.ts`, `tests/control-plane/runtime-state-spawn-batch-items.test.ts`, `tests/control-plane/runtime-state-spawn-batch-items-apply.test.ts`, `tests/control-plane/runtime-state-spawn-batch-headless-apply-items.test.ts`, `tests/control-plane/runtime-state-spawn-batch-headless-apply.test.ts`, `tests/control-plane/internal.test.ts`, and `tests/control-plane/index.test.ts`
- the current downstream headless batch bridge is now anchored by `tests/control-plane/runtime-state-spawn-headless-input-batch.test.ts`, `tests/control-plane/runtime-state-spawn-headless-apply-batch.test.ts`, `tests/control-plane/runtime-state-spawn-headless-execute-batch.test.ts`, `tests/control-plane/runtime-state-spawn-headless-record-batch.test.ts`, `tests/control-plane/runtime-state-spawn-headless-view-batch.test.ts`, `tests/control-plane/runtime-state-spawn-headless-context-batch.test.ts`, `tests/control-plane/runtime-state-spawn-headless-wait-candidate-batch.test.ts`, `tests/control-plane/runtime-state-spawn-headless-wait-target-batch.test.ts`, `tests/control-plane/runtime-state-spawn-headless-close-candidate-batch.test.ts`, and `tests/control-plane/runtime-state-spawn-headless-close-target-batch.test.ts`; paired with the shared-fixture traceability assertions in `tests/control-plane/runtime-state-spawn-batch-headless-apply.test.ts`, these anchors keep the current headless batch bridge evidence-backed without widening public lifecycle or execution contracts
- that budget projection remains internal-only, non-persistent, non-manifest-backed, and non-public; it does not imply queueing, scheduler truth, runtime enforcement, or a public parallelism contract

Exit criteria:

- experimental features remain clearly labeled
- stable surfaces remain narrow and well-tested

## Phase Rules

- Do not skip directly to later phases if earlier phases leave core contracts unclear.
- Every phase should have explicit exit gates.
- Every phase should define what tests are mandatory before completion.
- The repository now has a usable Git commit baseline, so implementation windows should actively use non-destructive Git commits, branches, and worktrees as archival checkpoints for each completed thin slice or debugging milestone.
