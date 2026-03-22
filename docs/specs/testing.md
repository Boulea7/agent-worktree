# Testing Strategy

This document defines the intended testing expectations for future implementation work.

The goal is to make later coding sessions predictable enough that an automated coding agent can work against explicit quality gates instead of guessing.

## Principles

- tests are part of the engineering contract
- deterministic checks outrank subjective confidence
- unit tests cover silent logic regressions
- integration tests cover workflow boundaries
- Tier 1 compatibility should eventually have smoke coverage

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
- default list visibility for cleaned attempts
- additive provenance fields survive machine-readable create/list/cleanup flows
- machine-readable CLI payloads do not leak internal wait-consume or wait-consume-batch metadata
- invalid manifests fail the command in machine-readable output
- missing `manifest.json` files in attempt directories fail the command in machine-readable output
- cleanup returns structured outcomes

### Integration Tests

Integration tests should validate:

- attempt creation lifecycle
- worktree lifecycle
- session attach and stop behavior
- checkpoint recording
- merge and cleanup workflow
- verification execution flow
- local-only file boundaries
- cleanup preserves the manifest record
- cleanup preserves additive provenance metadata
- invalid manifests fail loudly rather than being skipped

### Tool Smoke Tests

Once runtime execution is implemented, smoke coverage should exist for:

- Claude Code
- Codex CLI
- Gemini CLI
- OpenCode

Smoke tests should verify:

- tool detection
- headless execution path
- structured output parsing
- guidance file loading

Before real runtime execution exists, adapter-foundation work SHOULD rely on unit and contract tests rather than tool-launch smoke tests.
In the current limited execution phase, `codex-cli` smoke coverage SHOULD remain an env-gated smoke scaffold and MUST NOT become part of the default repository test pass.
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

## Internal Runtime State

Must test:

- derived execution-session records built from attempt lineage, execution observation, and optional internal session snapshots
- omitted-lineage behavior that returns no execution-session record
- fallback derivation when an internal session snapshot is absent but bounded execution observation exists
- deterministic indexing by `attemptId` and optional `sessionId`
- loud failures for duplicate `attemptId` or duplicate non-empty `sessionId`
- explicit confirmation that internal runtime-state helpers do not widen public CLI payloads or manifest persistence
- read-only query/view helpers that resolve records by `attemptId` or `sessionId`
- selector validation for missing, conflicting, or blank lookup keys
- parent/child traversal that preserves input order and tolerates missing parents without treating them as runtime truth

## Internal Runtime Context

Must test:

- context derivation from the existing read model plus a selector
- lookup-by-`attemptId` and lookup-by-`sessionId` context resolution
- loud failures for invalid selectors inherited from the read model contract
- `undefined` results for selector misses without returning partial context objects
- unresolved-parent handling that tolerates missing parent records without graph validation
- child-record ordering that is preserved from the read model
- explicit confirmation that internal runtime-context helpers do not widen public CLI payloads, manifest persistence, or lifecycle semantics

## Internal Lifecycle Disposition

Must test:

- lifecycle-disposition derivation from an existing internal runtime-context
- `alreadyFinal` derivation for terminal lifecycle states such as `completed`, `failed`, and `closed`
- `hasKnownSession` derivation from existing context session knowledge without inventing new session truth
- `wouldAffectDescendants` derivation from existing child-attempt presence without subtree policy expansion
- unresolved-parent handling that remains neutral and does not become a new blocker source
- explicit confirmation that internal lifecycle-disposition helpers do not resolve adapter capability, widen public CLI payloads, widen manifest persistence, or become lifecycle truth

## Internal Spawn Readiness

Must test:

- spawn-readiness derivation from an existing internal runtime-context plus runtime-state view
- guardrail carry-through from execution lineage into internal session snapshots and execution-session records
- readiness success when the selected context is active, has a known session, and has no blocking child/depth guardrail violations
- child-limit blocking when `maxChildren` is present and the selected context already has the maximum allowed child attempts
- depth-limit blocking when `maxDepth` is present and the next delegated child would exceed the resolved lineage depth budget
- lineage-depth-unknown blocking when `maxDepth` is present and ancestry contains unresolved gaps
- lineage-depth-unknown blocking when ancestry is cyclic or otherwise cannot be resolved into a stable parent chain
- unresolved ancestry remains neutral when `maxDepth` is absent
- deterministic blocking-reason ordering for lifecycle, session-known, lineage-depth, depth-limit, and child-limit blockers
- explicit confirmation that internal spawn-readiness helpers do not imply actual spawn support, public selectors, manifest-backed guardrail truth, or mutable lifecycle state

