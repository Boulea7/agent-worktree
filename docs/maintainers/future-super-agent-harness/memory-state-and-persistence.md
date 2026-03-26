# Memory, State, And Persistence

Maintainer planning only. This document does not modify the current public contract, roadmap status, or development-phase boundary.

## Summary

The future branch should explicitly separate audit truth, runtime state, workspace state, summary state, and long-term memory. DeerFlow is useful here because it demonstrates why collapsing them together causes confusion.

## Proposed Layers

### 1. Audit Truth

The source of durable truth for the future branch should remain:

- attempts
- manifests
- verification records
- promotion or handoff records

This layer must remain machine-readable and stable.

### 2. Runtime State

This is derived execution-oriented state, for example:

- execution session records
- delegation readiness
- team coordination readiness
- active runtime observations
- short-lived task or todo tracking state

This layer is useful for orchestration, but it is not the same thing as audit truth.

### 3. Workspace State

This covers:

- worktree contents
- uploads
- outputs
- delegated artifacts

Workspace state may outlive one execution turn, but it is not a substitute for the audit record.

### 4. Summary State

This covers:

- context compaction
- condensed execution summaries
- handoff summaries

Summary state improves runtime performance. It must not replace deterministic records.

Task or todo summaries, if introduced, belong here or in runtime state depending on whether they are treated as active coordination state or compressed handoff context. They should not be treated as long-term memory.

### 5. Long-Term Memory

If the future branch introduces long-term memory, it should be optional and subordinate:

- operator or project preferences
- recurring workflow hints
- non-authoritative convenience context

It should never become the durable truth of repository state.

## Chosen Defaults

- no public memory contract expansion on `main`
- future branch may add optional long-term memory later, but not as a first foundation slice
- summary and memory are helpers; manifest and verification remain the authoritative layer

## DeerFlow Influence Used Carefully

Useful lesson:

- keep conversation/session continuity separate from persistent memory

Lesson not to copy:

- do not move the future branch toward a thread-native workspace model
