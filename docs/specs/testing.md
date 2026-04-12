# Testing Strategy

This document defines the intended testing expectations for future implementation work.

The goal is to make later coding sessions predictable enough that an automated coding agent can work against explicit quality gates instead of guessing.

## Principles

- tests are part of the engineering contract
- deterministic checks outrank subjective confidence
- unit tests cover silent logic regressions
- integration tests cover workflow boundaries
- Tier 1 compatibility should keep explicit smoke expectations, even when only one runtime currently has an implemented public smoke path

## Test Layers

### Unit Tests

Unit tests should be the default for:

- config parsing
- config validation
- implemented precedence resolution
- branch and worktree naming
- runtime manifest serialization
- manifest status vocabulary and serialization
- capability mapping
- safety-intent mapping
- machine-readable output parsing
- selection helpers
- idempotency helpers
- invalid-manifest classification
- cleanup outcome serialization

### Contract Tests

Contract tests should validate:

- JSON output schemas
- runtime-manifest shape
- config examples
- generated compatibility files if generation is added later
- machine-readable compatibility diagnostics payloads for `doctor`
- default list visibility for cleaned attempts
- additive provenance fields survive machine-readable create/list/cleanup flows
- machine-readable `doctor` payloads report `adapterStatus` and `detected` without leaking internal runtime metadata
- machine-readable CLI payloads do not leak internal verification/selection/promotion/handoff metadata, execution-derived state, runtime-context/lifecycle-disposition metadata, delegated-child metadata, delegated/headless bridge metadata, or wait/close metadata
- invalid manifests fail the command in machine-readable output
- missing `manifest.json` files in attempt directories fail the command in machine-readable output
- cleanup returns structured outcomes

### Integration Tests

Integration tests should validate:

- implemented attempt create/list/cleanup lifecycle only
- implemented worktree creation, listing, and cleanup flow only
- local-only file boundaries
- cleanup preserves the manifest record
- cleanup preserves additive provenance metadata
- invalid manifests fail loudly rather than being skipped
- structured machine-readable cleanup outcomes

Integration tests in the current phase should not require `attach`, `stop`, `checkpoint`, `merge`, or broader verification workflows before those public contracts exist.

### Tool Smoke Tests

In the current Phase 4 public compatibility baseline, only `codex-cli` has an implemented public smoke path.
Other Tier 1 runtimes should keep explicit descriptor-only support boundaries until broader execution-backed slices land.

Current smoke tests should verify:

- tool detection
- bounded compatibility-probe execution scaffolding
- structured output parsing
- guidance file loading
- public/non-public boundary preservation

In the current limited execution and compatibility phase, adapter-foundation work SHOULD still rely on unit and contract tests rather than tool-launch smoke tests as the primary validation path.
`codex-cli` smoke coverage SHOULD remain an env-gated smoke scaffold and MUST NOT become part of the default repository test pass.
The bounded internal execution contract MAY be re-verified through both direct-shell invocation and the narrower Vitest smoke harness when they pass locally, but that smoke coverage still remains a secondary compatibility probe rather than the primary repository validation path.
The env-gated smoke scaffold SHOULD assert bounded detection, launch, and diagnostic capture rather than successful model completion; credential-dependent live-success baselines, such as real Codex execution that requires `OPENAI_API_KEY`, SHOULD be tracked separately and may drift by environment.

## Unit Test Requirements By Subsystem

## Config

Must test:

- missing required fields
- unknown-key handling
- reserved extension namespace behavior
- implemented precedence rules
- example config validity

## Runtime Manifest

Must test:

- required field presence
- opaque ID handling
- additive unknown-field tolerance
- status vocabulary validity
- condition derivation later, if introduced
- additive `repoRoot` handling
- thin `sourceKind` / `parentAttemptId` validation rules
- cleanup-state persistence when a worktree is removed
- attempt directory and manifest `attemptId` consistency
- backward compatibility for manifests that predate lineage/source fields

## Worktree Logic

Must test:

- branch naming
- handle naming
- duplicate-attempt behavior
- cleanup safety
- repeat-operation handling
- cleanup targets `--attempt-id`
- cleaned attempts remain listable by default
- invalid manifests fail explicitly
- already-cleaned attempts return predictable idempotent results
- missing-worktree convergence is covered explicitly
- provenance metadata is preserved across create, list, and cleanup
- lineage/source metadata does not get conflated with live `session` state

