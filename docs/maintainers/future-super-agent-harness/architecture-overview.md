# Architecture Overview

Maintainer planning only. This document does not modify the current public contract, roadmap status, or development-phase boundary.

## Summary

The future branch should use a layered architecture that keeps the current substrate stable while allowing richer orchestration above it.

## Proposed Layers

### 1. Attempt Substrate

This remains the foundation.

Responsibilities:

- attempt identity
- worktree lifecycle
- runtime manifest
- verification results
- durable audit records

This layer stays closer to the current repository than to DeerFlow.

### 2. Runtime Layer

Responsibilities:

- bounded headless execution
- runtime-specific adapters
- tool or agent invocation boundaries
- execution observation
- derived runtime-state records

This layer may later support delegated attempts, but it should remain subordinate to the attempt substrate.

### 3. Control Plane

Responsibilities:

- delegation readiness
- team coordination readiness
- handoff and promotion shaping
- runtime-state selection for internal consumers
- policy-aware execution gating

This layer derives control objects. It should not become a public lifecycle contract until explicitly promoted.

### Shared Control Primitives vs Topology-Specific Primitives

The future branch should keep these separate.

Shared control primitives may include:

- readiness objects
- result projections
- review-ready projections
- promotion-ready projections
- task or todo projections

Topology-specific primitives should remain distinct:

- hierarchical delegation primitives
- peer collaboration primitives

The future branch should not flatten both topologies into one generic `multi-agent` control object model too early.

### 4. Capability Plane

Responsibilities:

- extension metadata
- extension activation state
- deferred capability discovery
- tool or adapter descriptors
- installable extension asset validation

This layer should allow large capability surfaces without forcing all schemas into the prompt or public config at once.

### 5. Collaboration Plane

This splits into two modes.

#### Hierarchical Delegation

- parent attempt delegates bounded child execution
- child runs in an isolated attempt/worktree
- parent receives summary, artifact, diff, or verification-ready output

#### Peer Collaboration

- sibling attempts/worktrees coordinate through handoff and promotion flows
- review, critique, and synthesis are first-class
- no child-session semantics are required
- shared task references can help peers coordinate work without forcing child-session control

### 6. Control Surfaces

Future control surfaces may include:

- CLI
- embedded library
- web UI
- external automation entrypoints

These should consume the control plane. They must not redefine the substrate.

## Explicit Non-Goals For This Planning Layer

- no current public `spawn / wait / close`
- no current public team protocol
- no current public memory contract expansion
- no assumption that the future branch must ship a full DeerFlow-style product shell
