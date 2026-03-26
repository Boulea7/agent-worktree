# Sandbox, Skills, And Extensibility

Maintainer planning only. This document does not modify the current public contract, roadmap status, or development-phase boundary.

## Summary

The future branch should keep execution isolation, authorization policy, and human approval as separate concerns. It should also treat capability definition and activation as separate concerns.

## Execution Boundaries

### 1. Execution Backend

Possible backends:

- worktree-local execution
- isolated container execution
- remote runner execution

This layer answers: where does code run?

### 2. Authorization Policy

This layer answers: should this action be allowed?

It should evaluate context such as:

- attempt ID
- repo root
- worktree path
- branch
- base commit
- dirty state
- delegated-from attempt
- network intent

### 3. Human Approval

This layer answers: should the operator confirm before continuing?

It should be used for:

- ambiguous goals
- destructive actions
- risky escalations
- policy exceptions

## Trust-Boundary Assumptions

If the future branch adds installable assets or remote execution, it should define assumptions about:

- extension source trust
- version and provenance expectations
- secret or environment propagation
- remote artifact provenance
- tenant or runner isolation

## Skills And Extensions

### Definition vs Activation

The future branch should separate:

- extension definition metadata
- activation state

This mirrors one of DeerFlow's strongest structural lessons and fits the current `extensions` namespace in `agent-worktree`.

### Deferred Capability Expansion

The future branch should prefer:

- light descriptors first
- heavy schemas on demand

This allows a larger capability surface without overwhelming the prompt or public config contract.

### Installable Assets

If the future branch adds installable extension assets, it should inherit strict safety requirements:

- archive path traversal checks
- symlink checks
- duplicate-name handling
- size or expansion limits

## Chosen Boundary

- no current public MCP execution contract on `main`
- future branch may explore richer extension runtime behavior
- future branch should still treat control-plane metadata as separate from live extension execution
