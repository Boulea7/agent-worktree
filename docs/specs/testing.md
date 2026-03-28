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
- machine-readable CLI payloads do not leak internal spawn-requested or spawn-recorded marker metadata
- machine-readable CLI payloads do not leak internal `spawnConsume` or `spawnConsumeBatch` metadata
- machine-readable CLI payloads do not leak internal `spawnHeadlessWaitCandidate` or `spawnHeadlessWaitCandidateBatch` metadata
- machine-readable CLI payloads do not leak internal wait-consume or wait-consume-batch metadata
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

## Internal Spawn Requested Event

Must test:

- spawn-requested-event derivation from an existing internal spawn-request without introducing a second selector contract
- successful projection of a minimal `{ attemptId, runtime, sessionId, lifecycleEventKind: "spawn_requested" }` marker from the existing parent-session fields on spawn-request
- helper immutability for the supplied spawn-request input
- explicit confirmation that internal spawn-requested-event helpers do not reintroduce request, selector, view, context, readiness, child-lineage, child branch/worktree planning, manifest, or outcome data
- explicit confirmation that internal spawn-requested-event helpers do not imply child creation, child lineage truth, terminal lifecycle truth, or actual spawn support

## Internal Spawn Recorded Event

Must test:

- spawn-recorded-event derivation from an existing internal spawn-requested-event without introducing a second selector contract
- successful projection of a minimal `{ attemptId, runtime, sessionId, lifecycleEventKind: "spawn_recorded" }` marker from an existing parent-session spawn-requested-event
- helper immutability for the supplied spawn-requested-event input
- explicit confirmation that internal spawn-recorded-event helpers do not reintroduce requestedEvent, request, selector, view, context, readiness, child-lineage, child branch/worktree planning, manifest, or outcome data
- explicit confirmation that internal spawn-recorded-event helpers do not imply child creation, child lineage truth, terminal lifecycle truth, or actual spawn support

## Internal Spawn Effects

Must test:

- spawn-effects derivation from an existing internal spawn-request plus an explicit child attempt identifier without introducing a second selector contract
- successful composition of minimal `lineage`, `requestedEvent`, and `recordedEvent` outputs by reusing the existing single-purpose helpers only
- explicit confirmation that `childAttemptId` affects only `lineage` and does not alter the parent-session markers
- helper immutability for the supplied spawn-request input
- explicit confirmation that internal spawn-effects helpers do not reintroduce request, selector, view, context, readiness, consume, apply, manifest, or branch/worktree planning data
- explicit confirmation that internal spawn-effects helpers do not imply child creation, child lineage truth beyond the explicit projection, terminal lifecycle truth, real runtime side effects, or actual spawn support
- loud-failure propagation for invalid `childAttemptId`, matching parent/child attempt identifiers, or invalid spawn `sourceKind` without wrapper error shapes

## Internal Spawn Effects Batch

Must test:

- spawn-effects-batch derivation from an explicit ordered list of existing spawn-effects inputs without introducing a second selector contract
- preservation of input order while sequentially composing the single-request spawn-effects helper
- empty-input behavior that returns `{ results: [] }`
- fail-fast behavior on the first derivation error without partial-result aggregation or summary-policy output
- helper immutability for the supplied spawn-effects input list
- explicit confirmation that internal spawn-effects-batch helpers do not reintroduce request, selector, view, context, readiness, consume, apply, manifest, or branch/worktree planning data
- explicit confirmation that internal spawn-effects-batch helpers do not imply child creation, child lineage truth, terminal lifecycle truth, real runtime side effects, or actual spawn support

## Internal Spawn Consume

Must test:

- spawn-consume consumption from an existing internal spawn-request without introducing a second selector contract
- invocation of the injected spawn invoker exactly once with the existing spawn-request
- helper immutability for the supplied spawn-request input
- injected invoker failures surface directly without synthetic success truth, lifecycle markers, or summary data
- explicit confirmation that internal spawn-consume helpers do not reintroduce selector, view, context, readiness, child-lineage, child branch/worktree planning, manifest, or outcome truth
- explicit confirmation that internal spawn-consume helpers do not imply child creation, child lineage truth, terminal lifecycle truth, branch/worktree creation, prompt planning, adapter-driven spawn success, or a public session-lifecycle API

