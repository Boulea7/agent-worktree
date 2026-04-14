# Vision And Positioning

Maintainer planning only. This document does not modify the current public contract, roadmap status, or development-phase boundary.

## Summary

The future branch should not become a clone of any thread-native orchestration shell, and it should not abandon the current repository's substrate. The target is a stronger coding-agent harness built on top of `agent-worktree`:

- keep `attempt + worktree + verification` as the substrate
- add a richer runtime and control plane above that substrate
- support both hierarchical delegation and peer collaboration
- remain compatible with multiple coding-agent tools instead of collapsing into one bundled product shell

## Relationship To The Current Mainline

The current mainline remains focused on:

- config and manifest fidelity
- machine-readable CLI behavior
- narrow compatibility diagnostics
- verification and selection work

The future branch starts after that current public story, not instead of it.

## Relationship To Local-Only Delegation References

One local-only delegation-oriented upstream reference is useful as a source of structural lessons:

- harness vs app split
- execution backend vs authorization policy vs human approval
- state layering
- definition vs activation split for extensions
- deferred capability loading

The future branch should not inherit that upstream's:

- thread-native substrate
- shared-workspace subagent model
- polling a thread-native child-task lifecycle as the main delegation contract
- product-shell-first architecture

## Relationship To Local-Only Peer-Collaboration References

A peer-collaboration team model is not the same thing as a hierarchical `lead agent + subagents` delegation model.

This future branch should treat them as separate topologies:

- `hierarchical delegation`
  - parent-child runtime coordination
  - bounded delegated execution
- `peer collaboration`
  - sibling attempts/worktrees
  - review, handoff, promotion, and cross-check loops

## Current Planning Hypothesis

If this future branch is pursued, it would aim to be:

- narrower and more auditable than a generic assistant platform
- more collaboration-capable than the current `agent-worktree` mainline
- more substrate-first than thread-native orchestration shells
- more verification-driven than chat-centric agent shells

## Defaults Chosen For This Planning Set

- The current planning hypothesis preserves the current repository's substrate instead of replacing it with a thread-centric model.
- The current planning hypothesis plans for both delegation and teams, while the public `main` branch continues using neutral terms until a later convergence step is justified.
