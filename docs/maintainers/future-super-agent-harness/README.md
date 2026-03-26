# Future Super Agent Harness Planning

Maintainer planning only. This directory is for a future branch after the current roadmap. It does not modify the current public contract, roadmap status, or development-phase boundary by itself.

## Purpose

These documents prepare a future branch that evolves `agent-worktree` into a stronger super agent harness while preserving the current repository's core value:

- git-native orchestration
- worktree-native isolation
- verification-first selection
- explicit public/private boundaries

This directory is not a product promise for `main`.

## What This Directory Is

- future-branch planning
- post-current-roadmap architecture work
- maintainer-facing implementation guidance
- a staging area for decisions that may later become RFCs, ADRs, or new specs

## What This Directory Is Not

- not the current public contract
- not the current roadmap
- not the current compatibility truth
- not a replacement for `README.md`, `SPEC.md`, or `docs/specs/*`

## Planned Documents

- [Vision And Positioning](vision-and-positioning.md)
- [Architecture Overview](architecture-overview.md)
- [Execution And Control Plane](execution-and-control-plane.md)
- [Todo And Task Tracking](todo-and-task-tracking.md)
- [Delegated Attempt Minimal Durable Contract](delegated-attempt-minimal-durable-contract.md)
- [Failure And Cleanup Semantics](failure-and-cleanup-semantics.md)
- [Memory, State, And Persistence](memory-state-and-persistence.md)
- [Sandbox, Skills, And Extensibility](sandbox-skills-and-extensibility.md)
- [Migration From Current Agent-Worktree](migration-from-current-agent-worktree.md)
- [Reuse Map From DeerFlow And Current Codebase](reuse-map-from-deerflow-and-current-codebase.md)
- [Thin-Slice Development Plan](thin-slice-development-plan.md)
- [Review Risks And Open Questions](review-risks-and-open-questions.md)

## Guardrails

- Keep current `main` docs narrow and accurate.
- Treat DeerFlow as a future-branch reference, not a `main` roadmap rewrite.
- Keep Anthropic/Claude Code `agent teams` distinct from DeerFlow-style hierarchical delegation.
- Escalate any future public contract change into RFC/spec work instead of silently widening this directory into a contract layer.