## Internal Spawn Candidate

Must test:

- spawn-candidate derivation from an existing read model plus selector without introducing a second selector contract
- successful composition of an existing internal runtime-context and internal spawn-readiness object
- `undefined` results for selector misses without creating partial candidate objects
- loud failures for invalid selectors inherited from the runtime-context/read-model contract
- unresolved-parent handling that remains neutral unless existing spawn-readiness blockers already apply
- deterministic preservation of the existing spawn-readiness blocking-reason ordering inside the composed candidate object
- explicit confirmation that internal spawn-candidate helpers do not widen public CLI payloads, manifest persistence, or lifecycle semantics

## Internal Spawn Target

Must test:

- spawn-target derivation from an existing internal spawn-candidate without introducing a second selector contract
- successful projection of a minimal `{ attemptId, runtime, sessionId }` target from a spawnable candidate
- `undefined` results when spawn blockers remain present or when the selected session identity is unknown
- equivalent target derivation through both existing `attemptId` and `sessionId` selection paths upstream of the candidate
- explicit confirmation that internal spawn-target helpers do not decide child lineage, child attempt identifiers, child branches, child worktrees, or other actual spawn semantics
- explicit confirmation that internal spawn-target helpers do not widen public CLI payloads, manifest persistence, or lifecycle semantics

## Internal Spawn Request

Must test:

- spawn-request derivation from an existing internal spawn-candidate without introducing a second selector contract
- successful projection of a minimal `{ parentAttemptId, parentRuntime, parentSessionId, sourceKind }` request from a spawnable candidate
- valid `fork` and `delegated` source choices supplied explicitly by the caller
- `undefined` results when spawn blockers remain present or when the selected session identity is unknown
- optional inherited guardrail carry-through when the parent record exposes guardrails
- omission of `inheritedGuardrails` when the parent record has none
- loud failures for invalid `sourceKind` inputs such as `direct`, `resume`, or blank strings
- helper immutability for the supplied spawn-candidate input
- explicit confirmation that spawn-request output does not seed child attempt lineage, child worktree or branch planning, child runtime mode, or prompt/task payloads
- explicit confirmation that internal spawn-request helpers do not decide child attempt identifiers, child branches, child worktrees, child runtime mode, child prompts, delegated-runtime approvals, or other actual spawn semantics
- explicit confirmation that internal spawn-request helpers do not widen public CLI payloads, manifest persistence, or lifecycle semantics

## Internal Spawn Lineage

Must test:

- spawn-lineage derivation from an existing internal spawn-request plus an explicit child attempt identifier without introducing a second parent-session selector contract
- successful projection of a minimal `{ attemptId, parentAttemptId, sourceKind }` lineage object from a valid spawn request
- normalized guardrail carry-through from inherited request guardrails into lineage `guardrails`
- omission of lineage `guardrails` when the source request has no inherited guardrails
- loud failures for blank child attempt identifiers
- loud failures when the explicit child attempt identifier matches the parent attempt identifier
- sourceKind carry-through from the supplied spawn-request without widening it into parent runtime/session truth or child-planning semantics
- helper immutability for the supplied spawn-request input
- explicit confirmation that internal spawn-lineage helpers do not preserve parent runtime or parent session fields and do not widen public CLI payloads, manifest persistence, or lifecycle semantics
- explicit confirmation that internal spawn-lineage helpers do not decide child branches, child worktrees, child runtime mode, prompt/task payloads, or delegated-runtime approvals

## Internal Wait Readiness

Must test:

- wait-readiness derivation from an existing internal runtime-context
- deterministic blocking-reason ordering when multiple wait blockers are present
- readiness success when the selected context is non-terminal, has a known session, and has no child attempts
- wait blockers for terminal lifecycle state, unknown session identity, and present child attempts
- behavior and blocker ordering remain unchanged after shared lifecycle-disposition extraction
- explicit confirmation that internal wait-readiness helpers do not imply actual wait support, close support, public selectors, or mutable lifecycle state

## Internal Wait Candidate

Must test:

- wait-candidate derivation from an existing read model plus selector without introducing a second selector contract
- successful composition of an existing internal runtime-context and internal wait-readiness object
- `undefined` results for selector misses without creating partial candidate objects
- loud failures for invalid selectors inherited from the runtime-context/read-model contract
- deterministic preservation of the existing wait-readiness blocking-reason ordering inside the composed candidate object
- explicit confirmation that internal wait-candidate helpers do not widen public CLI payloads, manifest persistence, or lifecycle semantics

## Internal Wait Target

Must test:

- wait-target derivation from an existing internal wait-candidate without introducing a second selector contract
- successful projection of a minimal `{ attemptId, runtime, sessionId }` target from a waitable candidate
- `undefined` results when wait blockers remain present or when the selected session identity is unknown
- equivalent target derivation through both existing `attemptId` and `sessionId` selection paths upstream of the candidate
- explicit confirmation that internal wait-target helpers do not widen public CLI payloads, manifest persistence, or lifecycle semantics

## Internal Wait Request

Must test:

- wait-request derivation from an existing internal wait-target without introducing a second selector contract
- target-based request shaping only, without reintroducing candidate-, selector-, or view-driven entry points
- successful projection of a minimal `{ attemptId, runtime, sessionId }` request from a valid wait target
- optional `timeoutMs` carry-through when the caller supplies a valid positive integer
- omission of `timeoutMs` when it is not provided explicitly
- loud failures for invalid `timeoutMs` inputs such as non-integer, non-finite, `0`, or negative values
- helper immutability for the supplied wait-target input
- explicit confirmation that internal wait-request helpers do not re-run readiness, do not reintroduce selectors or views, do not seed manifests, and do not widen public CLI payloads, manifest persistence, or lifecycle semantics
- explicit confirmation that internal wait-request helpers do not introduce polling, timeout scheduling, settle policy, child policy, close coupling, or lifecycle truth

## Internal Wait Consumer Preflight

Must test:

- wait-consumer-readiness derivation from an existing internal wait-request without introducing a second selector contract
- explicit capability-aware allow behavior when `resolveSessionLifecycleCapability` reports support
- default blocked behavior for shipped runtimes whose adapter descriptor still marks `sessionLifecycle` as unsupported
- blocked behavior for unknown runtimes when capability lookup fails or resolves to unsupported
- stable blocking-reason vocabulary limited to `session_lifecycle_unsupported`
- helper immutability for the supplied wait-request input
- wait-consumer composition that returns the original wait-request plus capability-aware readiness
- explicit confirmation that internal wait-consumer helpers do not reintroduce selectors, views, contexts, candidates, targets, readiness recomputation, polling, timeout scheduling, event subscription, adapter invocation, manifest seeds, or lifecycle truth

## Internal Wait Consume

Must test:

- wait-consume derivation from an existing internal wait-consumer plus an explicitly injected wait invoker without introducing a second selector contract
- blocked behavior when wait-consumer readiness reports `canConsumeWait: false`
- explicit confirmation that blocked wait-consume results do not invoke the injected wait invoker
- supported behavior when wait-consumer readiness reports `canConsumeWait: true`
- explicit confirmation that supported wait-consume results invoke the injected wait invoker exactly once
- explicit confirmation that the injected wait invoker receives exactly the original wait-request object
- explicit confirmation that injected wait-invoker failures surface directly rather than being wrapped into wait-consume output metadata
- helper immutability for the supplied wait-consumer input
- explicit confirmation that internal wait-consume helpers do not reintroduce selectors, views, contexts, candidates, targets, readiness recomputation, capability recomputation, lifecycle projection, manifest seeds, polling metadata, scheduling metadata, public CLI payloads, or lifecycle truth

## Internal Wait Consume Batch

Must test:

- wait-consume-batch derivation from an explicit ordered list of existing internal wait-consumers plus an explicitly injected wait invoker without introducing a second selector contract
- empty consumer lists returning a minimal `{ results: [] }` batch shape
- blocked entries remaining visible in order with `invoked: false`
- supported entries invoking the injected wait invoker in input order
- explicit confirmation that blocked entries do not prevent later supported entries from being consumed
- helper immutability for the supplied wait-consumer list and each supplied wait-consumer input
- explicit confirmation that supported-entry invoker failures stop the batch immediately and do not execute later supported entries
- explicit confirmation that internal wait-consume-batch helpers do not reintroduce selectors, views, contexts, candidates, targets, readiness recomputation, capability recomputation, lifecycle projection, manifest seeds, polling metadata, scheduling metadata, per-item error aggregation, summary metadata, public CLI payloads, or lifecycle truth

## Internal Close Readiness

Must test:

- close-readiness derivation from an existing internal runtime-context
- capability-aware close-readiness that may block when the selected runtime does not expose internal `sessionLifecycle` support
- deterministic blocking-reason ordering when multiple close blockers are present
- readiness success when the selected context is non-terminal, has a known session, and has no child attempts
- close blockers for unsupported session lifecycle capability, terminal lifecycle state, unknown session identity, and present child attempts
- readiness booleans such as `alreadyFinal`, `wouldAffectDescendants`, and `sessionLifecycleSupported`
- capability-aware semantics remain local to close-readiness after shared lifecycle-disposition extraction
- explicit confirmation that internal close-readiness helpers do not imply actual close support, public selectors, manifest persistence, or mutable lifecycle state

## Internal Close Candidate

Must test:

- close-candidate derivation from an existing read model plus selector without introducing a second selector contract
- successful composition of an existing internal runtime-context and internal close-readiness object
- `undefined` results for selector misses without creating partial candidate objects
- loud failures for invalid selectors inherited from the runtime-context/read-model contract
- deterministic preservation of the existing close-readiness blocking-reason ordering inside the composed candidate object
- explicit confirmation that internal close-candidate helpers do not widen public CLI payloads, manifest persistence, or actual close semantics

## Internal Close Target

Must test:

- close-target derivation from an existing internal close-candidate without introducing a second selector contract
- successful projection of a minimal `{ attemptId, runtime, sessionId }` target from a closable candidate
- `undefined` results when close blockers remain present or when the selected session identity is unknown
- equivalent target derivation through both existing `attemptId` and `sessionId` selection paths upstream of the candidate
- explicit confirmation that internal close-target helpers do not widen public CLI payloads, manifest persistence, or actual close semantics

## Internal Close Request

Must test:

- close-request derivation from an existing internal close-target without introducing a second selector contract
- target-based request shaping only, without reintroducing candidate-, selector-, view-, or readiness-driven entry points
- successful projection of a minimal `{ attemptId, runtime, sessionId }` request from a valid close target
- loud failures for blank identifier inputs such as empty or whitespace-only `attemptId`, `runtime`, or `sessionId`
- helper immutability for the supplied close-target input
- explicit confirmation that internal close-request helpers do not re-run readiness, do not reintroduce selectors or views, do not seed manifests, and do not widen public CLI payloads, manifest persistence, or lifecycle semantics
- explicit confirmation that internal close-request helpers do not introduce close-consumer preflight, actual close support, force or cascade semantics, settle policy, child policy, or lifecycle truth

## Internal Close Requested Event

Must test:

- close-requested-event derivation from an existing internal close-request without introducing a second selector contract
- request-based event projection only, without reintroducing target-, candidate-, selector-, or readiness-driven entry points
- successful projection of a minimal `{ attemptId, runtime, sessionId, lifecycleEventKind: "close_requested" }` event from a valid close request
- helper immutability for the supplied close-request input
- explicit confirmation that internal close-requested-event helpers do not re-run readiness, do not reintroduce selectors or views, do not seed manifests, and do not widen public CLI payloads, manifest persistence, or lifecycle semantics
- explicit confirmation that internal close-requested-event helpers do not introduce actual close support, close-consumer preflight, close success truth, or `close_recorded` semantics
- explicit confirmation that shared lifecycle-state derivation continues to treat `close_requested` as a recorded marker rather than an immediate `closed` state