## Internal Spawn Consume Batch

Must test:

- spawn-consume-batch consumption from an explicit ordered list of existing internal spawn-request values without introducing a second selector contract
- preservation of input order while sequentially composing the single-request spawn-consume helper
- empty-input behavior that does not invoke the injected spawn invoker
- fail-fast behavior on the first injected invoker error without partial-failure aggregation or summary-policy output
- helper immutability for the supplied spawn-request list input
- explicit confirmation that internal spawn-consume-batch helpers do not reintroduce selector, view, context, readiness, child-lineage, child branch/worktree planning, manifest, or outcome truth
- explicit confirmation that internal spawn-consume-batch helpers do not imply child creation, child lineage truth, terminal lifecycle truth, branch/worktree creation, prompt planning, adapter-driven spawn success, or a public session-lifecycle API

## Internal Spawn Apply

Must test:

- spawn-apply composition from an existing internal spawn-request plus an explicit child attempt identifier without introducing a second selector contract
- successful composition of existing spawn-consume metadata plus existing spawn-effects metadata only
- explicit confirmation that the helper consumes first and derives effects only after the consume step succeeds
- helper immutability for the supplied spawn-request input
- injected invoker failures surface directly without synthetic success truth, lifecycle markers, or partial `effects`
- loud-failure propagation for invalid `childAttemptId` after the consume step succeeds, without wrapper error shapes
- explicit confirmation that internal spawn-apply helpers do not reintroduce selector, view, context, readiness, manifest, branch/worktree planning, or outcome truth
- explicit confirmation that internal spawn-apply helpers do not imply child creation, child lineage truth, terminal lifecycle truth, real spawn success, or a public session-lifecycle API

## Internal Spawn Apply Batch

Must test:

- spawn-apply-batch composition from an explicit ordered list of existing spawn-effects inputs without introducing a second selector contract
- preservation of input order while sequentially composing the single-request spawn-apply helper
- empty-input behavior that returns `{ results: [] }` without invoking the injected spawn invoker
- fail-fast behavior on the first invoker or effects-derivation error without partial-result aggregation or summary-policy output
- helper immutability for the supplied spawn-apply input list
- explicit confirmation that internal spawn-apply-batch helpers do not reintroduce selector, view, context, readiness, manifest, branch/worktree planning, or outcome truth
- explicit confirmation that internal spawn-apply-batch helpers do not imply child creation, child lineage truth, terminal lifecycle truth, real spawn success, or a public session-lifecycle API

## Internal Spawn Headless Input

Must test:

- spawn-headless-input derivation from existing internal spawn-effects metadata plus a minimal headless-execution seed without introducing a second selector contract
- successful projection of `attempt` from `effects.lineage` only while whitelisting explicit execution fields such as `prompt`, `cwd`, `timeoutMs`, and `abortSignal`
- explicit confirmation that dynamic or unexpected execution fields such as `attempt`, `effects`, `requestedEvent`, or `recordedEvent` are not preserved in the shaped output
- helper immutability for the supplied spawn-effects metadata and execution seed inputs
- explicit confirmation that internal spawn-headless-input helpers do not reintroduce selector, view, context, readiness, manifest, branch/worktree planning, runtime launch, or outcome truth
- explicit confirmation that internal spawn-headless-input helpers do not imply child creation, child runtime execution, terminal lifecycle truth, real spawn success, or a public session-lifecycle API

## Internal Spawn Headless Input Batch

Must test:

- spawn-headless-input-batch derivation from an explicit ordered list of existing spawn-effects metadata plus execution seeds without introducing a second selector contract
- preservation of input order while sequentially composing the single-request spawn-headless-input helper
- empty-input behavior that returns `{ results: [] }`
- helper immutability for the supplied spawn-headless-input item list
- explicit confirmation that internal spawn-headless-input-batch helpers do not reintroduce selector, view, context, readiness, manifest, branch/worktree planning, runtime launch, or outcome truth
- explicit confirmation that internal spawn-headless-input-batch helpers do not imply child creation, child runtime execution, terminal lifecycle truth, real spawn success, or summary-policy contracts

## Internal Spawn Headless Apply

Must test:

- spawn-headless-apply composition from existing internal spawn-apply metadata plus a minimal headless-execution seed without introducing a second selector contract
- successful projection of `attempt` from `apply.effects.lineage` only while whitelisting explicit execution fields such as `prompt`, `cwd`, `timeoutMs`, and `abortSignal`
- explicit confirmation that dynamic or unexpected execution fields such as `attempt`, `apply`, `effects`, `requestedEvent`, or `recordedEvent` are not preserved in the shaped execution payload
- helper immutability for the supplied spawn-apply metadata and execution seed inputs
- explicit confirmation that internal spawn-headless-apply helpers do not reintroduce selector, view, context, readiness, manifest, branch/worktree planning, runtime launch, or outcome truth
- explicit confirmation that internal spawn-headless-apply helpers remain internal-only, non-public, non-manifest-backed, not lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Apply Batch

Must test:

- spawn-headless-apply-batch composition from an explicit ordered list of existing spawn-apply inputs without introducing a second selector contract
- preservation of input order while sequentially composing the single-request spawn-headless-apply helper
- empty-input behavior that returns `{ results: [] }`
- helper immutability for the supplied spawn-headless-apply item list
- explicit confirmation that internal spawn-headless-apply-batch helpers do not reintroduce selector, view, context, readiness, manifest, branch/worktree planning, runtime launch, or outcome truth
- explicit confirmation that internal spawn-headless-apply-batch helpers remain internal-only, non-public, non-manifest-backed, not lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Execute

Must test:

- spawn-headless-execute consumption from an existing internal spawn-headless-apply result without introducing a second selector contract
- invocation of the injected bounded headless executor exactly once with the already-shaped internal execution payload
- helper immutability for the supplied spawn-headless-apply input
- injected executor failures surface directly without synthetic lifecycle truth, delegated-runtime truth, or summary-policy output
- explicit confirmation that internal spawn-headless-execute helpers do not reintroduce selector, view, context, readiness, manifest, branch/worktree planning, or public outcome truth
- explicit confirmation that internal spawn-headless-execute helpers remain internal-only, non-public, non-manifest-backed, not lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Execute Batch

Must test:

- spawn-headless-execute-batch composition from an explicit ordered list of existing spawn-headless-apply items without introducing a second selector contract
- preservation of input order while sequentially composing the single-request spawn-headless-execute helper
- empty-input behavior that returns `{ results: [] }`
- helper immutability for the supplied spawn-headless-execute item list
- injected executor failures surface directly without summary-policy output or delegated-runtime truth
- explicit confirmation that internal spawn-headless-execute-batch helpers remain internal-only, non-public, non-manifest-backed, not lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Record

Must test:

- spawn-headless-record derivation from an existing internal spawn-headless-execute result without introducing a second selector contract
- composition of the existing spawn-headless-execute result plus the generic `deriveExecutionSessionRecord(...)` helper only
- helper immutability for the supplied spawn-headless-execute input
- missing-attempt behavior that throws a `ValidationError` rather than returning synthetic record metadata
- underlying execution-session derivation failures surface directly without wrapper errors or summary-policy output
- explicit confirmation that internal spawn-headless-record helpers do not reintroduce selector, view, context, readiness, index, manifest, branch/worktree planning, or public outcome truth
- explicit confirmation that internal spawn-headless-record helpers remain internal-only, non-public, non-manifest-backed, not lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Record Batch

Must test:

- spawn-headless-record-batch composition from an explicit ordered list of existing spawn-headless-execute items without introducing a second selector contract
- preservation of input order while sequentially composing the single-request spawn-headless-record helper
- empty-input behavior that returns `{ results: [] }`
- helper immutability for the supplied spawn-headless-record item list
- fail-fast behavior on the first record-derivation error without partial-result aggregation or summary-policy output
- explicit confirmation that internal spawn-headless-record-batch helpers do not reintroduce selector, view, context, readiness, index, manifest, branch/worktree planning, or public outcome truth
- explicit confirmation that internal spawn-headless-record-batch helpers remain internal-only, non-public, non-manifest-backed, not lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Context

Must test:

- spawn-headless-context derivation from an existing internal spawn-headless-view result plus an internal attempt-based selector derived from the existing headless record without introducing a public selector contract
- composition of the existing spawn-headless-view result plus the generic `deriveExecutionSessionContext(...)` helper only
- helper immutability for the supplied spawn-headless-view input
- underlying selector-validation or context-derivation failures surface directly without wrapper errors or summary-policy output
- explicit confirmation that internal spawn-headless-context helpers do not reintroduce selector surfaces beyond the generic helper, view rebuilding, readiness, manifest, branch/worktree planning, or public outcome truth
- explicit confirmation that internal spawn-headless-context helpers remain internal-only, non-public, non-manifest-backed, not child-creation truth, not runtime truth, not terminal lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Context Batch

Must test:

- spawn-headless-context-batch derivation from an existing internal spawn-headless-view-batch result plus internally derived ordered attempt-based selectors without introducing a public selector contract
- composition of the existing batch headless-view output plus the generic `deriveExecutionSessionContext(...)` helper only
- reuse of the existing shared `headlessViewBatch.view` across the whole batch
- empty-input behavior that returns the existing batch object plus an empty ordered context result list
- preservation of input ordering semantics across the batch
- helper immutability for the supplied spawn-headless-view-batch input
- fail-fast behavior on the first selector-validation or context-derivation error without per-item summary output
- explicit confirmation that internal spawn-headless-context-batch helpers do not reintroduce selector surfaces beyond the generic helper, view rebuilding, readiness, manifest, branch/worktree planning, or public outcome truth
- explicit confirmation that internal spawn-headless-context-batch helpers remain internal-only, non-public, non-manifest-backed, not child-creation truth, not runtime truth, not terminal lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Wait Candidate

Must test:

- spawn-headless-wait-candidate derivation from an existing internal spawn-headless-context result without introducing a public selector contract
- composition of the existing spawn-headless-context result plus the generic `deriveExecutionSessionWaitReadiness(...)` helper only
- helper immutability for the supplied spawn-headless-context input
- underlying wait-readiness derivation failures surface directly without wrapper errors or summary-policy output
- explicit confirmation that internal spawn-headless-wait-candidate helpers do not call the generic selector-driven `deriveExecutionSessionWaitCandidate(...)` helper and do not reintroduce selectors, views, context derivation, `wait-target`, `wait-request`, `wait-consumer`, `wait-consume`, manifest, branch/worktree planning, or public outcome truth
- explicit confirmation that internal spawn-headless-wait-candidate helpers remain internal-only, non-public, non-manifest-backed, not child-creation truth, not runtime truth, not terminal lifecycle truth, not polling truth, not timeout scheduling truth, and not actual wait support

## Internal Spawn Headless Wait Candidate Batch

Must test:

- spawn-headless-wait-candidate-batch derivation from an existing internal spawn-headless-context-batch result without introducing a public selector contract
- composition of the existing batch headless-context output by reusing the single-request spawn-headless-wait-candidate helper only
- empty-input behavior that returns the existing batch object plus an empty ordered wait-candidate result list
- preservation of input ordering semantics across the batch
- helper immutability for the supplied spawn-headless-context-batch input
- fail-fast behavior on the first wait-readiness derivation error without per-item summary output
- explicit confirmation that internal spawn-headless-wait-candidate-batch helpers do not call the generic selector-driven `deriveExecutionSessionWaitCandidate(...)` helper and do not reintroduce selectors, views, context derivation, `wait-target`, `wait-request`, `wait-consumer`, `wait-consume`, manifest, branch/worktree planning, or public outcome truth
- explicit confirmation that internal spawn-headless-wait-candidate-batch helpers remain internal-only, non-public, non-manifest-backed, not child-creation truth, not runtime truth, not terminal lifecycle truth, not polling truth, not timeout scheduling truth, and not actual wait support

## Internal Spawn Headless Wait Target

Must test:

- spawn-headless-wait-target derivation from an existing internal spawn-headless-wait-candidate result without introducing a second selector contract
- composition of the existing `headlessWaitCandidate.candidate` plus the generic `deriveExecutionSessionWaitTarget(...)` helper only
- helper immutability for the supplied spawn-headless-wait-candidate input
- blocked wait-candidate results remain wrapped and omit `target` output rather than being filtered or widened into wait-request semantics
- explicit confirmation that internal spawn-headless-wait-target helpers do not reintroduce selector surfaces, view rebuilding, context rebuilding, wait-request/event/consumer/consume expansion, manifest persistence, or public outcome truth
- explicit confirmation that internal spawn-headless-wait-target helpers remain internal-only, non-public, non-manifest-backed, not actual wait support, not child-creation truth, not runtime truth, not terminal lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Wait Target Batch

