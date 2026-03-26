# Thin-Slice Development Plan

Maintainer planning only. This document does not modify the current public contract, roadmap status, or development-phase boundary.

## Summary

The future branch should be implemented in thin slices that preserve the current repository's audit and testing discipline.

## Proposed Slice Order

### Slice 1: Branch Foundation

- establish the future branch docs and terminology
- keep the substrate aligned with current `attempt/worktree/verification`
- define internal naming for delegation and peer collaboration

### Slice 2: Capability Metadata Layer

- add internal extension metadata modeling
- keep activation state separate
- prototype deferred capability lookup without changing current public config

### Slice 3: Delegated Attempt Durable Contract

- define the minimal durable delegated-attempt state
- define lineage and result projections that survive cleanup
- keep this internal to the future branch until later convergence

### Slice 4: Failure And Cleanup Semantics

- define timeout, cancel, retry, orphan, and partial-artifact semantics
- define how delegated execution interacts with cleanup and promotion gates
- define how skipped verification is treated

### Slice 5: Delegation Readiness Layer

- formalize internal delegated-attempt readiness inputs
- derive child execution targets from attempt/worktree truth
- keep outputs internal-only

### Slice 6: Todo And Task Tracking Layer

- add internal task-tracking objects for multi-step coordination
- support ownership by parent, child, or peer attempts
- keep task tracking separate from audit truth and long-term memory

### Slice 7: Delegated Attempt Execution

- run child work in isolated attempts/worktrees
- produce bounded child result surfaces
- keep public lifecycle verbs deferred

### Slice 8: Peer Collaboration Layer

- add sibling review and handoff projections
- support critique, verification, and promotion-oriented coordination
- keep this distinct from parent-child runtime control

### Slice 9: Shared Control Surface Projections

- unify only the genuinely shared control primitives
- keep topology-specific primitives separate
- consider embedded or web control surfaces only after internal semantics stabilize

### Slice 10: Candidate Public Promotion

- identify any shared abstractions mature enough for RFC/spec work
- keep anything still unstable inside the future branch only

## Testing Rule

Every slice should include:

- unit tests for derivation logic
- contract tests for machine-readable internal structures when relevant
- explicit proof that no ignored local research files leaked into tracked docs

## Chosen Boundary

This sequence is future-branch-only. It is not the current mainline phase guide.