## Internal Close Recorded Event

Must test:

- close-recorded-event derivation from an existing internal close-requested-event without introducing a second selector contract
- requested-event-based event projection only, without reintroducing request-, target-, candidate-, selector-, or readiness-driven entry points
- successful projection of a minimal `{ attemptId, runtime, sessionId, lifecycleEventKind: "close_recorded" }` event from a valid close-requested-event
- helper immutability for the supplied close-requested-event input
- explicit confirmation that internal close-recorded-event helpers do not re-run readiness, do not reintroduce selectors or views, do not seed manifests, and do not widen public CLI payloads, manifest persistence, or lifecycle semantics
- explicit confirmation that internal close-recorded-event helpers do not introduce actual close support, close-consumer preflight, adapter-driven close results, or public close success truth
- explicit confirmation that shared lifecycle-state derivation continues to treat `close_requested` as a marker and `close_recorded` as the close-side event that maps to `closed`

## Internal Close Consumer Preflight

Must test:

- close-consumer-readiness derivation from an existing internal close-request without introducing a second selector contract
- explicit capability-aware allow behavior when `resolveSessionLifecycleCapability` reports support
- default blocked behavior for shipped runtimes whose adapter descriptor still marks `sessionLifecycle` as unsupported
- blocked behavior for unknown runtimes when capability lookup fails or resolves to unsupported
- stable blocking-reason vocabulary limited to `session_lifecycle_unsupported`
- helper immutability for the supplied close-request input
- close-consumer composition that returns the original close-request plus capability-aware readiness
- explicit confirmation that internal close-consumer helpers do not reintroduce selectors, views, contexts, candidates, targets, requested-event or recorded-event inputs, readiness recomputation, adapter invocation, event subscription, manifest seeds, or lifecycle truth

## Internal Close Consume

Must test:

- close-consume derivation from an existing internal close-consumer plus an explicitly injected close invoker without introducing a second selector contract
- blocked behavior when close-consumer readiness reports `canConsumeClose: false`
- explicit confirmation that blocked close-consume results do not invoke the injected close invoker
- supported behavior when close-consumer readiness reports `canConsumeClose: true`
- explicit confirmation that supported close-consume results invoke the injected close invoker exactly once
- explicit confirmation that the injected close invoker receives exactly the original close-request object
- explicit confirmation that injected close-invoker failures surface directly rather than being wrapped into close-consume output metadata
- helper immutability for the supplied close-consumer input
- explicit confirmation that internal close-consume helpers do not reintroduce selectors, views, contexts, candidates, targets, readiness recomputation, capability recomputation, requested-event or recorded-event projection, manifest seeds, adapter results, polling metadata, or lifecycle truth

## Internal Close Consume Batch

Must test:

- close-consume-batch derivation from an explicit ordered list of existing internal close-consumers plus an explicitly injected close invoker without introducing a second selector contract
- empty consumer lists returning a minimal `{ results: [] }` batch shape
- blocked entries remaining visible in order with `invoked: false`
- supported entries invoking the injected close invoker in input order
- explicit confirmation that blocked entries do not prevent later supported entries from being consumed
- helper immutability for the supplied close-consumer list and each supplied close-consumer input
- explicit confirmation that supported-entry invoker failures stop the batch immediately and do not execute later supported entries
- explicit confirmation that internal close-consume-batch helpers do not reintroduce selectors, views, contexts, candidates, targets, readiness recomputation, capability recomputation, requested-event or recorded-event projection, manifest seeds, per-item error aggregation, summary metadata, or lifecycle truth

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
- executable probing contract tests for the bounded `codex-cli` helper
- internal `codex-cli` profile-aware execution tests that lock explicit profile passthrough, blank-profile rejection, prompt ordering, default-runner env-overlay stability, custom-runner env behavior, and non-leakage into public CLI or manifest contracts
- canonical parser tests driven by JSONL fixtures
- internal execution observation-summary derivation tests for the bounded `codex-cli` path
- internal session-tree/control-plane derivation and indexing tests
- execution-linkage tests where `codex-cli` consumes attempt lineage and emits internal session snapshots without widening public contracts
- internal runtime-state record and index tests layered on top of bounded execution results without widening public contracts
- internal runtime-state read-model tests layered on top of derived records without introducing a mutable registry or lifecycle manager
- internal runtime-context tests layered on top of the internal read model without introducing wait/close semantics or mutable state
- internal lifecycle-disposition tests layered on top of internal runtime-context without introducing adapter capability checks, public selectors, persistence, or lifecycle truth
- internal spawn-readiness tests layered on top of internal runtime-context and runtime-state views without introducing actual spawn support, public selectors, manifest-backed guardrail truth, or mutable lifecycle state
- internal spawn-candidate tests layered on top of the internal read model, runtime-context, and spawn-readiness helpers without introducing actual spawn support, public selectors, manifest-backed guardrail truth, or mutable lifecycle state
- internal spawn-target tests layered on top of internal spawn-candidate helpers without introducing actual spawn support, public selectors, manifest-backed guardrail truth, or mutable lifecycle state
- internal spawn-request tests layered on top of internal spawn-candidate helpers without introducing actual spawn support, public selectors, manifest-backed guardrail truth, child-planning semantics, or mutable lifecycle state
- internal spawn-lineage tests layered on top of internal spawn-request helpers without introducing actual spawn support, manifest-backed lifecycle truth, public selectors, or child-planning semantics
- lineage-aware spawn helper tests should continue to prove that ancestry/guardrail inputs affect only internal readiness, parent-session request shaping, and minimal child-lineage projection, never public spawn contracts or child-planning side effects
- internal wait-readiness tests layered on top of internal runtime-context without introducing actual wait support, close support, or public selectors
- internal wait-candidate tests layered on top of the internal read model, runtime-context, and wait-readiness helpers without introducing actual wait support, close support, public selectors, or mutable lifecycle state
- internal wait-target tests layered on top of internal wait-candidate helpers without introducing actual wait support, close support, public selectors, or mutable lifecycle state
- internal wait-request tests layered on top of internal wait-target helpers without introducing actual wait support, polling, timeout scheduling, public selectors, manifest-backed state, or mutable lifecycle state
- internal wait-consumer-preflight tests layered on top of internal wait-request helpers without introducing actual wait support, polling, timeout scheduling, event subscription, adapter invocation, public selectors, manifest-backed state, or mutable lifecycle state
- internal wait-consume tests layered on top of internal wait-consumer-preflight helpers without introducing actual wait support, polling loops, scheduling policy, public selectors, manifest-backed state, or mutable lifecycle state
- internal wait-consume-batch tests layered on top of internal wait-consume helpers without introducing actual wait support, polling loops, scheduling policy, summary contracts, public selectors, manifest-backed state, or mutable lifecycle state
- internal close-readiness, close-candidate, and close-target tests layered on top of existing runtime-context helpers without introducing actual close support, public selectors, manifest-backed lifecycle state, or mutable lifecycle state
- internal close-request tests layered on top of internal close-target helpers without introducing actual close support, close-consumer preflight, public selectors, manifest-backed state, or mutable lifecycle state
- internal close-requested-event tests layered on top of internal close-request helpers without introducing actual close support, close-consumer preflight, public selectors, manifest-backed state, or mutable lifecycle state
- internal close-recorded-event tests layered on top of internal close-requested-event helpers without introducing actual close support, close-consumer preflight, adapter-driven close results, public selectors, manifest-backed state, or mutable lifecycle state
- internal close-consumer-preflight tests layered on top of internal close-request helpers without introducing actual close support, adapter invocation, event subscription, public selectors, manifest-backed state, or mutable lifecycle state
- internal close-consume tests layered on top of internal close-consumer-preflight helpers without introducing actual close support, adapter lifecycle promises, public selectors, manifest-backed state, or mutable lifecycle state
- internal close-consume-batch tests layered on top of internal close-consume helpers without introducing actual close support, partial-failure aggregation contracts, public selectors, manifest-backed state, or mutable lifecycle state
- parser boundary tests for bracket-prefixed log noise and malformed bracket-prefixed JSON-looking lines
- env-gated `codex-cli` smoke scaffolding, when available, as a non-default compatibility probe