Must test:

- spawn-headless-wait-target-batch derivation from an existing internal spawn-headless-wait-candidate-batch result without introducing a second selector contract
- sequential composition of the existing ordered headless wait-candidate results plus the single-request `spawn-headless-wait-target` helper only
- empty-input behavior that returns the existing batch object plus an empty ordered wait-target result list
- preservation of input ordering semantics across the batch
- helper immutability for the supplied spawn-headless-wait-candidate-batch input
- blocked items remain in-place and omit `target` output rather than being filtered, aggregated, or widened into wait-request semantics
- fail-fast behavior on the first wait-target derivation error without partial-result aggregation or summary-policy output
- explicit confirmation that internal spawn-headless-wait-target-batch helpers do not reintroduce selector surfaces, view rebuilding, context rebuilding, wait-request/event/consumer/consume expansion, manifest persistence, or public outcome truth
- explicit confirmation that internal spawn-headless-wait-target-batch helpers remain internal-only, non-public, non-manifest-backed, not actual wait support, not child-creation truth, not runtime truth, not terminal lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Close Candidate

Must test:

- spawn-headless-close-candidate derivation from an existing internal spawn-headless-context result without introducing a second selector contract
- composition of the existing `headlessContext.context` plus the generic `deriveExecutionSessionCloseReadiness(...)` helper only
- default close-readiness behavior remains intact when no explicit `resolveSessionLifecycleCapability` is supplied
- explicit passthrough of `resolveSessionLifecycleCapability` when the caller provides one
- helper immutability for the supplied spawn-headless-context input
- explicit confirmation that internal spawn-headless-close-candidate helpers do not reintroduce selector surfaces, view rebuilding, context rebuilding, close-target/request/event/consumer/consume expansion, manifest persistence, or public outcome truth
- explicit confirmation that internal spawn-headless-close-candidate helpers remain internal-only, non-public, non-manifest-backed, not actual close support, not child-creation truth, not runtime truth, not terminal lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Close Candidate Batch

Must test:

- spawn-headless-close-candidate-batch derivation from an existing internal spawn-headless-context-batch result without introducing a second selector contract
- sequential composition of the existing ordered headless-context results plus the single-request `spawn-headless-close-candidate` helper only
- shared `resolveSessionLifecycleCapability` passthrough across every batch item when the caller provides one
- empty-input behavior that returns the existing batch object plus an empty ordered close-candidate result list
- preservation of input ordering semantics across the batch
- helper immutability for the supplied spawn-headless-context-batch input
- fail-fast behavior on the first readiness-derivation error without partial-result aggregation or summary-policy output
- explicit confirmation that internal spawn-headless-close-candidate-batch helpers do not reintroduce selector surfaces, view rebuilding, context rebuilding, close-target/request/event/consumer/consume expansion, manifest persistence, or public outcome truth
- explicit confirmation that internal spawn-headless-close-candidate-batch helpers remain internal-only, non-public, non-manifest-backed, not actual close support, not child-creation truth, not runtime truth, not terminal lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Close Target

Must test:

- spawn-headless-close-target derivation from an existing internal spawn-headless-close-candidate result without introducing a second selector contract
- composition of the existing `headlessCloseCandidate.candidate` plus the generic `deriveExecutionSessionCloseTarget(...)` helper only
- helper immutability for the supplied spawn-headless-close-candidate input
- blocked close-candidate results remain wrapped and omit `target` output rather than being filtered or widened into close-request semantics
- explicit confirmation that internal spawn-headless-close-target helpers do not reintroduce selector surfaces, view rebuilding, context rebuilding, close-request/event/consumer/consume expansion, manifest persistence, or public outcome truth
- explicit confirmation that internal spawn-headless-close-target helpers remain internal-only, non-public, non-manifest-backed, not actual close support, not child-creation truth, not runtime truth, not terminal lifecycle truth, and not delegated runtime support

## Internal Spawn Headless Close Target Batch

Must test:

- spawn-headless-close-target-batch derivation from an existing internal spawn-headless-close-candidate-batch result without introducing a second selector contract
- sequential composition of the existing ordered headless close-candidate results plus the single-request `spawn-headless-close-target` helper only
- empty-input behavior that returns the existing batch object plus an empty ordered close-target result list
- preservation of input ordering semantics across the batch
- helper immutability for the supplied spawn-headless-close-candidate-batch input
- blocked items remain in-place and omit `target` output rather than being filtered, aggregated, or widened into close-request semantics
- fail-fast behavior on the first close-target derivation error without partial-result aggregation or summary-policy output
- explicit confirmation that internal spawn-headless-close-target-batch helpers do not reintroduce selector surfaces, view rebuilding, context rebuilding, close-request/event/consumer/consume expansion, manifest persistence, or public outcome truth
- explicit confirmation that internal spawn-headless-close-target-batch helpers remain internal-only, non-public, non-manifest-backed, not actual close support, not child-creation truth, not runtime truth, not terminal lifecycle truth, and not delegated runtime support

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
- internal spawn-requested-event tests layered on top of internal spawn-request helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, or terminal lifecycle truth
- internal spawn-recorded-event tests layered on top of internal spawn-requested-event helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, or terminal lifecycle truth
- internal spawn-effects tests layered on top of internal spawn-lineage and spawn-event helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, or real runtime side effects
- internal spawn-effects-batch tests layered on top of internal spawn-effects helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, real runtime side effects, or summary-policy contracts
- internal spawn-consume tests layered on top of internal spawn-request helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, branch/worktree creation, prompt planning, or adapter-driven spawn success truth
- internal spawn-consume-batch tests layered on top of internal spawn-consume helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, branch/worktree creation, prompt planning, adapter-driven spawn success truth, or summary-policy contracts
- internal spawn-apply tests layered on top of internal spawn-consume and spawn-effects helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, or adapter-driven spawn success truth
- internal spawn-apply-batch tests layered on top of internal spawn-apply helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, adapter-driven spawn success truth, or summary-policy contracts
- internal spawn-headless-input tests layered on top of internal spawn-effects helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime launch, or adapter-driven spawn success truth
- internal spawn-headless-input-batch tests layered on top of internal spawn-headless-input helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime launch, adapter-driven spawn success truth, or summary-policy contracts
- internal spawn-headless-apply tests layered on top of internal spawn-apply helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, or adapter-driven spawn success truth
- internal spawn-headless-apply-batch tests layered on top of internal spawn-headless-apply helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, adapter-driven spawn success truth, or summary-policy contracts
- internal spawn-headless-execute tests layered on top of internal spawn-headless-apply helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, adapter-driven delegated-runtime truth, or summary-policy contracts
- internal spawn-headless-execute-batch tests layered on top of internal spawn-headless-execute helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, adapter-driven delegated-runtime truth, or summary-policy contracts
- internal spawn-headless-record tests layered on top of internal spawn-headless-execute helpers plus generic execution-session record derivation without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, adapter-driven delegated-runtime truth, or summary-policy contracts
- internal spawn-headless-record-batch tests layered on top of internal spawn-headless-record helpers without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, adapter-driven delegated-runtime truth, or summary-policy contracts
- internal spawn-headless-context tests layered on top of internal spawn-headless-view helpers plus generic execution-session context derivation without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, adapter-driven delegated-runtime truth, or summary-policy contracts
- internal spawn-headless-context-batch tests layered on top of internal spawn-headless-view-batch helpers plus shared execution-session view reuse and generic execution-session context derivation without introducing actual spawn support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, adapter-driven delegated-runtime truth, or summary-policy contracts
- internal spawn-headless-wait-candidate tests layered on top of internal spawn-headless-context helpers plus generic wait-readiness derivation without introducing actual wait support, polling truth, timeout scheduling truth, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, or summary-policy contracts
- internal spawn-headless-wait-candidate-batch tests layered on top of internal spawn-headless-context-batch helpers by reusing the single-request wait bridge without introducing actual wait support, polling truth, timeout scheduling truth, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, or summary-policy contracts
- internal spawn-headless-wait-target tests layered on top of internal spawn-headless-wait-candidate helpers plus generic wait-target derivation without introducing actual wait support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, or adapter-driven wait success truth
- internal spawn-headless-wait-target-batch tests layered on top of internal spawn-headless-wait-candidate-batch helpers plus single-item wait-target reuse without introducing actual wait support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, adapter-driven wait success truth, or summary-policy contracts
- internal spawn-headless-close-candidate tests layered on top of internal spawn-headless-context helpers plus generic close-readiness derivation without introducing actual close support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, or adapter-driven close success truth
- internal spawn-headless-close-candidate-batch tests layered on top of internal spawn-headless-context-batch helpers plus single-item close-bridge reuse without introducing actual close support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, adapter-driven close success truth, or summary-policy contracts
- internal spawn-headless-close-target tests layered on top of internal spawn-headless-close-candidate helpers plus generic close-target derivation without introducing actual close support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, or adapter-driven close success truth
- internal spawn-headless-close-target-batch tests layered on top of internal spawn-headless-close-candidate-batch helpers plus single-item close-target reuse without introducing actual close support, child-creation truth, public selectors, manifest-backed state, terminal lifecycle truth, runtime truth, adapter-driven close success truth, or summary-policy contracts
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

