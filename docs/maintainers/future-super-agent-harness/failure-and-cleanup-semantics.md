# Failure And Cleanup Semantics

Maintainer planning only. This document is a current planning hypothesis for a future branch. It does not modify the current public contract, roadmap status, or development-phase boundary.

## Summary

If the future branch introduces delegated execution or richer collaboration, it must define failure and cleanup semantics before those flows become implementation slices.

## Failure Cases To Define

The future branch should explicitly classify:

- timeout
- cancellation
- retryable failure
- permanent failure
- orphaned delegated child
- partial artifact production
- `verification` ended in `skipped`

## Cleanup Questions To Define

- When can a delegated child worktree be cleaned automatically?
- Which child records must remain durable after cleanup?
- How should parent attempts record child cleanup outcomes?
- What blocks cleanup if verification or promotion state is unresolved?

## Promotion And Handoff Consequences

These semantics should directly influence:

- promotion gating
- handoff gating
- audit summaries
- cleanup convergence

## Chosen Boundary

This is future-branch planning only. It does not widen the current `main` cleanup contract or current public lifecycle surface.