## Adapter Layer

Must test:

- capability detection
- command rendering
- static descriptor resolution
- missing-feature degradation
- bounded executable probing behavior for `codex-cli`
- detect and execution consistency across the shared probing helper boundary
- canonical event normalization once a bounded execution path exists
- parser fallback behavior for unknown events
- line-oriented parse failures when malformed JSONL is encountered
- bracket-prefixed parser-noise heuristics and malformed bracket-prefixed JSON-looking failures

The earliest Phase 3 slice was static.
In the current limited `codex-cli` execution sub-slice, tests SHOULD focus on resolver behavior, machine-checkable rendered commands, a bounded internal execution contract, minimal parser behavior, and structured degradation payloads.
That includes executable probing contract tests for the default subprocess runner, explicit confirmation that injected runners do not silently inherit the default `PATH` scan policy, and fixture-driven parser tests for bracket-prefixed log noise versus malformed JSON-looking lines.
If a thin internal `codex-cli` profile-aware execution path is added, tests SHOULD verify explicit `--profile` passthrough, loud rejection for blank or whitespace-only profiles, prompt-last and `--ephemeral` ordering preservation, omitted-profile compatibility with existing command shapes, unchanged default-runner relay-compatible env-overlay behavior, unchanged custom-runner behavior unless an explicit internal environment resolver is supplied, and explicit confirmation that profile metadata does not widen public CLI payloads, runtime manifests, or lifecycle truth.
If a thin internal execution observation summary is layered on top of canonical events, tests SHOULD verify its derivation from existing canonical events rather than treating it as a separate persistence or CLI contract.
If a bounded execution path starts consuming attempt lineage to emit internal control-plane snapshots, tests SHOULD verify that invalid lineage is rejected before subprocess launch, that derived snapshots remain execution-result-only metadata, and that omitted lineage does not create synthetic control-plane output.
If a separate internal runtime-state layer is added on top of execution results, tests SHOULD verify that execution-session records remain derived, non-persistent, and non-public, that omitted lineage does not create synthetic runtime-state records, and that deterministic indexes fail loudly on duplicate keys instead of merging mutable state.
If a read-only query/view layer is added on top of internal runtime-state, tests SHOULD verify selector validation, lookup-by-attempt and lookup-by-session behavior, parent/child traversal, and explicit separation from mutable registry or lifecycle-manager semantics.
Broad cross-runtime environment injection, general session lifecycle tests, MCP execution tests, and cross-runtime execution parity SHOULD wait for a later phase.

## Internal Control Plane

Must test:

- pure derivation of node lineage from `attemptId` / `sourceKind` / `parentAttemptId`
- bounded lifecycle-state classification from internal observation inputs
- guardrail validation for additive internal limits such as depth or child count
- parent/child indexing without parent-existence validation or delegated-runtime inference
- explicit confirmation that internal control-plane helpers do not widen the public CLI or manifest persistence contract

## Internal Capability Buckets

The remaining internal-only sections describe coverage at the capability-bucket level rather than as helper-by-helper topology. Tests in this part of the repo should continue to prove boundaries, failure modes, and deterministic derivation; where a repo-internal barrel needs stricter widening protection, tests MAY also keep the current runtime export inventory explicit without turning those internal helpers into public documentation contracts.

Current buckets to preserve are:

- execution-derived state and read models
- runtime context and lifecycle disposition
- delegated-child or spawn-oriented preflight and composition
- delegated or headless execution bridges
- wait- and close-oriented preflight or consume paths

Representative expectations across those buckets:

- derived records, contexts, and lifecycle classifications remain non-persistent, non-public, and deterministic
- supplied inputs remain immutable across these derived internal buckets unless a later spec explicitly promotes a mutable contract
- selectors fail loudly for invalid or conflicting input and return `undefined` for legitimate misses without producing partial objects
- parent/child traversal preserves input order and tolerates unresolved ancestry unless an explicit guardrail requires a blocker
- delegated-child preflight keeps inherited guardrails, readiness blockers, and capability checks stable without implying actual spawn support
- delegated or headless bridges preserve explicit input order, fail fast on the first injected error, and avoid widening into public execution or lifecycle surfaces
- wait and close paths preserve the same bounded behavior: blocked entries stay blocked, supported entries invoke only the injected request, and no helper becomes lifecycle truth
- every internal bucket continues to prove that public CLI payloads, runtime manifests, and durable state stay unchanged unless a separate spec promotes that surface