Session-lifecycle integration tests, public execution CLI tests, and broader multi-runtime smoke coverage belong to a later post-P4 execution-expansion phase once execution contracts expand beyond the current limited `codex-cli` slice.
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
Public spawn-requested-event selectors, public spawn-requested-event stores, public spawn-recorded-event selectors, public spawn-recorded-event stores, and any contract that treats internal spawn-requested-event or spawn-recorded-event output as child-creation truth, lifecycle truth, manifest truth, or public spawn status also belong to that later phase rather than the current internal spawn-event slice.
Public spawn-effects selectors, public spawn-effects stores, and any contract that treats internal spawn-effects output as child-creation truth, lifecycle truth, manifest truth, real runtime side effects, or public spawn status also belong to that later phase rather than the current internal spawn-effects slice.
Public spawn-consume selectors, public spawn-consume stores, public spawn-consume-batch selectors, public spawn-consume-batch stores, and any contract that treats internal spawn-consume or spawn-consume-batch output as child-creation truth, child-lineage truth, lifecycle truth, branch/worktree truth, adapter-driven spawn success truth, or a public session-lifecycle API also belong to that later phase rather than the current internal spawn-consume slice.
Public spawn-apply selectors, public spawn-apply stores, public spawn-apply-batch selectors, public spawn-apply-batch stores, public spawn-effects/apply CLI surface, and any contract that treats internal spawn-apply or spawn-apply-batch output as child-creation truth, child-lineage truth, lifecycle truth, real spawn success truth, or a public session-lifecycle API also belong to that later phase rather than the current internal spawn-apply slice.
Public spawn-headless-input selectors, public spawn-headless-input stores, public spawn-headless-input-batch selectors, public spawn-headless-input-batch stores, public spawn-headless-input CLI surface, and any contract that treats internal spawn-headless-input or spawn-headless-input-batch output as child-creation truth, child-runtime-execution truth, lifecycle truth, manifest truth, or a public session-lifecycle API also belong to that later phase rather than the current internal spawn-headless-input slice.
Public spawn-headless-apply selectors, public spawn-headless-apply stores, public spawn-headless-apply-batch selectors, public spawn-headless-apply-batch stores, public spawn-headless-execute selectors, public spawn-headless-execute stores, public spawn-headless-execute-batch selectors, public spawn-headless-execute-batch stores, public spawn-headless-record selectors, public spawn-headless-record stores, public spawn-headless-record-batch selectors, public spawn-headless-record-batch stores, public spawn-headless-view selectors, public spawn-headless-view stores, public spawn-headless-view-batch selectors, public spawn-headless-view-batch stores, public spawn-headless-context selectors, public spawn-headless-context stores, public spawn-headless-context-batch selectors, public spawn-headless-context-batch stores, public spawn-headless-wait-candidate selectors, public spawn-headless-wait-candidate stores, public spawn-headless-wait-candidate-batch selectors, public spawn-headless-wait-candidate-batch stores, public spawn-headless-wait-target selectors, public spawn-headless-wait-target stores, public spawn-headless-wait-target-batch selectors, public spawn-headless-wait-target-batch stores, public spawn-headless-close-candidate selectors, public spawn-headless-close-candidate stores, public spawn-headless-close-candidate-batch selectors, public spawn-headless-close-candidate-batch stores, public spawn-headless-close-target selectors, public spawn-headless-close-target stores, public spawn-headless-close-target-batch selectors, public spawn-headless-close-target-batch stores, public spawn-headless-execute, spawn-headless-record, spawn-headless-view, spawn-headless-context, spawn-headless-wait-candidate, spawn-headless-wait-target, spawn-headless-close-candidate, or spawn-headless-close-target CLI surface, and any contract that treats internal spawn-headless-apply, spawn-headless-apply-batch, spawn-headless-execute, spawn-headless-execute-batch, spawn-headless-record, spawn-headless-record-batch, spawn-headless-view, spawn-headless-view-batch, spawn-headless-context, spawn-headless-context-batch, spawn-headless-wait-candidate, spawn-headless-wait-candidate-batch, spawn-headless-wait-target, spawn-headless-wait-target-batch, spawn-headless-close-candidate, spawn-headless-close-candidate-batch, spawn-headless-close-target, or spawn-headless-close-target-batch output as child-creation truth, child-runtime-execution truth, lifecycle truth, manifest truth, delegated-runtime truth, runtime truth, actual wait support, polling truth, timeout scheduling truth, close truth, or a public session-lifecycle API also belong to that later phase rather than the current internal spawn-headless-apply plus spawn-headless-execute plus spawn-headless-record plus spawn-headless-view plus spawn-headless-context plus spawn-headless-wait-candidate plus spawn-headless-wait-target plus spawn-headless-close-candidate plus spawn-headless-close-target slice.
Actual wait commands, close commands, public wait-readiness selectors, and any mutable wait-readiness store also belong to that later phase rather than the current internal wait-readiness slice.
Public wait-candidate selectors, public wait-candidate stores, and any contract that treats internal wait-candidates as lifecycle truth also belong to that later phase rather than the current internal wait-candidate slice.
Public wait-target selectors, public wait-target stores, and any contract that treats internal wait-targets as lifecycle truth also belong to that later phase rather than the current internal wait-target slice.
Public wait-request selectors, public wait-request stores, actual wait consumers, and any contract that treats internal wait-request output as lifecycle truth also belong to that later phase rather than the current internal wait-request slice.
Public wait-consumer selectors, public wait-consumer stores, and any contract that treats internal wait-consumer output as lifecycle truth also belong to that later phase rather than the current internal wait-consumer-preflight slice.
Public wait-consume selectors, public wait-consume stores, public wait-consume-batch stores, public wait or wait-consume CLI surface, polling or timeout scheduling loops, and any contract that treats internal wait-consume or wait-consume-batch output as lifecycle truth also belong to that later phase rather than the current internal wait-consume slice.
Public close-oriented selectors, public close-oriented stores, any close-consumer preflight, any close-consume path, any close-consume-batch path, and any actual close command or contract that treats internal close-readiness, close-candidate, close-target, close-request, close-requested-event, close-recorded-event, close-consumer, close-consume, or close-consume-batch output as lifecycle truth also belong to that later phase rather than the current internal close-oriented helper slice.
Git archival and checkpoint discipline belongs to maintainer workflow guidance rather than the current public runtime-state, CLI, or manifest contract; tests in this phase should not treat commit-backed checkpoints as an implemented product surface now that the repository has a usable `HEAD`, even though maintainers should continue recording each completed thin slice or debugging milestone with non-destructive Git history once a usable baseline exists.

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
- internal-only selection logic tests
- internal-only promotion, handoff, and handoff-finalization composition tests
- internal-only handoff-finalization outcome-summary tests for invoked-vs-blocked aggregation and minimal shape preservation
- internal-only barrel-boundary assertions for `src/selection/internal.ts` plus negative-export assertions for `src/selection/index.ts` and other intentionally narrow default barrels
- failure-mode tests for request validation, readiness validation, and fail-fast batch composition across the Phase 5 helper chain

## Definition Of Done For Future Coding Tasks

A future implementation task should not be considered complete unless:

- relevant unit tests were added or updated
- relevant contract tests still pass
- docs were updated if the public surface changed
- no ignored local files leaked into tracked output
