# Review Risks And Open Questions

Maintainer planning only. This document does not modify the current public contract, roadmap status, or development-phase boundary.

## Key Risks

### 1. Mainline Contamination

Risk:

- future-branch language leaks into `README.md`, `SPEC.md`, `docs/specs/*`, or `docs/compat/*`

Mitigation:

- keep all future harness detail inside this directory or local research
- require RFC/spec follow-up for any later public promotion

### 2. Topology Confusion

Risk:

- hierarchical delegation and peer collaboration get flattened into one vague `multi-agent` story

Mitigation:

- keep separate documents and vocabulary for the two topologies

### 3. Substrate Drift

Risk:

- future planning slowly shifts the repository from worktree-native to thread-native assumptions

Mitigation:

- restate attempt/worktree/verification substrate in every major planning document

### 4. Over-Promising Capability Runtime

Risk:

- extension, MCP, or external-agent plans get written as if already public and stable

Mitigation:

- keep capability-runtime plans explicitly internal or branch-only until later convergence

### 5. Under-Specified Delegated Failure Semantics

Risk:

- delegated execution lands before timeout, cancel, retry, orphan, and cleanup semantics are stable

Mitigation:

- define delegated durable contract and failure/cleanup semantics before delegated execution slices begin

### 6. Under-Specified Trust Boundaries

Risk:

- installable assets or remote runners arrive before source trust, provenance, and secret propagation assumptions are explicit

Mitigation:

- keep trust-boundary assumptions explicit in the future branch planning set

### 7. Missing-Evidence Promotion

Risk:

- verification, comparison, or selection semantics allow sparse or missing check evidence to sort too favorably

Mitigation:

- keep missing evidence as an explicit blocker class
- do not let coarse verification state substitute for comparable verification payload

### 8. Mixed-Task Downstream Aggregation

Risk:

- downstream handoff or finalization paths accidentally re-accept mixed-task batches after upstream selection has already established single-task boundaries

Mitigation:

- preserve task isolation through promotion, handoff, finalization, and closeout projections
- reject or explicitly partition mixed-task downstream batches

### 9. Parent-First Delegated Side Effects

Risk:

- delegated spawn or headless execution records parent-side effects before child-side validation is complete, producing orphaned or half-shaped state

Mitigation:

- validate child lineage and execution seed contracts before irreversible parent-side apply steps
- keep delegated failure semantics and cleanup semantics explicit before richer spawn flows

### 10. Memory Flattening And Dream Overreach

Risk:

- session memory, durable memory, team memory, and dream-like background consolidation get flattened into one vague memory subsystem

Mitigation:

- keep those layers explicitly separate in planning docs and future branch contracts
- avoid introducing dream-like background consolidation before runtime, workspace, and durable-memory boundaries are stable

## Open Questions

- What is the smallest durable delegated-attempt state that future branch execution needs?
- How should peer collaboration and hierarchical delegation share control-plane primitives without becoming the same topology?
- What is the smallest useful internal todo or task-tracking model that helps coordination without pretending to be audit truth?
- Does long-term memory belong in the first future-branch implementation wave, or only after runtime and workspace state layering is stable?
- Does the future branch need any dream-like background consolidation in the first wave, or should that wait until session memory, durable memory, and team memory boundaries are proven?
- What is the smallest identity canonicalization rule set for `attemptId`, `sessionId`, and child lineage so selector space and index space cannot drift apart?
- What is the smallest coverage-truth model needed so descendant completeness is not just an ad hoc headless wrapper flag?
- What is the smallest safe installable extension asset format worth supporting?
- Which future control surfaces are actually needed first: richer CLI, embedded API, or a maintainer-facing UI?

## Review Checklist

- No DeerFlow mechanism is described as the current mainline roadmap.
- No current public contract is widened implicitly.
- `hierarchical delegation` and `peer collaboration` remain distinct.
- The future branch still preserves git-native, worktree-native, and verification-first foundations.
