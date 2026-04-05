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
- Phase 5 internal-only work is now in progress through derived verification, selection, promotion, handoff, and handoff-finalization composition layers
- the next implementation windows should continue that internal Phase 5 chain rather than widening public lifecycle or execution surfaces

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

- the current maintainer-only Phase 5 closeout slice now satisfies these exit criteria through internal-only verification, selection, promotion, handoff, and handoff-finalization coverage
- those closeout anchors still preserve non-public, non-persistent, and non-manifest-backed boundaries
- `multiple attempts can be compared by validation outcome` is currently anchored by `tests/verification/compare.test.ts`, `tests/selection/derive.test.ts`, and `tests/selection/promotion-result.test.ts`
- `ranking logic is tested` is currently anchored by `tests/verification/compare.test.ts`, `tests/selection/derive.test.ts`, and `tests/selection/promotion-result.test.ts`, which keep ranking on the current verification-comparator-only path
- downstream canonicalization and blocker projection are covered by the current promotion report, explanation, decision, and target test families without widening ranking policy
- `verification state can be derived coherently` is currently anchored by `tests/verification/derive.test.ts`, `tests/verification/execute.test.ts`, and `tests/verification/artifact-summary.test.ts`
- cross-attempt verification comparison is currently anchored by `tests/verification/compare.test.ts` and `tests/selection/derive.test.ts`
- the current internal close-side convenience layer is now anchored by `tests/control-plane/runtime-state-close-apply.test.ts`, `tests/control-plane/runtime-state-close-apply-batch.test.ts`, and `tests/control-plane/runtime-state-close-target-apply.test.ts`, which keep the new close-oriented apply path internal-only and aligned with the existing wait-side composition shape
- the current handoff-finalization closeout chain is now anchored end-to-end by `tests/selection/handoff-finalization-closeout-summary.test.ts` without widening public lifecycle, execution, or reporting contracts
- the current closeout-decision gate above that chain is now anchored by `tests/selection/handoff-finalization-closeout-decision.test.ts` without widening public review, merge, or lifecycle contracts
- the current closeout-decision single-entry helper is now anchored by `tests/selection/handoff-finalization-closeout-decision-apply.test.ts`, so later repo-internal callers can reuse the current closeout chain through one bounded composition step without widening public consumer or review policy
- the current spawn-side canonical hardening is now anchored by `tests/control-plane/runtime-state-spawn-consume.test.ts`, `tests/control-plane/runtime-state-spawn-apply.test.ts`, `tests/control-plane/runtime-state-spawn-apply-batch.test.ts`, and `tests/control-plane/runtime-state-spawn-headless-apply.test.ts`, which keep malformed spawn-request inputs from reaching injected spawn invokers while preserving consume-first apply composition and without widening public spawn lifecycle support
- the current wait/close target-oriented batch convenience layer is now anchored by `tests/control-plane/runtime-state-wait-target-apply.test.ts` and `tests/control-plane/runtime-state-close-target-apply.test.ts`, which keep the new target-batch helpers internal-only and aligned with the existing single-target apply semantics
- repo-internal bucket boundary coverage is now explicitly anchored by `tests/selection/internal.test.ts`, `tests/control-plane/internal.test.ts`, and `tests/verification/internal.test.ts`, which preserve internal/private staging boundaries without freezing helper-by-helper topology as maintainer policy
- the current barrel-boundary follow-up for this window further tightens `tests/control-plane/internal.test.ts`, `tests/control-plane/index.test.ts`, `tests/selection/internal.test.ts`, and `tests/selection/index.test.ts` around close-side, spawn-side, wait/close target-batch, and closeout-entry helpers, so maintainers can trace those additions without treating them as public-contract expansion
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

Exit criteria:

- experimental features remain clearly labeled
- stable surfaces remain narrow and well-tested

## Phase Rules

- Do not skip directly to later phases if earlier phases leave core contracts unclear.
- Every phase should have explicit exit gates.
- Every phase should define what tests are mandatory before completion.
- The repository now has a usable Git commit baseline, so implementation windows should actively use non-destructive Git commits, branches, and worktrees as archival checkpoints for each completed thin slice or debugging milestone.
