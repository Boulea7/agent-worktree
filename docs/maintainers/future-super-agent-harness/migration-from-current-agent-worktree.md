# Migration From Current Agent-Worktree

Maintainer planning only. This document does not modify the current public contract, roadmap status, or development-phase boundary.

## Summary

The future branch should evolve from the current repository instead of replacing it. That means preserving the current substrate and layering richer orchestration above it.

## What Must Be Preserved

- `attempt` as the durable unit of work
- worktree-native isolation
- verification-first selection
- narrow public/private boundary discipline
- compatibility-first vocabulary

## What Can Be Added In The Future Branch

- richer internal runtime state
- delegated attempt execution
- peer collaboration flows
- deferred capability loading
- installable extension asset support
- stronger control-plane projections

## What Must Not Happen

- replacing attempt/worktree truth with thread/session truth
- widening the current `main` public CLI surface by accident
- importing DeerFlow's chat-product assumptions into the substrate
- promoting internal control objects into public contracts too early

## Migration Strategy

### Step 1

Assume `main` continues on its existing verification/selection-oriented path; this planning set does not change that.

### Step 2

Use the future branch to prototype:

- hierarchical delegation over isolated attempts
- peer collaboration over sibling attempts/worktrees

### Step 3

Only after those experiments converge should shared abstractions be considered for RFC/spec promotion.

## Default Decision

This is a branch-first migration, not a stealth refactor of `main`.