Session-lifecycle integration tests, public execution CLI tests, and broader multi-runtime smoke coverage belong to a later Phase 3 or Phase 4 window once execution contracts expand beyond the current limited `codex-cli` slice.
Parent-attempt graph validation, delegated-runtime lifecycle tests, and wait/close semantics also belong to that later phase rather than this thin provenance slice.
Manifest-backed execution observation persistence also belongs to that later phase rather than the current bounded internal execution slice.
Manifest-backed session-tree persistence and public spawn/wait/close/resume behavior also belong to that later phase rather than the current internal control-plane slice.
Manifest-backed runtime-state persistence and any mutable execution-session registry also belong to that later phase rather than the current derived internal runtime-state slice.
Public selectors, public query commands, and any wait/close-oriented runtime-state consumer also belong to that later phase rather than the current internal read-model slice.
Public runtime-context selectors, public wait/close-oriented context consumers, and any mutable runtime-context store also belong to that later phase rather than the current internal runtime-context slice.
Public spawn-candidate selectors, public spawn-candidate stores, and any contract that treats internal spawn-candidates as lifecycle truth also belong to that later phase rather than the current internal spawn-candidate slice.
Public spawn-target selectors, public spawn-target stores, and any contract that treats internal spawn-targets as lifecycle truth also belong to that later phase rather than the current internal spawn-target slice.
Public spawn-request selectors, public spawn-request stores, and any contract that treats internal spawn-request output as lifecycle truth also belong to that later phase rather than the current internal spawn-request slice.
Public spawn-lineage selectors, public spawn-lineage stores, and any contract that treats internal spawn-lineage output as lifecycle truth, manifest truth, or real child-attempt planning also belong to that later phase rather than the current internal spawn-lineage slice.
Actual wait commands, close commands, public wait-readiness selectors, and any mutable wait-readiness store also belong to that later phase rather than the current internal wait-readiness slice.
Public wait-candidate selectors, public wait-candidate stores, and any contract that treats internal wait-candidates as lifecycle truth also belong to that later phase rather than the current internal wait-candidate slice.
Public wait-target selectors, public wait-target stores, and any contract that treats internal wait-targets as lifecycle truth also belong to that later phase rather than the current internal wait-target slice.
Public wait-request selectors, public wait-request stores, actual wait consumers, and any contract that treats internal wait-request output as lifecycle truth also belong to that later phase rather than the current internal wait-request slice.
Public wait-consumer selectors, public wait-consumer stores, and any contract that treats internal wait-consumer output as lifecycle truth also belong to that later phase rather than the current internal wait-consumer-preflight slice.
Public wait-consume selectors, public wait-consume stores, public wait-consume-batch stores, public wait or wait-consume CLI surface, polling or timeout scheduling loops, and any contract that treats internal wait-consume or wait-consume-batch output as lifecycle truth also belong to that later phase rather than the current internal wait-consume slice.
Public close-oriented selectors, public close-oriented stores, any close-consumer preflight, any close-consume path, any close-consume-batch path, and any actual close command or contract that treats internal close-readiness, close-candidate, close-target, close-request, close-requested-event, close-recorded-event, close-consumer, close-consume, or close-consume-batch output as lifecycle truth also belong to that later phase rather than the current internal close-oriented helper slice.
Git archival and checkpoint discipline belongs to maintainer workflow guidance rather than the current public runtime-state, CLI, or manifest contract; tests in this phase should not treat commit-backed checkpoints as an implemented product surface now that the repository has a usable `HEAD`, even though maintainers should continue recording each completed thin slice or debugging milestone with non-destructive Git history once a usable baseline exists.

### Phase 4: Verification and Selection

- verification aggregation tests
- selection logic tests
- failure-mode tests

## Definition Of Done For Future Coding Tasks

A future implementation task should not be considered complete unless:

- relevant unit tests were added or updated
- relevant contract tests still pass
- docs were updated if the public surface changed
- no ignored local files leaked into tracked output