## Execution-Derived State And Read Models

Must test:

- execution-derived records and read models remain pure derivations from attempt lineage, bounded execution observation, and any optional internal session snapshot already produced by the bounded execution path
- selector validation, lookup-by-attempt, lookup-by-session, and parent/child traversal stay deterministic, return `undefined` for legitimate misses, and fail loudly for invalid or conflicting selectors without creating partial objects
- parent/child indexing preserves input order and tolerates unresolved ancestry unless an explicit guardrail requires a blocker
- derived records, indexes, and views remain internal-only, non-public, non-persistent, non-manifest-backed, and separate from mutable registry or lifecycle-manager semantics
- execution-derived state and read-model tests continue to prove that public CLI payloads, runtime manifests, and durable state do not widen while these internal buckets evolve

## Runtime Context And Lifecycle Disposition

Must test:

- runtime-context and lifecycle-disposition metadata derive only from the existing internal read models and remain deterministic, bounded, and non-public
- selector-driven context assembly preserves the same loud-failure behavior for invalid selectors and the same `undefined` behavior for legitimate misses without reopening selector topology as a public contract
- shared lifecycle-disposition extraction preserves stable classification and blocker ordering for session-known, terminal, descendant-impact, and related readiness facts without becoming mutable lifecycle truth
- runtime-context and lifecycle-disposition helpers do not widen public CLI payloads, manifest persistence, or durable runtime-state semantics

## Delegated-Child Or Spawn-Oriented Preflight And Composition

Must test:

- delegated-child preflight remains a bounded internal composition over existing context, lineage, inherited guardrails, capability checks, and explicit child inputs; it must not decide child branches, child worktrees, child runtime mode, prompt/task payloads, delegated-runtime approvals, or other actual spawn semantics
- spawn-oriented composition keeps request shaping, additive lineage or marker projection, and any derived effects metadata minimal and internal-only; no helper becomes child-creation truth or terminal lifecycle truth
- when a delegated-child composition step combines injected consumption with derived effects metadata, it must consume first and must not surface partial effects if the consume step fails
- invalid delegated-child inputs such as blank child attempt identifiers, parent/child identity collisions, invalid selector state, or invalid `sourceKind` fail loudly without wrapper error contracts
- injected spawn invokers are called only through the bounded delegated-child consume or apply surfaces, exactly once per supported request; failures surface directly, empty batches do not synthesize work, ordered batches preserve input order, and supported batches fail fast on the first injected or derivation error without partial aggregation or summary-policy output
- delegated-child and spawn-oriented tests continue to prove that request/readiness composition, branch/worktree planning boundaries, and public CLI or manifest contracts remain non-widening

## Delegated Or Headless Execution Bridges

Must test:

- delegated or headless bridge metadata derives only from existing internal delegated-child composition metadata plus explicit execution seeds or injected bounded executors, without reopening selectors, views, runtime launch, or planning topology as new contracts
- bounded execution shaping continues to derive `attempt` from child lineage only, whitelist only the explicit execution-seed fields this phase already allows, and reject dynamic or unexpected payload carry-through
- record/view/context bridge steps remain pure derivations over existing internal execution results and shared generic derivation helpers; missing required execution data fails loudly instead of producing synthetic record or context truth
- ordered bridge batches preserve input order, keep shared derived inputs reusable where applicable, return minimal empty results for empty input, and fail fast on the first bridge, executor, selector, readiness, or record-derivation error without per-item summary contracts
- delegated or headless bridge tests continue to prove that these helpers remain internal-only, non-public, non-manifest-backed, not child-creation truth, not runtime truth, not terminal lifecycle truth, and not delegated runtime support

## Wait- And Close-Oriented Preflight Or Consume Paths

Must test:

- wait- and close-oriented preflight, minimal target/request shaping, bounded lifecycle markers, capability-aware consumer preflight, and consume paths remain bounded derivations over existing internal context, read models, requests, and capability checks rather than new public selector or lifecycle surfaces
- readiness and candidate composition preserves deterministic blocker ordering, selector validation, and `undefined` behavior for legitimate misses; target and request shaping stays minimal, including the existing positive-integer-only `timeoutMs` contract for wait requests
- capability-aware preflight remains stable for shipped and unknown runtimes: unsupported `sessionLifecycle` capability stays blocked with the existing bounded vocabulary, supported entries remain eligible, and blocked entries never invoke injected wait or close invokers
- consume paths invoke only the original injected request exactly once for supported entries, keep blocked entries visible, preserve ordered batch execution, continue past blocked entries, and fail fast on the first supported-entry invoker error without per-item aggregation or summary-policy output
- close-side event projection remains bounded: `close_requested` stays a marker rather than close-success truth, `close_recorded` remains the first close-side marker that maps to shared `closed`, and neither wait nor close helpers become adapter-driven success truth, public lifecycle truth, manifest persistence, or durable state

## Verification Layer

Must test:

- required-check evaluation
- pass/fail aggregation
- selection tie-breaking helpers
- incomplete verification payload handling

## Phase-Based Minimums

### Phase 0: Docs and Specs

- example validation
- Markdown link checks

### Phase 1: Core Scaffold

- config tests
- manifest tests
- example contract tests
- machine-readable CLI contract tests for implemented commands

### Phase 2: Worktree Lifecycle

- naming tests
- lifecycle tests
- cleanup safety tests once cleanup is implemented
- cleanup contract tests for manifest retention
- list contract tests for cleaned entries and invalid-manifest failures

### Phase 3: Adapter Layer

- capability mapping tests
- adapter catalog and resolver tests
- command rendering contract tests
- structured degradation tests
- bounded `codex-cli` detect and internal execution tests
- executable probing, profile passthrough, env-overlay, and parser-boundary tests for the bounded `codex-cli` path
- execution observation, lineage carry-through, and internal session/control-plane derivation tests that stay non-public
- runtime-state, runtime-context, and lifecycle-disposition tests that prove deterministic derived behavior without introducing mutable lifecycle truth
- delegated-child or spawn-oriented preflight, request, lineage, event, consume, apply, and headless-bridge tests that preserve input order, fail fast on injected errors, and avoid widening into public spawn semantics
- wait- and close-oriented readiness, target, request, consumer, consume, apply, and target-apply tests that keep blocked entries blocked, invoke only the injected request when supported, preserve ordered fail-fast batch behavior, and avoid widening into public lifecycle semantics
- explicit non-widening assertions that public CLI payloads, runtime manifests, and durable state stay unchanged while these internal buckets evolve

Later execution-expansion phases can add broader multi-runtime smoke coverage, public execution or lifecycle surfaces, and any durable runtime-state or session-tree persistence. Until a later spec or RFC promotes those ideas, tests in this phase should treat them as deferred rather than as current contracts.

### Phase 4: Tier 1 Compatibility Slice

- machine-readable compatibility diagnostics tests for `doctor`
- machine-readable compatibility probe tests for `compat probe <tool>`
- machine-readable compatibility smoke tests for `compat smoke <tool>`
- explicit public/non-public boundary tests for runtime diagnostics payloads
- explicit public/non-public boundary tests for runtime probe payloads
- explicit public/non-public boundary tests for runtime smoke payloads
- adapter detection tests that keep descriptor-only runtimes unprobed in public output
- locked `probeStatus` and `diagnosis.code` vocabularies for public probe output
- locked `smokeStatus` and `diagnosis.code` vocabularies for public smoke output
- gate-disabled success-envelope coverage for env-gated public smoke
- env-gated smoke scaffolding that remains non-default

The current public baseline satisfies this Phase 4 test slice through `doctor`, `compat probe`, `compat smoke`, and explicit descriptor-only boundary coverage.

### Phase 5: Internal-Only Verification and Selection

- internal-only verification aggregation tests
- internal-only selection, promotion, handoff, and handoff-finalization composition tests
- internal-only grouped finalization reporting tests for stable explanation-code grouping, count rollups, and disposition derivation
- internal-only closeout-chain tests for report-ready, grouped projection, grouped reporting, closure, and closeout decision composition
- internal-only barrel-boundary assertions for intentionally narrow default entry points
- explicit denylist and allowlist tests that keep wider repo-internal selection/control-plane helpers out of the default barrels
- failure-mode tests for request validation, readiness validation, and fail-fast batch composition across the current internal-only capability buckets

## Definition Of Done For Future Coding Tasks


A future implementation task should not be considered complete unless:

- relevant unit tests were added or updated
- relevant contract tests still pass
- docs were updated if the public surface changed
- no ignored local files leaked into tracked output
