# Execution And Control Plane

Maintainer planning only. This document does not modify the current public contract, roadmap status, or development-phase boundary.

## Summary

The future branch should add a stronger internal execution and control plane without collapsing everything into a public lifecycle API too early.

## Execution Model

### Current Mainline Constraint

`main` still keeps public execution narrow. That should remain true while this future branch is only a plan.

### Future Branch Direction

The future branch should support two execution shapes:

- direct attempt execution
- delegated attempt execution

Both should be represented as attempts with audit-friendly lineage, not as opaque in-memory child tasks.

Before delegated execution lands, the future branch should first define:

- a minimal delegated-attempt durable contract
- failure and cleanup semantics

## Hierarchical Delegation

### Intended Shape

- a parent attempt evaluates readiness to delegate
- the parent derives a child target and execution seed
- the child runs in its own worktree or isolated execution environment
- the child produces a bounded result surface:
  - summary
  - artifacts
  - diff or patch
  - verification results

This assumes the future branch has already defined what durable child state must survive execution and cleanup.

### Why This Is Not A Thread-Native Child-Task Model

A thread-native child-task path mixes:

- submission
- execution
- waiting
- result formatting

The future branch should separate those concerns internally, even if a higher-level control surface later wraps them for convenience.

## Peer Collaboration

### Intended Shape

- multiple sibling attempts or worktrees can exist without parent-child runtime control
- role-specialized peers can review, critique, verify, or synthesize
- handoff and promotion remain explicit

### Examples

- implementation attempt
- reviewer attempt
- verifier attempt
- synthesis attempt

## Control Objects

The future branch should likely derive internal control objects such as:

- delegated attempt target
- delegated execution request
- peer collaboration handoff target
- review-ready projection
- promotion-ready projection
- task or todo projections for multi-step coordination

These remain internal planning objects until later convergence justifies public promotion.

## Todo And Task Tracking

The future branch should add lightweight task tracking as a control-plane helper, especially for:

- delegated multi-step work
- blocked child attempts
- peer review or verifier handoffs
- promotion-readiness checklists

This should begin as an internal coordination primitive, not as a public todo application.
The current `main` branch already has a narrower internal coordination-task seed for delegated work, blocked children, verifier or review handoffs, and closeout readiness; that seed is not a public todo or execution-status contract.

## Failure And Cleanup Semantics

Delegated execution planning is incomplete without explicit handling for:

- timeout
- cancellation
- retry
- orphaned child attempts
- partial artifacts
- `verification` ended in `skipped`
- child cleanup after parent divergence

Those semantics should be planned before delegated execution slices start implementation.

## Chosen Boundary

- `hierarchical delegation` belongs to the future runtime/control-plane stack
- `peer collaboration` belongs to the future handoff/review/promotion stack
- both are built on top of `attempt/worktree/verification`
- neither should rewrite the current public CLI contract on `main`
